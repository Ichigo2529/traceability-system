import Elysia, { t } from "elysia";
import { eq, and } from "drizzle-orm";
import { db } from "../db/connection";
import { users, roles, userRoles, refreshTokens } from "../db/schema/auth";
import { configAuditLogs } from "../db/schema/audit";
import { verifyPassword } from "../lib/password";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt";
import { randomUUID } from "crypto";
import { hash } from "bcryptjs";

// ─── Helper: get user with roles ────────────────────────

async function getUserWithRoles(userId: string) {
  const userRoleRows = await db
    .select({
      roleName: roles.name,
    })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId));

  return userRoleRows.map((r) => r.roleName);
}

// ─── Helper: audit log ─────────────────────────────────

async function auditLogin(
  userId: string | null,
  action: string,
  detail: Record<string, unknown>
) {
  await db.insert(configAuditLogs).values({
    userId: userId,
    entityType: "AUTH",
    entityId: userId ?? "00000000-0000-0000-0000-000000000000",
    action,
    beforeData: null,
    afterData: detail,
  });
}

// ─── Auth Routes ────────────────────────────────────────

export const authRoutes = new Elysia({ prefix: "/auth" })

  // ── POST /auth/login ────────────────────────────────
  .post(
    "/login",
    async ({ body, set }) => {
      const { username, password } = body;

      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        await auditLogin(null, "LOGIN_FAILED", {
          username,
          reason: "USER_NOT_FOUND",
        });
        set.status = 401;
        return {
          success: false,
          error_code: "UNAUTHORIZED",
          message: "Invalid username or password",
        };
      }

      if (!user.isActive) {
        await auditLogin(user.id, "LOGIN_FAILED", {
          username,
          reason: "USER_INACTIVE",
        });
        set.status = 401;
        return {
          success: false,
          error_code: "UNAUTHORIZED",
          message: "Account is inactive",
        };
      }

      // Verify password
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        await auditLogin(user.id, "LOGIN_FAILED", {
          username,
          reason: "WRONG_PASSWORD",
        });
        set.status = 401;
        return {
          success: false,
          error_code: "UNAUTHORIZED",
          message: "Invalid username or password",
        };
      }

      // Get roles
      const roleNames = await getUserWithRoles(user.id);

      // Create refresh token record
      const tokenId = randomUUID();
      const refreshTokenExpiry = new Date(
        Date.now() + 16 * 60 * 60 * 1000 // 16 hours
      );

      const refreshTokenStr = await signRefreshToken({
        userId: user.id,
        tokenId,
      });

      // Hash refresh token for storage (only store hash)
      const tokenHash = await hash(refreshTokenStr, 6);

      await db.insert(refreshTokens).values({
        id: tokenId,
        userId: user.id,
        tokenHash,
        expiresAt: refreshTokenExpiry,
        revoked: false,
      });

      // Sign access token
      const accessToken = await signAccessToken({
        userId: user.id,
        username: user.username,
        roles: roleNames,
      });

      await auditLogin(user.id, "LOGIN_SUCCESS", { username });

      return {
        success: true,
        data: {
          access_token: accessToken,
          refresh_token: refreshTokenStr,
          user: {
            id: user.id,
            username: user.username,
            display_name: user.displayName,
            roles: roleNames,
            department: user.department,
            employee_code: user.employeeCode,
          },
        },
      };
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
      }),
    }
  )

  // ── POST /auth/refresh ──────────────────────────────
  // Bible §08: Refresh rotation — invalidate old token on use
  .post(
    "/refresh",
    async ({ body, set }) => {
      const { refresh_token } = body;

      let payload;
      try {
        payload = await verifyRefreshToken(refresh_token);
      } catch {
        set.status = 401;
        return {
          success: false,
          error_code: "UNAUTHORIZED",
          message: "Invalid or expired refresh token",
        };
      }

      // Look up refresh token record
      const [tokenRecord] = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.id, payload.tokenId))
        .limit(1);

      if (!tokenRecord || tokenRecord.revoked) {
        set.status = 401;
        return {
          success: false,
          error_code: "UNAUTHORIZED",
          message: "Refresh token has been revoked",
        };
      }

      // Revoke old token (rotation)
      await db
        .update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.id, payload.tokenId));

      // Get user + roles
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user || !user.isActive) {
        set.status = 401;
        return {
          success: false,
          error_code: "UNAUTHORIZED",
          message: "User no longer active",
        };
      }

      const roleNames = await getUserWithRoles(user.id);

      // Issue new tokens
      const newTokenId = randomUUID();
      const newRefreshExpiry = new Date(
        Date.now() + 16 * 60 * 60 * 1000
      );

      const newRefreshStr = await signRefreshToken({
        userId: user.id,
        tokenId: newTokenId,
      });

      const newTokenHash = await hash(newRefreshStr, 6);

      await db.insert(refreshTokens).values({
        id: newTokenId,
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt: newRefreshExpiry,
        revoked: false,
      });

      const newAccessToken = await signAccessToken({
        userId: user.id,
        username: user.username,
        roles: roleNames,
      });

      return {
        success: true,
        data: {
          access_token: newAccessToken,
          refresh_token: newRefreshStr,
        },
      };
    },
    {
      body: t.Object({
        refresh_token: t.String(),
      }),
    }
  )

  // ── POST /auth/logout ───────────────────────────────
  .post(
    "/logout",
    async ({ body }) => {
      const { refresh_token } = body;

      try {
        const payload = await verifyRefreshToken(refresh_token);

        // Revoke the token
        await db
          .update(refreshTokens)
          .set({ revoked: true })
          .where(eq(refreshTokens.id, payload.tokenId));
      } catch {
        // Even if token is invalid, return success (idempotent logout)
      }

      return { success: true };
    },
    {
      body: t.Object({
        refresh_token: t.String(),
      }),
    }
  );
