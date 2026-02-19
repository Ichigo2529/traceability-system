/**
 * Set-Run Lifecycle Service
 *
 * Manages production run/batch lifecycle:
 * - Create a new set_run when bonding starts
 * - Lock materials (containers) to a set_run
 * - Close a set_run when final assembly ends
 * - Auto-hold stale set_runs after inactivity timeout
 */

import { db } from "../db/connection";
import { setRuns, containers, consumption } from "../db/schema/genealogy";
import { eq, and, lt, sql } from "drizzle-orm";
import { DomainError } from "./errors";

/** Drizzle db or transaction — uses structural typing for compat */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbOrTx = any;

/** Default stale timeout: 8 hours */
const STALE_TIMEOUT_HOURS = 8;

export interface CreateSetRunParams {
  setCode: string;
  modelRevisionId: string | null;
  variantId: string | null;
  assyUnitId: string | null;
}

export interface SetRunRecord {
  id: string;
  setCode: string;
  status: string;
  startedAt: Date;
}

/**
 * Create a new set_run (production batch).
 */
export async function createSetRun(
  params: CreateSetRunParams,
  tx?: DbOrTx
): Promise<SetRunRecord> {
  const conn = tx ?? db;

  const [record] = await conn
    .insert(setRuns)
    .values({
      setCode: params.setCode,
      modelRevisionId: params.modelRevisionId,
      variantId: params.variantId,
      assyUnitId: params.assyUnitId,
    })
    .returning({
      id: setRuns.id,
      setCode: setRuns.setCode,
      status: setRuns.status,
      startedAt: setRuns.startedAt,
    });

  return record;
}

/**
 * Close a set_run (mark as COMPLETED).
 */
export async function closeSetRun(
  setRunId: string,
  tx?: DbOrTx
): Promise<void> {
  const conn = tx ?? db;

  const [setRun] = await conn
    .select({ id: setRuns.id, status: setRuns.status })
    .from(setRuns)
    .where(eq(setRuns.id, setRunId))
    .limit(1);

  if (!setRun) {
    throw new DomainError(
      "SET_RUN_NOT_FOUND",
      `Set run "${setRunId}" not found`
    );
  }

  if (setRun.status !== "ACTIVE") {
    throw new DomainError(
      "SET_RUN_NOT_ACTIVE",
      `Set run "${setRunId}" is ${setRun.status}, cannot close`
    );
  }

  await conn
    .update(setRuns)
    .set({ status: "COMPLETED", endedAt: new Date() })
    .where(eq(setRuns.id, setRunId));
}

/**
 * Close set_run by assy unit id.
 * Used by FINAL_ASSEMBLY_PASS / FINAL_ASSEMBLY_FAIL handlers.
 * If no matching ACTIVE set_run exists, logs a warning and returns (non-blocking).
 */
export async function closeSetRunByAssyUnit(
  assyUnitId: string,
  finalStatus: "COMPLETED" | "CANCELLED" = "COMPLETED",
  tx?: DbOrTx
): Promise<void> {
  const conn = tx ?? db;

  const [setRun] = await conn
    .select({ id: setRuns.id, status: setRuns.status })
    .from(setRuns)
    .where(and(eq(setRuns.assyUnitId, assyUnitId), eq(setRuns.status, "ACTIVE")))
    .limit(1);

  if (!setRun) {
    console.warn(
      `[SET_LIFECYCLE] No ACTIVE set_run found for assy "${assyUnitId}", skipping close`
    );
    return;
  }

  await conn
    .update(setRuns)
    .set({ status: finalStatus, endedAt: new Date() })
    .where(eq(setRuns.id, setRun.id));

  console.log(
    `[SET_LIFECYCLE] Closed set_run="${setRun.id}" for assy="${assyUnitId}" → ${finalStatus}`
  );
}

/**
 * Lock a material source to a set_run by creating a container record.
 */
export async function lockMaterialForSet(
  setRunId: string,
  containerType: string,
  unitId: string | null,
  tx?: DbOrTx
): Promise<string> {
  const conn = tx ?? db;

  const [setRun] = await conn
    .select({ id: setRuns.id, status: setRuns.status })
    .from(setRuns)
    .where(eq(setRuns.id, setRunId))
    .limit(1);

  if (!setRun) {
    throw new DomainError(
      "SET_RUN_NOT_FOUND",
      `Set run "${setRunId}" not found`
    );
  }

  if (setRun.status !== "ACTIVE") {
    throw new DomainError(
      "SET_RUN_NOT_ACTIVE",
      `Set run "${setRunId}" is ${setRun.status}, cannot lock material`
    );
  }

  const [container] = await conn
    .insert(containers)
    .values({
      setRunId,
      containerType,
      unitId,
    })
    .returning({ id: containers.id });

  return container.id;
}

/**
 * Auto-hold stale set_runs.
 *
 * Any ACTIVE set_run whose last consumption is older than `timeoutHours`
 * (default 8h) — or has no consumption and was started > 8h ago — is
 * moved to HOLD status.
 *
 * Returns the number of set_runs put on hold.
 */
export async function holdStaleSetRuns(
  timeoutHours: number = STALE_TIMEOUT_HOURS
): Promise<number> {
  const cutoff = new Date(Date.now() - timeoutHours * 60 * 60 * 1000);

  // Find ACTIVE set_runs where:
  // - latest consumption_at < cutoff  OR
  // - no consumption records AND started_at < cutoff
  const staleIds: { id: string }[] = await db.execute(sql`
    SELECT sr.id
    FROM set_runs sr
    WHERE sr.status = 'ACTIVE'
      AND (
        -- has consumption but last one is stale
        (EXISTS (SELECT 1 FROM consumption c WHERE c.set_run_id = sr.id)
         AND (SELECT MAX(c.consumed_at) FROM consumption c WHERE c.set_run_id = sr.id) < ${cutoff})
        OR
        -- no consumption at all and started long ago
        (NOT EXISTS (SELECT 1 FROM consumption c WHERE c.set_run_id = sr.id)
         AND sr.started_at < ${cutoff})
      )
  `) as unknown as { id: string }[];

  if (staleIds.length === 0) return 0;

  const ids = staleIds.map((r) => r.id);
  await db
    .update(setRuns)
    .set({ status: "HOLD", endedAt: new Date() })
    .where(sql`${setRuns.id} IN ${ids}`);

  console.log(
    `[SET_LIFECYCLE] Auto-held ${ids.length} stale set_run(s): ${ids.join(", ")}`
  );

  return ids.length;
}
