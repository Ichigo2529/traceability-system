import Elysia from "elysia";
import { verifyAccessToken, type AccessTokenPayload } from "../lib/jwt";
import { fail } from "../lib/http";

// ─── Auth derive plugin ─────────────────────────────────
// Reads the Bearer token and adds `user` to context.
// Does NOT block — just makes `user` available (nullable).

export const authDerive = new Elysia({ name: "authDerive" }).derive(
  { as: "scoped" },
  async ({ request }) => {
    const header = request.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) {
      return { user: null as AccessTokenPayload | null };
    }

    const token = header.slice(7);
    try {
      const payload = await verifyAccessToken(token);
      return { user: payload as AccessTokenPayload | null };
    } catch {
      return { user: null as AccessTokenPayload | null };
    }
  }
);

// ─── Guard helpers (for use in onBeforeHandle) ──────────

export function checkAuth({ user, set }: { user: AccessTokenPayload | null; set: any }) {
  if (!user) {
    set.status = 401;
    return fail("UNAUTHORIZED", "Authentication required");
  }
}

export function checkRole(allowedRoles: string[]) {
  return ({ user, set }: { user: AccessTokenPayload | null; set: any }) => {
    if (!user) {
      set.status = 401;
      return fail("UNAUTHORIZED", "Authentication required");
    }
    const hasRole = allowedRoles.some((r) => user.roles.includes(r));
    if (!hasRole) {
      set.status = 403;
      return fail("FORBIDDEN", `Requires one of: ${allowedRoles.join(", ")}`);
    }
  };
}
