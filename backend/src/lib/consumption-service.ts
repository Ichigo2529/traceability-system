/**
 * Consumption Ledger Service
 *
 * All material usage MUST go through consumeMaterial().
 * This is the single entry point for recording material consumption
 * in the immutable ledger.
 *
 * Safety guarantees:
 * - Idempotency via idempotency_key (duplicate key = skip, no error)
 * - Validates set_run status before writing
 * - Validates positive qty
 */

import { db } from "../db/connection";
import { consumption, setRuns } from "../db/schema/genealogy";
import { eq } from "drizzle-orm";
import { DomainError } from "./errors";

/** Drizzle db or transaction — uses structural typing for compat */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbOrTx = any;

export interface ConsumeParams {
  setRunId: string;
  componentTypeId: string | null;
  qty: number;
  sourceType: "SUPPLIER_PACK" | "BAG100" | "UNIT";
  sourceUid: string;
  stepCode: string;
  machineId: string | null;
  /** Optional idempotency key — duplicates are silently skipped */
  idempotencyKey?: string;
}

export interface ConsumptionRecord {
  id: string;
  setRunId: string;
  qty: number;
  sourceType: string;
  sourceUid: string;
  stepCode: string;
  consumedAt: Date;
}

/**
 * Record material consumption in the immutable ledger.
 *
 * Validates that the set_run exists and is ACTIVE.
 * If idempotencyKey is provided and already exists, returns the existing record
 * without inserting a duplicate (idempotent).
 * Accepts optional `tx` for transactional writes.
 */
export async function consumeMaterial(
  params: ConsumeParams,
  tx?: DbOrTx
): Promise<ConsumptionRecord> {
  const conn = tx ?? db;

  // ─── Idempotency check ───────────────────────────────
  if (params.idempotencyKey) {
    const [existing] = await conn
      .select({
        id: consumption.id,
        setRunId: consumption.setRunId,
        qty: consumption.qty,
        sourceType: consumption.sourceType,
        sourceUid: consumption.sourceUid,
        stepCode: consumption.stepCode,
        consumedAt: consumption.consumedAt,
      })
      .from(consumption)
      .where(eq(consumption.idempotencyKey, params.idempotencyKey))
      .limit(1);

    if (existing) {
      console.log(
        `[IDEMPOTENT] Consumption already recorded for key="${params.idempotencyKey}", skipping`
      );
      return existing;
    }
  }

  // Validate set_run exists and is ACTIVE
  const [setRun] = await conn
    .select({ id: setRuns.id, status: setRuns.status })
    .from(setRuns)
    .where(eq(setRuns.id, params.setRunId))
    .limit(1);

  if (!setRun) {
    throw new DomainError(
      "SET_RUN_NOT_FOUND",
      `Set run "${params.setRunId}" not found`
    );
  }

  if (setRun.status !== "ACTIVE") {
    throw new DomainError(
      "SET_RUN_NOT_ACTIVE",
      `Set run "${params.setRunId}" is ${setRun.status}, expected ACTIVE`
    );
  }

  if (params.qty <= 0) {
    throw new DomainError(
      "INVALID_QTY",
      `Consumption qty must be positive, got ${params.qty}`
    );
  }

  // Insert immutable consumption record
  const [record] = await conn
    .insert(consumption)
    .values({
      setRunId: params.setRunId,
      componentTypeId: params.componentTypeId,
      qty: params.qty,
      sourceType: params.sourceType,
      sourceUid: params.sourceUid,
      stepCode: params.stepCode,
      machineId: params.machineId,
      idempotencyKey: params.idempotencyKey ?? null,
    })
    .returning({
      id: consumption.id,
      setRunId: consumption.setRunId,
      qty: consumption.qty,
      sourceType: consumption.sourceType,
      sourceUid: consumption.sourceUid,
      stepCode: consumption.stepCode,
      consumedAt: consumption.consumedAt,
    });

  return record;
}
