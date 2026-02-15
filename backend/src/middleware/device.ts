import Elysia from "elysia";
import { eq, and, isNull } from "drizzle-orm";
import { verifyDeviceToken, type DeviceTokenPayload } from "../lib/jwt";
import { db } from "../db/connection";
import { devices, deviceOperatorSessions } from "../db/schema/devices";
import { fail } from "../lib/http";

// ─── deviceDerive ───────────────────────────────────────
// Reads Device-Token header and resolves device + active operator session.
// Makes `device` and `operatorSession` available on context.

export interface DeviceContext {
  deviceId: string;
  machineId: string | null;
}

export interface OperatorSessionContext {
  sessionId: string;
  userId: string;
}

export const deviceDerive = new Elysia({ name: "deviceDerive" }).derive(
  { as: "scoped" },
  async ({ request }) => {
    const token = request.headers.get("device-token");
    if (!token) {
      return {
        device: null as DeviceContext | null,
        operatorSession: null as OperatorSessionContext | null,
      };
    }

    try {
      const payload = await verifyDeviceToken(token);

      // Look up device
      const [dev] = await db
        .select({
          id: devices.id,
          machineId: devices.machineId,
          isActive: devices.isActive,
          deviceStatus: devices.deviceStatus,
        })
        .from(devices)
        .where(eq(devices.id, payload.deviceId))
        .limit(1);

      if (!dev || !dev.isActive || dev.deviceStatus === "disabled") {
        return {
          device: null as DeviceContext | null,
          operatorSession: null as OperatorSessionContext | null,
        };
      }

      // Look up active operator session (endedAt IS NULL)
      const [session] = await db
        .select({
          id: deviceOperatorSessions.id,
          userId: deviceOperatorSessions.userId,
        })
        .from(deviceOperatorSessions)
        .where(
          and(
            eq(deviceOperatorSessions.deviceId, dev.id),
            isNull(deviceOperatorSessions.endedAt)
          )
        )
        .limit(1);

      return {
        device: { deviceId: dev.id, machineId: dev.machineId } as DeviceContext | null,
        operatorSession: session
          ? ({ sessionId: session.id, userId: session.userId } as OperatorSessionContext | null)
          : (null as OperatorSessionContext | null),
      };
    } catch {
      return {
        device: null as DeviceContext | null,
        operatorSession: null as OperatorSessionContext | null,
      };
    }
  }
);

// ─── Guard: device must be registered ───────────────────

export function checkDevice({ device, set }: { device: DeviceContext | null; set: any }) {
  if (!device) {
    set.status = 401;
    return fail("DEVICE_NOT_REGISTERED", "Valid Device-Token header required");
  }
}

// ─── Guard: device must be assigned to a machine ────────

export function checkDeviceAssigned({ device, set }: { device: DeviceContext | null; set: any }) {
  if (!device) {
    set.status = 401;
    return fail("DEVICE_NOT_REGISTERED", "Valid Device-Token header required");
  }
  if (!device.machineId) {
    set.status = 403;
    return fail("DEVICE_NOT_ASSIGNED", "Device must be assigned to a machine by an admin");
  }
}

// ─── Guard: operator must be logged in ──────────────────

export function checkOperatorSession({
  device,
  operatorSession,
  set,
}: {
  device: DeviceContext | null;
  operatorSession: OperatorSessionContext | null;
  set: any;
}) {
  // Check device first
  const deviceErr = checkDeviceAssigned({ device, set });
  if (deviceErr) return deviceErr;

  if (!operatorSession) {
    set.status = 403;
    return fail("NO_OPERATOR_SESSION", "An operator must be logged in on this device");
  }
}
