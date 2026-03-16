import Elysia, { t } from "elysia";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "../db/connection";
import { ok, fail } from "../lib/http";
import { devices, machines, deviceOperatorSessions } from "../db/schema/devices";
import { users } from "../db/schema/auth";
import { stations, processes } from "../db/schema/organization";
import { signDeviceToken } from "../lib/jwt";
import { verifyPassword } from "../lib/password";
import { computeShiftDay } from "../lib/shift-day";
import { deviceDerive, checkDevice, checkDeviceAssigned } from "../middleware/device";

// ─── Device Routes ──────────────────────────────────────

export const deviceRoutes = new Elysia({ prefix: "/device" })

  .post(
    "/activate",
    async ({ body, set }) => {
      const [device] = await db.select().from(devices).where(eq(devices.deviceCode, body.device_code)).limit(1);

      if (!device) {
        set.status = 404;
        return fail("DEVICE_NOT_FOUND", "Device code not found");
      }

      if (device.deviceStatus === "disabled" || !device.isActive) {
        set.status = 403;
        return fail("DEVICE_DISABLED", "Device is disabled");
      }

      if (!device.activationPin || device.activationPin !== body.activation_pin) {
        set.status = 401;
        return fail("INVALID_ACTIVATION_PIN", "Activation PIN is invalid");
      }

      await db
        .update(devices)
        .set({
          hostname: body.hostname ?? device.hostname,
          fingerprint: body.fingerprint ?? device.fingerprint,
          updatedAt: new Date(),
        })
        .where(eq(devices.id, device.id));

      const deviceToken = await signDeviceToken({ deviceId: device.id });
      return ok({
        device_id: device.id,
        device_code: device.deviceCode,
        secret_key: device.secretKey,
        station_locked: true,
        device_token: deviceToken,
      });
    },
    {
      body: t.Object({
        device_code: t.String(),
        activation_pin: t.String(),
        hostname: t.Optional(t.String()),
        fingerprint: t.Optional(t.String()),
      }),
    }
  )

  // ── POST /device/register ─────────────────────────
  // Registers a new device or returns existing device + token
  .post(
    "/register",
    async ({ body, set }) => {
      const { fingerprint, hostname } = body;

      // Check if device already exists
      const [existing] = await db.select().from(devices).where(eq(devices.fingerprint, fingerprint)).limit(1);

      if (existing) {
        if (existing.deviceStatus === "disabled" || !existing.isActive) {
          set.status = 403;
          return fail("DEVICE_DISABLED", "Device is disabled");
        }
        // Re-issue token for existing device
        const deviceToken = await signDeviceToken({
          deviceId: existing.id,
        });

        return ok({
          device_id: existing.id,
          device_token: deviceToken,
          is_new: false,
        });
      }

      // Create new device
      const [newDevice] = await db
        .insert(devices)
        .values({
          fingerprint,
          hostname: hostname ?? null,
          deviceStatus: "active",
          isActive: true,
        })
        .returning({ id: devices.id });

      const deviceToken = await signDeviceToken({
        deviceId: newDevice.id,
      });

      return ok({
        device_id: newDevice.id,
        device_token: deviceToken,
        is_new: true,
      });
    },
    {
      body: t.Object({
        fingerprint: t.String(),
        hostname: t.Optional(t.String()),
      }),
    }
  )

  // ── POST /device/heartbeat ────────────────────────
  // Requires Device-Token header
  .use(deviceDerive)
  .post("/heartbeat", async ({ device, operatorSession, set }: any) => {
    // checkDevice guard
    const err = checkDevice({ device, set });
    if (err) return err;

    // Update last_seen
    await db
      .update(devices)
      .set({ lastSeen: new Date(), lastHeartbeatAt: new Date() })
      .where(eq(devices.id, device!.deviceId));

    // Get assigned machine info
    let machineInfo = null;
    if (device!.machineId) {
      const [m] = await db
        .select({
          id: machines.id,
          name: machines.name,
          station_type: machines.machineType,
          line_code: machines.lineCode,
        })
        .from(machines)
        .where(eq(machines.id, device!.machineId))
        .limit(1);
      machineInfo = m ?? null;
    }

    const [deviceRow] = await db
      .select({
        stationId: devices.stationId,
        processId: devices.processId,
        status: devices.deviceStatus,
      })
      .from(devices)
      .where(eq(devices.id, device!.deviceId))
      .limit(1);

    let stationInfo: { id: string; name: string | null } | null = null;
    let processInfo: { id: string; name: string } | null = null;
    if (deviceRow?.stationId) {
      const [s] = await db
        .select({ id: stations.id, name: stations.name })
        .from(stations)
        .where(eq(stations.id, deviceRow.stationId))
        .limit(1);
      stationInfo = s ?? null;
    }
    if (deviceRow?.processId) {
      const [p] = await db
        .select({ id: processes.id, name: processes.name })
        .from(processes)
        .where(eq(processes.id, deviceRow.processId))
        .limit(1);
      processInfo = p ?? null;
    }

    return ok({
      device_id: device!.deviceId,
      status: deviceRow?.status ?? "active",
      machine: machineInfo,
      station: stationInfo,
      process: processInfo,
      operator_session: operatorSession
        ? { session_id: operatorSession.sessionId, user_id: operatorSession.userId }
        : null,
      shift_day: computeShiftDay(),
      server_time: new Date().toISOString(),
    });
  })

  // ── POST /device/operator/login ───────────────────
  .post(
    "/operator/login",
    async ({ body, device, set }: any) => {
      // Device must be registered and assigned
      const devErr = checkDeviceAssigned({ device, set });
      if (devErr) return devErr;

      const { username, password } = body;

      // Find user
      const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

      if (!user || !user.isActive) {
        set.status = 401;
        return fail("UNAUTHORIZED", "Invalid operator credentials");
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        set.status = 401;
        return fail("UNAUTHORIZED", "Invalid operator credentials");
      }

      // End any existing session on this device
      await db
        .update(deviceOperatorSessions)
        .set({ endedAt: new Date() })
        .where(and(eq(deviceOperatorSessions.deviceId, device!.deviceId), isNull(deviceOperatorSessions.endedAt)));

      // Create new session
      const [session] = await db
        .insert(deviceOperatorSessions)
        .values({
          deviceId: device!.deviceId,
          userId: user.id,
        })
        .returning({ id: deviceOperatorSessions.id });

      return ok({
        session_id: session.id,
        user: {
          id: user.id,
          username: user.username,
          display_name: user.displayName,
        },
      });
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
      }),
    }
  )

  // ── POST /device/operator/logout ──────────────────
  .post("/operator/logout", async ({ device, operatorSession, set }: any) => {
    const devErr = checkDevice({ device, set });
    if (devErr) return devErr;

    if (operatorSession) {
      await db
        .update(deviceOperatorSessions)
        .set({ endedAt: new Date() })
        .where(eq(deviceOperatorSessions.id, operatorSession.sessionId));
    }

    return ok(null);
  })

  // ── GET /device/operator/me ───────────────────────
  .get("/operator/me", async ({ device, operatorSession, set }: any) => {
    const devErr = checkDevice({ device, set });
    if (devErr) return devErr;

    if (!operatorSession) {
      return {
        success: true,
        data: null,
        message: "No active operator session",
      };
    }

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        employeeCode: users.employeeCode,
      })
      .from(users)
      .where(eq(users.id, operatorSession.userId))
      .limit(1);

    return {
      success: true,
      data: user
        ? {
            session_id: operatorSession.sessionId,
            user,
          }
        : null,
    };
  });
