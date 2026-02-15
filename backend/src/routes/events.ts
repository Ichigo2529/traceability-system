import Elysia, { t } from "elysia";
import { db } from "../db/connection";
import { events, units, unitLinks } from "../db/schema/production";
import { machines, devices } from "../db/schema/devices";
import { computeShiftDay } from "../lib/shift-day";
import { validateTransition } from "../lib/state-machine";
import { EVENT_HANDLERS, DomainError, type HandlerResult } from "../lib/event-handlers";
import {
  verifyAccessToken,
  verifyDeviceToken,
  type AccessTokenPayload,
  type DeviceTokenPayload,
} from "../lib/jwt";
import { eq, and, isNull } from "drizzle-orm";
import { deviceOperatorSessions } from "../db/schema/devices";
import { createHmac, timingSafeEqual } from "crypto";
import { modelRevisions, variants } from "../db/schema/config";
import { allocateSerial } from "../lib/serial-allocator";
import { buildLabelContent } from "../lib/label-builder";
import { labelBindings, labels } from "../db/schema/labels";

// ─── Dual-auth: resolve operator from JWT or Device-Token ───

interface ResolvedAuth {
  operatorUserId: string;
  deviceId: string | null;
  machineId: string | null;
  lineCode: string | null;
}

async function resolveAuth(request: Request): Promise<ResolvedAuth | string> {
  // 1. Try JWT Bearer token first
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = await verifyAccessToken(authHeader.slice(7));
      return {
        operatorUserId: payload.userId,
        deviceId: null,
        machineId: null,
        lineCode: null,
      };
    } catch {
      return "INVALID_ACCESS_TOKEN";
    }
  }

  // 2. Try HMAC headers (x-device-id + x-device-signature + x-device-timestamp)
  const headerDeviceId = request.headers.get("x-device-id");
  const headerSignature = request.headers.get("x-device-signature");
  const headerTs = request.headers.get("x-device-timestamp");

  if (headerDeviceId && headerSignature && headerTs) {
    const ts = Number(headerTs);
    if (!Number.isFinite(ts)) return "INVALID_SIGNATURE";
    const now = Date.now();
    if (Math.abs(now - ts) > 5 * 60 * 1000) return "SIGNATURE_EXPIRED";

    const [dev] = await db
      .select({
        id: devices.id,
        machineId: devices.machineId,
        isActive: devices.isActive,
        secretKey: devices.secretKey,
        deviceStatus: devices.deviceStatus,
      })
      .from(devices)
      .where(eq(devices.deviceCode, headerDeviceId))
      .limit(1);

    if (!dev || !dev.isActive || dev.deviceStatus === "disabled") return "DEVICE_INACTIVE";
    if (!dev.secretKey) return "DEVICE_SECRET_MISSING";

    const expected = createHmac("sha256", dev.secretKey).update(`${headerDeviceId}:${headerTs}`).digest("hex");
    if (expected.length !== headerSignature.length) return "INVALID_SIGNATURE";
    if (!timingSafeEqual(new TextEncoder().encode(expected), new TextEncoder().encode(headerSignature))) {
      return "INVALID_SIGNATURE";
    }

    const [session] = await db
      .select({ userId: deviceOperatorSessions.userId })
      .from(deviceOperatorSessions)
      .where(
        and(
          eq(deviceOperatorSessions.deviceId, dev.id),
          isNull(deviceOperatorSessions.endedAt)
        )
      )
      .limit(1);

    if (!session) return "NO_OPERATOR_SESSION";

    let lineCode: string | null = null;
    if (dev.machineId) {
      const [m] = await db
        .select({ lineCode: machines.lineCode })
        .from(machines)
        .where(eq(machines.id, dev.machineId))
        .limit(1);
      lineCode = m?.lineCode ?? null;
    }

    return {
      operatorUserId: session.userId,
      deviceId: dev.id,
      machineId: dev.machineId,
      lineCode,
    };
  }

  // 3. Try Device-Token + active operator session (backward compatibility)
  const deviceToken = request.headers.get("device-token");
  if (deviceToken) {
    let devicePayload: DeviceTokenPayload;
    try {
      devicePayload = await verifyDeviceToken(deviceToken);
    } catch {
      return "INVALID_DEVICE_TOKEN";
    }

    const [dev] = await db
      .select({
        id: devices.id,
        machineId: devices.machineId,
        isActive: devices.isActive,
        deviceStatus: devices.deviceStatus,
      })
      .from(devices)
      .where(eq(devices.id, devicePayload.deviceId))
      .limit(1);

    if (!dev || !dev.isActive || dev.deviceStatus === "disabled") return "DEVICE_INACTIVE";

    const [session] = await db
      .select({ userId: deviceOperatorSessions.userId })
      .from(deviceOperatorSessions)
      .where(
        and(
          eq(deviceOperatorSessions.deviceId, dev.id),
          isNull(deviceOperatorSessions.endedAt)
        )
      )
      .limit(1);

    if (!session) return "NO_OPERATOR_SESSION";

    let lineCode: string | null = null;
    if (dev.machineId) {
      const [m] = await db
        .select({ lineCode: machines.lineCode })
        .from(machines)
        .where(eq(machines.id, dev.machineId))
        .limit(1);
      lineCode = m?.lineCode ?? null;
    }

    return {
      operatorUserId: session.userId,
      deviceId: dev.id,
      machineId: dev.machineId,
      lineCode,
    };
  }

  return "NO_AUTH";
}

// ─── Events Route ───────────────────────────────────────

export const eventRoutes = new Elysia({ prefix: "/events" })

  // ── POST /events — ingest event ───────────────────
  .post(
    "/",
    async ({ body, request, set }) => {
      // Resolve auth
      const auth = await resolveAuth(request);
      if (typeof auth === "string") {
        const isNoOperator = auth === "NO_OPERATOR_SESSION";
        set.status = isNoOperator ? 403 : 401;
        return {
          success: false,
          error_code: auth,
          message:
            auth === "NO_OPERATOR_SESSION"
              ? "An operator must be logged in on this device to submit events"
              : "Valid JWT or Device-Token required",
        };
      }

      const {
        event_id,
        event_type,
        unit_id,
        machine_id,
        payload,
        created_at_device,
        target_state,
      } = body;

      // ── Domain handler dispatch ───────────────────────
      let handlerResult: HandlerResult | null = null;
      const handler = EVENT_HANDLERS[event_type];

      if (handler) {
        try {
          handlerResult = await handler({
            operatorUserId: auth.operatorUserId,
            machineId: machine_id ?? auth.machineId,
            lineCode: auth.lineCode,
            payload: (payload as Record<string, unknown>) ?? {},
          });
        } catch (err) {
          if (err instanceof DomainError) {
            set.status = err.status;
            return {
              success: false,
              error_code: err.code,
              message: err.message,
            };
          }
          throw err; // re-throw unexpected errors
        }
      }

      // ── State transition validation (for non-handler events) ──
      if (!handler && target_state && unit_id) {
        const [unit] = await db
          .select({
            id: units.id,
            unitType: units.unitType,
            status: units.status,
          })
          .from(units)
          .where(eq(units.id, unit_id))
          .limit(1);

        if (!unit) {
          set.status = 404;
          return {
            success: false,
            error_code: "UNIT_NOT_FOUND",
            message: `Unit "${unit_id}" not found`,
          };
        }

        const transition = validateTransition(
          unit.unitType,
          unit.status,
          target_state
        );

        if (!transition.valid) {
          set.status = 409;
          return {
            success: false,
            error_code: "INVALID_STATE_TRANSITION",
            message: transition.error,
            data: {
              unit_type: unit.unitType,
              current_state: transition.currentState,
              target_state: transition.targetState,
            },
          };
        }

        await db
          .update(units)
          .set({ status: target_state, updatedAt: new Date() })
          .where(eq(units.id, unit_id));
      }

      // ── Persist event (idempotent) ──────────────────
      const shiftDay = computeShiftDay();
      const effectiveUnitId = handlerResult?.unit_id ?? unit_id ?? null;

      const result = await db
        .insert(events)
        .values({
          id: event_id,
          unitId: effectiveUnitId,
          machineId: machine_id ?? auth.machineId,
          deviceId: auth.deviceId,
          operatorUserId: auth.operatorUserId,
          eventType: event_type,
          payload: payload ?? null,
          createdAtDevice: new Date(created_at_device),
          shiftDay,
          lineCode: auth.lineCode,
        })
        .onConflictDoNothing({ target: events.id })
        .returning({ id: events.id });

      const isDuplicate = result.length === 0;

      return {
        success: true,
        data: {
          event_id,
          accepted: true,
          duplicate: isDuplicate,
          shift_day: shiftDay,
          received_at: new Date().toISOString(),
          ...(handlerResult?.extra ?? {}),
        },
      };
    },
    {
      body: t.Object({
        event_id: t.String({ format: "uuid" }),
        event_type: t.String(),
        unit_id: t.Optional(t.String()),
        machine_id: t.Optional(t.String()),
        payload: t.Optional(t.Any()),
        created_at_device: t.String(),
        target_state: t.Optional(t.String()),
      }),
    }
  )
  // ── POST /events/validate-transition ──────────────
  .post(
    "/validate-transition",
    ({ body }) => {
      const { unit_type, current_state, target_state } = body;
      const result = validateTransition(unit_type, current_state, target_state);
      return { success: result.valid, data: result };
    },
    {
      body: t.Object({
        unit_type: t.String(),
        current_state: t.String(),
        target_state: t.String(),
      }),
    }
  );

// ─── POST /labels/generate ──────────────────────────
// Generates 6 labels for an ASSY_COMPLETED unit.
// Allocates serials, creates label records, links to trays.
// Returns 92-byte payloads for printing.

export const labelRoutes = new Elysia({ prefix: "/labels" })
  .post(
    "/generate",
    async ({ body, request, set }) => {
      // 1. Auth check
      const auth = await resolveAuth(request);
      if (typeof auth === "string") {
        set.status = 401;
        return { success: false, error_code: auth, message: "Valid JWT or Device-Token required" };
      }

      const { assy_id } = body;

      // 2. Validate ASSY state
      const [assy] = await db
        .select({
          id: units.id,
          status: units.status,
          variantId: units.variantId,
          revisionId: units.modelRevisionId,
          lineCode: units.lineCode,
        })
        .from(units)
        .where(eq(units.id, assy_id))
        .limit(1);

      if (!assy) {
        set.status = 404;
        return { success: false, error_code: "UNIT_NOT_FOUND", message: `ASSY "${assy_id}" not found` };
      }
      if (assy.status !== "ASSEMBLY_COMPLETED") {
        set.status = 409;
        return {
          success: false,
          error_code: "INVALID_STATE_TRANSITION",
          message: `ASSY is ${assy.status}, expected ASSEMBLY_COMPLETED`,
        };
      }

      // 3. Get Trays
      const linkedTrays = await db
        .select({ id: unitLinks.childUnitId })
        .from(unitLinks)
        .where(and(eq(unitLinks.parentUnitId, assy_id), eq(unitLinks.linkType, "SPLIT_INTO_TRAY")));
      
      if (linkedTrays.length !== 6) {
        set.status = 422;
        return {
          success: false,
          error_code: "INVALID_STATE_TRANSITION",
          message: `Expected 6 trays, found ${linkedTrays.length}`,
        };
      }

      if (!assy.revisionId) {
        set.status = 422;
        return { success: false, error_code: "REVISION_NOT_READY", message: "ASSY has no model revision" };
      }
      if (!assy.lineCode) {
        set.status = 422;
        return { success: false, error_code: "REVISION_NOT_READY", message: "ASSY has no line code" };
      }
      const lineCode = assy.lineCode;

      const [revision] = await db
        .select({ basePartNumber: modelRevisions.basePartNumber, status: modelRevisions.status })
        .from(modelRevisions)
        .where(eq(modelRevisions.id, assy.revisionId))
        .limit(1);

      if (!revision || revision.status !== "ACTIVE") {
        set.status = 422;
        return { success: false, error_code: "REVISION_NOT_READY", message: "Revision is missing or not ACTIVE" };
      }

      if (!revision?.basePartNumber) {
        set.status = 422;
        return {
          success: false,
          error_code: "REVISION_NOT_READY",
          message: "No base_part_number configured for model revision",
        };
      }

      const partNumber = revision.basePartNumber;

      const [variant] = assy.variantId
        ? await db
            .select({ code: variants.code })
            .from(variants)
            .where(eq(variants.id, assy.variantId))
            .limit(1)
        : [];

      if (assy.variantId && !variant) {
        set.status = 422;
        return {
          success: false,
          error_code: "VARIANT_NOT_FOUND",
          message: "ASSY variant reference does not exist",
        };
      }
      const variantCode = variant?.code ?? "DEFAULT";

      const [bindingExact] = assy.variantId
        ? await db
            .select({ labelTemplateId: labelBindings.labelTemplateId })
            .from(labelBindings)
            .where(
              and(
                eq(labelBindings.modelRevisionId, assy.revisionId),
                eq(labelBindings.variantId, assy.variantId),
                eq(labelBindings.unitType, "FOF_TRAY_20"),
                eq(labelBindings.processPoint, "POST_FVMI_LABEL")
              )
            )
            .limit(1)
        : [];

      const [bindingFallback] = await db
        .select({ labelTemplateId: labelBindings.labelTemplateId })
        .from(labelBindings)
        .where(
          and(
            eq(labelBindings.modelRevisionId, assy.revisionId),
            isNull(labelBindings.variantId),
            eq(labelBindings.unitType, "FOF_TRAY_20"),
            eq(labelBindings.processPoint, "POST_FVMI_LABEL")
          )
        )
        .limit(1);

      const labelTemplateId = bindingExact?.labelTemplateId ?? bindingFallback?.labelTemplateId;
      if (!labelTemplateId) {
        set.status = 422;
        return {
          success: false,
          error_code: "REVISION_NOT_READY",
          message: "No label binding found for revision/variant at POST_FVMI_LABEL (FOF_TRAY_20)",
        };
      }

      // 5. Allocate Serials (allocates next 6)
      const generatedLabels: Array<{ tray_id: string; serial: number; payload: string }> = [];
      const now = new Date();
      const shiftDay = computeShiftDay(now);

      try {
        await db.transaction(async (tx) => {
          for (const tray of linkedTrays) {
             const serial = await allocateSerial(partNumber, shiftDay, lineCode);
             
             // Build payload
             const payload = buildLabelContent({
               partNumber,
               variantCode,
               serial,
               lineCode,
               shiftDay
             });

             // Insert Label
             await tx.insert(labels).values({
               unitId: tray.id,
               labelTemplateId,
               serialNumber: serial,
               labelData: payload,
               shiftDay,
               lineCode,
               partNumber
             });

             generatedLabels.push({
               tray_id: tray.id,
               serial,
               payload
             });
             
             // Update Tray status
             await tx.update(units).set({ status: "LABELED", updatedAt: now }).where(eq(units.id, tray.id));
          }

          // Update ASSY status
          await tx.update(units).set({ status: "LABELED", updatedAt: now }).where(eq(units.id, assy_id));
        });
      } catch (err: unknown) {
        if (err instanceof DomainError) {
          set.status = err.status;
          return { success: false, error_code: err.code, message: err.message };
        }
        const message = err instanceof Error ? err.message : "Unknown error";
        set.status = 500;
        return { success: false, error_code: "GENERATION_FAILED", message };
      }

      return {
        success: true,
        data: {
          assy_id,
          labels: generatedLabels
        }
      };
    },
    {
      body: t.Object({
        assy_id: t.String()
      })
    }
  );
