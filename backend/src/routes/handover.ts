import Elysia, { t } from "elysia";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/connection";
import { checkAuth, checkRole, authDerive } from "../middleware/auth";
import type { AccessTokenPayload } from "../lib/jwt";
import { fail } from "../lib/http";
import {
  handoverBatches,
  handoverBatchItems,
  materialRequests,
  materialRequestItems,
  scanSessions,
  scanEvents,
  users,
} from "../db/schema";
import { auditConfigChange } from "./material-requests"; // reuse audit logging
import { parseBarcode, validateScannedBarcode } from "../lib/barcode-parser";
import { randomUUID } from "node:crypto";
import { publishHandoverBatchUpdate } from "../lib/realtime";

export const handoverRoutes = new Elysia({ prefix: "/handover-batches" })
  .use(authDerive)
  .get(
    "/",
    async ({ query, set, user }: { query: { status?: string }; set: any; user: AccessTokenPayload | null }) => {
      const unauthorized = checkAuth({ user, set });
      if (unauthorized) return unauthorized;

      const conditions = [];
      if (query.status) {
        const statuses = query.status.split(",").map((s) => s.trim().toUpperCase());
        conditions.push(inArray(handoverBatches.status, statuses as any));
      }

      const rows = await db
        .select({
          id: handoverBatches.id,
          batch_no: handoverBatches.batchNo,
          status: handoverBatches.status,
          material_request_id: handoverBatches.materialRequestId,
          request_no: materialRequests.requestNo,
          expected_item_count: handoverBatches.expectedItemCount,
          scanned_item_count: handoverBatches.scannedItemCount,
          issued_by_user_id: handoverBatches.issuedByUserId,
          assigned_forklift_user_id: handoverBatches.assignedForkliftUserId,
          created_at: handoverBatches.createdAt,
          updated_at: handoverBatches.updatedAt,
        })
        .from(handoverBatches)
        .leftJoin(materialRequests, eq(materialRequests.id, handoverBatches.materialRequestId))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(handoverBatches.createdAt));

      return { success: true, data: rows };
    }
  )
  .post(
    "/:id/pickup",
    async ({ params, body, set, user }: { params: { id: string }; body: { remarks?: string }; set: any; user: AccessTokenPayload | null }) => {
      const unauthorized = checkAuth({ user, set });
      if (unauthorized) return unauthorized;
      const currentUser = user as AccessTokenPayload;

      // Ensure role is forklift (OPERATOR/STORE etc. per your RBAC, assume OPERATOR here)
      const allowed = checkRole(["OPERATOR", "STORE", "ADMIN"])({ user, set });
      if (allowed) return allowed;

      const [batch] = await db.select().from(handoverBatches).where(eq(handoverBatches.id, params.id)).limit(1);
      if (!batch) {
        set.status = 404;
        return fail("NOT_FOUND", "Handover batch not found");
      }
      if (batch.status !== "PENDING") {
        set.status = 409;
        return fail("INVALID_STATUS", "Batch is not PENDING");
      }

      await db
        .update(handoverBatches)
        .set({
          status: "IN_TRANSIT",
          assignedForkliftUserId: currentUser.userId,
          pickupAt: new Date(),
          remarks: body.remarks || batch.remarks,
          updatedAt: new Date(),
        })
        .where(eq(handoverBatches.id, params.id));

      await auditConfigChange(currentUser.userId, "HANDOVER", params.id, "PICKUP", { status: batch.status }, { status: "IN_TRANSIT" });

      publishHandoverBatchUpdate({
        event_type: "BATCH_PICKED_UP",
        id: params.id,
        status: "IN_TRANSIT",
        batchNo: batch.batchNo,
      });

      return {
        success: true,
        data: { id: params.id, status: "IN_TRANSIT" },
      };
    },
    {
      body: t.Object({ remarks: t.Optional(t.String()) }),
    }
  );

export const scanSessionRoutes = new Elysia({ prefix: "/scan-sessions" })
  .use(authDerive)
  .post(
    "/",
    async ({ body, set, user }: { body: { handover_batch_id: string; device_id?: string }; set: any; user: AccessTokenPayload | null }) => {
      const unauthorized = checkAuth({ user, set });
      if (unauthorized) return unauthorized;
      const currentUser = user as AccessTokenPayload;

      const [batch] = await db.select().from(handoverBatches).where(eq(handoverBatches.id, body.handover_batch_id)).limit(1);
      if (!batch) {
        set.status = 404;
        return fail("NOT_FOUND", "Handover batch not found");
      }

      // Check for existing open session for this batch
      const [existing] = await db
        .select()
        .from(scanSessions)
        .where(and(eq(scanSessions.handoverBatchId, body.handover_batch_id), eq(scanSessions.status, "OPEN")))
        .limit(1);
      
      if (existing) {
        if (existing.userId !== currentUser.userId) {
           set.status = 409;
           return fail("SESSION_OPEN", "Another user is currently scanning this batch");
        }
        return { success: true, data: existing }; // Resume
      }

      const [session] = await db
        .insert(scanSessions)
        .values({
          handoverBatchId: body.handover_batch_id,
          userId: currentUser.userId,
          deviceId: body.device_id,
          status: "OPEN",
        })
        .returning();

      return { success: true, data: session };
    },
    {
      body: t.Object({ handover_batch_id: t.String(), device_id: t.Optional(t.String()) }),
    }
  )
  .post(
    "/:id/scans",
    async ({ params, body, set, user }: { params: { id: string }; body: { idempotency_key: string; barcode_raw: string; scanned_at_device: string; device_id?: string; parser_key?: string; pack_count?: number }; set: any; user: AccessTokenPayload | null }) => {
      const unauthorized = checkAuth({ user, set });
      if (unauthorized) return unauthorized;
      const currentUser = user as AccessTokenPayload;

      // Check idempotency first (fast path)
      const [idempotent] = await db.select().from(scanEvents).where(eq(scanEvents.idempotencyKey, body.idempotency_key)).limit(1);
      if (idempotent) {
        // Return existing without error
        return { success: true, data: idempotent };
      }

      const [session] = await db.select().from(scanSessions).where(eq(scanSessions.id, params.id)).limit(1);
      if (!session) {
        set.status = 404;
        return fail("NOT_FOUND", "Scan session not found");
      }
      if (session.status !== "OPEN") {
        set.status = 409;
        return fail("INVALID_STATUS", "Scan session is not OPEN");
      }

      // 1. Fetch expected batch items
      const batchItemRows = await db
        .select()
        .from(handoverBatchItems)
        .where(eq(handoverBatchItems.handoverBatchId, session.handoverBatchId));

      // Map Drizzle camelCase → BatchItemForValidation snake_case
      const batchItems = batchItemRows.map((row) => ({
        id: row.id,
        part_number: row.partNumber,
        do_number: row.doNumber,
        expected_packs: row.expectedPacks,
        scanned_packs: row.scannedPacks,
      }));

      // 2. Fetch existing scans (to check duplicates)
      const existingScans = await db
        .select({ barcode_raw: scanEvents.barcodeRaw, result: scanEvents.result })
        .from(scanEvents)
        .where(eq(scanEvents.handoverBatchId, session.handoverBatchId));

      // 3. Parse barcode
      const parsed = parseBarcode(body.barcode_raw, body.parser_key || "GENERIC");

      // 4. Validate
      const validation = validateScannedBarcode(parsed, batchItems, existingScans);

      // 5. Store Event + Update Item and Session
      const packCount = Math.max(1, Math.floor(Number(body.pack_count ?? 1)));
      let scanEventId = "";
      await db.transaction(async (tx) => {
        const [event] = await tx
          .insert(scanEvents)
          .values({
            idempotencyKey: body.idempotency_key,
            scanSessionId: session.id,
            handoverBatchId: session.handoverBatchId,
            barcodeRaw: body.barcode_raw,
            parsedSupplierCode: parsed.supplierCode,
            parsedPartNumber: parsed.partNumber,
            parsedLotNumber: parsed.lotNumber,
            parsedQty: parsed.quantity,
            parsedUom: parsed.uom,
            parsedExpiryDate: parsed.expiryDate,
            parsedProductionDate: parsed.productionDate,
            parsedData: parsed.segments,
            packCount: packCount,
            result: validation.result,
            resultDetail: validation.detail,
            matchedBatchItemId: validation.matchedItemId,
            userId: currentUser.userId,
            deviceId: body.device_id,
            scannedAtDevice: new Date(body.scanned_at_device),
          })
          .returning({ id: scanEvents.id });
        
        scanEventId = event.id;

        // If MATCHED, increment batch item safely
        if (validation.result === "MATCHED" && validation.matchedItemId) {
          // Lock row for safe increment
          const [item] = await tx.execute(
            sql`SELECT id, scanned_packs FROM ${handoverBatchItems} WHERE id=${validation.matchedItemId} FOR UPDATE`
          );
          
          await tx
            .update(handoverBatchItems)
            .set({ scannedPacks: sql`${handoverBatchItems.scannedPacks} + 1` })
            .where(eq(handoverBatchItems.id, validation.matchedItemId));

          // Also update the handover_batch total
          await tx
            .update(handoverBatches)
            .set({ scannedItemCount: sql`${handoverBatches.scannedItemCount} + 1`, updatedAt: new Date() })
            .where(eq(handoverBatches.id, session.handoverBatchId));
        }

        // Update session stats
        await tx
          .update(scanSessions)
          .set({
            totalScans: sql`${scanSessions.totalScans} + 1`,
            matchedScans: validation.result === "MATCHED" ? sql`${scanSessions.matchedScans} + 1` : scanSessions.matchedScans,
            errorScans: validation.result !== "MATCHED" ? sql`${scanSessions.errorScans} + 1` : scanSessions.errorScans,
            updatedAt: new Date(),
          })
          .where(eq(scanSessions.id, session.id));
      });

      return {
        success: true,
        data: {
          scan_event_id: scanEventId,
          result: validation.result,
          result_detail: validation.detail,
          matched_item_id: validation.matchedItemId,
          pack_count: packCount,
        },
      };

      // Fire-and-forget SSE push (after return to not slow the hot path)
    },
    {
      body: t.Object({
        idempotency_key: t.String(),
        barcode_raw: t.String(),
        scanned_at_device: t.String(),
        device_id: t.Optional(t.String()),
        parser_key: t.Optional(t.String()),
        pack_count: t.Optional(t.Number()),
      }),
    }
  )
  .post(
    "/:id/finalize",
    async ({ params, body, set, user }: { params: { id: string }; body: { acknowledge_shortages: boolean; remarks?: string }; set: any; user: AccessTokenPayload | null }) => {
      const unauthorized = checkAuth({ user, set });
      if (unauthorized) return unauthorized;
      const currentUser = user as AccessTokenPayload;

      const [session] = await db.select().from(scanSessions).where(eq(scanSessions.id, params.id)).limit(1);
      if (!session) {
        set.status = 404;
        return fail("NOT_FOUND", "Scan session not found");
      }
      if (session.status !== "OPEN") {
        set.status = 409;
        return fail("INVALID_STATUS", "Session is not OPEN");
      }

      const batchItems = await db
        .select()
        .from(handoverBatchItems)
        .where(eq(handoverBatchItems.handoverBatchId, session.handoverBatchId));

      let hasShortages = false;
      for (const item of batchItems) {
        if (item.scannedPacks < item.expectedPacks) {
          hasShortages = true;
          break;
        }
      }

      if (hasShortages && !body.acknowledge_shortages) {
        set.status = 422;
        return fail("SHORTAGE_NOT_ACKNOWLEDGED", "There are missing items. Shortages must be explicitly acknowledged to finalize.");
      }

      const newBatchStatus = hasShortages ? "RECEIVED_PARTIAL" : "RECEIVED";

      await db.transaction(async (tx) => {
        // Finalize session
        await tx
          .update(scanSessions)
          .set({ status: "COMPLETED", finalizedAt: new Date(), remarks: body.remarks })
          .where(eq(scanSessions.id, session.id));

        // Update batch status
        await tx
          .update(handoverBatches)
          .set({ status: newBatchStatus, receivedAt: new Date(), remarks: body.remarks })
          .where(eq(handoverBatches.id, session.handoverBatchId));
        
        // Let's cascade up to material request if all batches are received
        const [batchInfo] = await tx.select({ materialRequestId: handoverBatches.materialRequestId }).from(handoverBatches).where(eq(handoverBatches.id, session.handoverBatchId));
        
        if (batchInfo) {
           const allBatches = await tx.select({ status: handoverBatches.status }).from(handoverBatches).where(eq(handoverBatches.materialRequestId, batchInfo.materialRequestId));
           const allReceived = allBatches.every(b => b.status === "RECEIVED" || b.status === "RECEIVED_PARTIAL" || b.status === "CANCELLED");
           
           if (allReceived) {
              await tx.update(materialRequests).set({ status: "INTAKE_COMPLETE", updatedAt: new Date() }).where(eq(materialRequests.id, batchInfo.materialRequestId));
           } else {
              // Update to PARTIALLY_RECEIVED if it's the first one
              await tx.execute(sql`UPDATE material_requests SET status = 'PARTIALLY_RECEIVED', updated_at = NOW() WHERE id = ${batchInfo.materialRequestId} AND status = 'ISSUED'`);
           }
        }
      });

      publishHandoverBatchUpdate({
        event_type: "SESSION_FINALIZED",
        id: session.handoverBatchId,
        status: newBatchStatus,
      });

      return { success: true, data: { status: "COMPLETED", handover_batch_status: newBatchStatus } };
    },
    {
      body: t.Object({ acknowledge_shortages: t.Boolean(), remarks: t.Optional(t.String()) })
    }
  );
