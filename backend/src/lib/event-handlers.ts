/**
 * Domain event handlers.
 *
 * Each handler receives the event payload + resolved auth context,
 * performs domain-specific logic (create units, link genealogy, deduct qty),
 * and returns an enriched result or throws a DomainError.
 */

import { db } from "../db/connection";
import { units, unitLinks, events } from "../db/schema/production";
import { machines } from "../db/schema/devices";
import { variants, modelRevisions, bom, routing, routingSteps } from "../db/schema/config";
import { supplierPacks } from "../db/schema/inventory";
import { eq, and, sql } from "drizzle-orm";
import { DomainError } from "./errors";

export { DomainError };

// ─── Handler context (passed from event route) ──────────

// ─── Handler context (passed from event route) ──────────

export interface HandlerContext {
  operatorUserId: string;
  machineId: string | null;
  lineCode: string | null;
  payload: Record<string, unknown>;
}

// ─── Handler result ─────────────────────────────────────

export interface HandlerResult {
  /** unit_id created or affected */
  unit_id?: string;
  /** extra data to merge into event response */
  extra?: Record<string, unknown>;
}

const ASSEMBLY_ROUTING_EVENT_SET = new Set([
  "PRESS_FIT_PIN430_DONE",
  "PRESS_FIT_PIN300_DONE",
  "PRESS_FIT_SHROUD_DONE",
  "CRASH_STOP_DONE",
  "IONIZER_DONE",
]);

async function ensureRevisionReady(revisionId: string): Promise<void> {
  const [revision] = await db
    .select({ id: modelRevisions.id, status: modelRevisions.status })
    .from(modelRevisions)
    .where(eq(modelRevisions.id, revisionId))
    .limit(1);

  if (!revision || revision.status !== "ACTIVE") {
    throw new DomainError("REVISION_NOT_READY", "Revision is missing or not ACTIVE");
  }

  const bomRows = await db.select({ id: bom.id }).from(bom).where(eq(bom.revisionId, revisionId)).limit(1);
  const [routingRow] = await db.select({ id: routing.id }).from(routing).where(eq(routing.revisionId, revisionId)).limit(1);
  const stepRows = routingRow
    ? await db.select({ id: routingSteps.id }).from(routingSteps).where(eq(routingSteps.routingId, routingRow.id)).limit(1)
    : [];

  if (!bomRows.length || !routingRow || !stepRows.length) {
    throw new DomainError("REVISION_NOT_READY", "Revision config incomplete (BOM/Routing/Steps)");
  }
}

async function getRoutingStepsForRevision(revisionId: string) {
  const [routingRow] = await db
    .select({ id: routing.id })
    .from(routing)
    .where(eq(routing.revisionId, revisionId))
    .limit(1);
  if (!routingRow) throw new DomainError("REVISION_NOT_READY", "Routing not found for revision");

  return db
    .select({
      stepCode: routingSteps.stepCode,
      variantOnly: routingSteps.variantOnly,
    })
    .from(routingSteps)
    .where(eq(routingSteps.routingId, routingRow.id));
}

// ─── PLATE_LOADED ───────────────────────────────────────

export async function handlePlateLoaded(
  ctx: HandlerContext
): Promise<HandlerResult> {
  const [plate] = await db
    .insert(units)
    .values({
      unitType: "PLATE_120",
      status: "CREATED",
      machineId: ctx.machineId,
      lineCode: ctx.lineCode ?? (ctx.payload.line_code as string) ?? null,
      batchRef: (ctx.payload.batch_ref as string) ?? null,
    })
    .returning({ id: units.id });

  return {
    unit_id: plate.id,
    extra: { plate_id: plate.id, unit_type: "PLATE_120", status: "CREATED" },
  };
}

// ─── WASH1_END ──────────────────────────────────────────

export async function handleWash1End(
  ctx: HandlerContext
): Promise<HandlerResult> {
  const plateId = ctx.payload.plate_id as string;
  if (!plateId) throw new DomainError("MISSING_PLATE_ID", "payload.plate_id required");

  const [plate] = await db
    .select({ id: units.id, status: units.status, unitType: units.unitType })
    .from(units)
    .where(eq(units.id, plateId))
    .limit(1);

  if (!plate) throw new DomainError("UNIT_NOT_FOUND", `Plate "${plateId}" not found`, 404);
  if (plate.unitType !== "PLATE_120")
    throw new DomainError("WRONG_UNIT_TYPE", `Unit "${plateId}" is ${plate.unitType}, expected PLATE_120`);
  if (plate.status !== "CREATED")
    throw new DomainError("INVALID_STATE_TRANSITION", `Plate is "${plate.status}", expected CREATED`);

  await db.update(units).set({ status: "WASHED", updatedAt: new Date() }).where(eq(units.id, plateId));

  return { unit_id: plateId, extra: { plate_id: plateId, status: "WASHED" } };
}

// ─── BONDING_END ────────────────────────────────────────

const ASSY_QTY_PER_BONDING = 120;

async function resolveMagnetPackSource(magnetPackId: string) {
  const [pack] = await db
    .select({
      id: units.id,
      unitType: units.unitType,
      qtyRemaining: units.qtyRemaining,
    })
    .from(units)
    .where(eq(units.id, magnetPackId))
    .limit(1);

  if (!pack) throw new DomainError("UNIT_NOT_FOUND", `Magnet pack "${magnetPackId}" not found`, 404);
  if (pack.unitType !== "MAG_PACK" && pack.unitType !== "SUPPLIER_PACK") {
    throw new DomainError("WRONG_UNIT_TYPE", `Expected MAG_PACK or SUPPLIER_PACK`);
  }
  if (!pack.qtyRemaining || pack.qtyRemaining < ASSY_QTY_PER_BONDING) {
    throw new DomainError("INSUFFICIENT_QTY_REMAINING", `Need ${ASSY_QTY_PER_BONDING}, have ${pack.qtyRemaining ?? 0}`);
  }

  if (pack.unitType === "SUPPLIER_PACK") {
    const [supplierPack] = await db
      .select({
        id: supplierPacks.id,
        packQtyRemaining: supplierPacks.packQtyRemaining,
      })
      .from(supplierPacks)
      .where(eq(supplierPacks.unitId, magnetPackId))
      .limit(1);
    if (!supplierPack) {
      throw new DomainError("UNIT_NOT_FOUND", `Supplier pack record for "${magnetPackId}" not found`, 404);
    }
    if (supplierPack.packQtyRemaining < ASSY_QTY_PER_BONDING) {
      throw new DomainError(
        "INSUFFICIENT_QTY_REMAINING",
        `Supplier pack has ${supplierPack.packQtyRemaining}, need ${ASSY_QTY_PER_BONDING}`
      );
    }
  }

  return pack;
}

export async function handleBondingEnd(
  ctx: HandlerContext
): Promise<HandlerResult> {
  const plateId = ctx.payload.plate_id as string;
  const magnetPackId = ctx.payload.magnet_pack_id as string;
  const revisionId = ctx.payload.revision_id as string | undefined;
  const variantId = ctx.payload.variant_id as string | undefined;
  if (!plateId) throw new DomainError("MISSING_PLATE_ID", "payload.plate_id required");
  if (!magnetPackId) throw new DomainError("MISSING_MAGNET_PACK_ID", "payload.magnet_pack_id required");
  if (!revisionId) throw new DomainError("REVISION_NOT_READY", "payload.revision_id required");
  await ensureRevisionReady(revisionId);

  if (variantId) {
    const [variant] = await db
      .select({ id: variants.id })
      .from(variants)
      .where(and(eq(variants.id, variantId), eq(variants.revisionId, revisionId)))
      .limit(1);
    if (!variant) throw new DomainError("VARIANT_MISMATCH", `Variant "${variantId}" is not part of revision "${revisionId}"`);
  }

  const [plate] = await db.select({ id: units.id, status: units.status, unitType: units.unitType }).from(units).where(eq(units.id, plateId)).limit(1);
  if (!plate) throw new DomainError("UNIT_NOT_FOUND", `Plate "${plateId}" not found`, 404);
  if (plate.unitType !== "PLATE_120") throw new DomainError("WRONG_UNIT_TYPE", `Expected PLATE_120`);
  if (plate.status !== "WASHED")
    throw new DomainError("COMPONENT_NOT_WASHED", `Plate must be WASHED (current: ${plate.status})`);

  const mag = await resolveMagnetPackSource(magnetPackId);

  const [assy] = await db
    .insert(units)
    .values({
      unitType: "ASSY_120",
      status: "CREATED",
      machineId: ctx.machineId,
      lineCode: ctx.lineCode,
      modelRevisionId: revisionId,
      variantId: variantId ?? null,
    })
    .returning({ id: units.id });
  await db.insert(unitLinks).values({ parentUnitId: assy.id, childUnitId: plateId, linkType: "BONDED_FROM_PLATE" });
  await db.insert(unitLinks).values({ parentUnitId: assy.id, childUnitId: magnetPackId, linkType: "BONDED_FROM_MAGNET" });

  const newQty = mag.qtyRemaining! - ASSY_QTY_PER_BONDING;
  await db.update(units).set({ qtyRemaining: newQty, status: "IN_USE", updatedAt: new Date() }).where(eq(units.id, magnetPackId));
  if (mag.unitType === "SUPPLIER_PACK") {
    await db
      .update(supplierPacks)
      .set({ packQtyRemaining: newQty, updatedAt: new Date() })
      .where(eq(supplierPacks.unitId, magnetPackId));
  }
  await db.update(units).set({ status: "BONDED", updatedAt: new Date() }).where(eq(units.id, plateId));

  return { unit_id: assy.id, extra: { assy_id: assy.id, plate_id: plateId, magnet_pack_id: magnetPackId, magnet_qty_remaining: newQty } };
}

// ─── JIG_LOADED ─────────────────────────────────────────

export async function handleJigLoaded(
  ctx: HandlerContext
): Promise<HandlerResult> {
  const qtyTotal = (ctx.payload.qty_total as number) ?? 0;
  const jigType = (ctx.payload.jig_type as string) ?? "JIG";

  const [jig] = await db
    .insert(units)
    .values({
      unitType: jigType,
      status: "LOADED",
      machineId: ctx.machineId,
      lineCode: ctx.lineCode,
      batchRef: (ctx.payload.batch_ref as string) ?? null,
      qtyTotal,
      qtyRemaining: qtyTotal,
    })
    .returning({ id: units.id });

  return { unit_id: jig.id, extra: { jig_id: jig.id, unit_type: jigType, status: "LOADED", qty_total: qtyTotal } };
}

// ─── WASH2_END ──────────────────────────────────────────

export async function handleWash2End(
  ctx: HandlerContext
): Promise<HandlerResult> {
  const jigId = ctx.payload.jig_id as string;
  if (!jigId) throw new DomainError("MISSING_JIG_ID", "payload.jig_id required");

  const [jig] = await db.select({ id: units.id, status: units.status, unitType: units.unitType }).from(units).where(eq(units.id, jigId)).limit(1);
  if (!jig) throw new DomainError("UNIT_NOT_FOUND", `Jig "${jigId}" not found`, 404);

  const validJigTypes = ["JIG", "PIN430_JIG", "PIN300_JIG", "SHROUD_JIG", "CRASH_STOP_JIG"];
  if (!validJigTypes.includes(jig.unitType))
    throw new DomainError("WRONG_UNIT_TYPE", `Unit is ${jig.unitType}, expected JIG variant`);
  if (jig.status !== "LOADED" && jig.status !== "IN_USE")
    throw new DomainError("INVALID_STATE_TRANSITION", `Jig is "${jig.status}", expected LOADED or IN_USE`);

  await db.update(units).set({ status: "WASH2_COMPLETED", updatedAt: new Date() }).where(eq(units.id, jigId));

  return { unit_id: jigId, extra: { jig_id: jigId, status: "WASH2_COMPLETED" } };
}

// ─── ASSY_BIND_COMPONENTS ───────────────────────────────
// Per Design Bible §03 (Domain Rulebook) C, E, F, G, I:
//
// 1. ASSY must be FLUX_PASS
// 2. Resolve + lock variant (WITH_SHROUD / NO_SHROUD)
// 3. Line capability check
// 4. Validate required jigs per variant
// 5. Validate jigs are WASH2_COMPLETED
// 6. Link ASSY → jigs, transition jigs → IN_USE
// 7. ASSY → COMPONENTS_BOUND
//
// payload: { assy_id, selected_variant?, jig_ids: { pin430, pin300, crash_stop, shroud? } }

const BASE_REQUIRED_JIGS = ["PIN430_JIG", "PIN300_JIG", "CRASH_STOP_JIG"];
const SHROUD_JIG_TYPE = "SHROUD_JIG";

const JIG_KEY_TO_TYPE: Record<string, string> = {
  pin430: "PIN430_JIG",
  pin300: "PIN300_JIG",
  crash_stop: "CRASH_STOP_JIG",
  shroud: "SHROUD_JIG",
};

export async function handleAssyBindComponents(
  ctx: HandlerContext
): Promise<HandlerResult> {
  const assyId = ctx.payload.assy_id as string;
  if (!assyId) throw new DomainError("MISSING_ASSY_ID", "payload.assy_id required");

  const jigIds = ctx.payload.jig_ids as Record<string, string> | undefined;
  if (!jigIds) throw new DomainError("MISSING_JIG_IDS", "payload.jig_ids required");

  // 1. Look up ASSY
  const [assy] = await db
    .select({
      id: units.id, unitType: units.unitType, status: units.status,
      variantId: units.variantId, lineCode: units.lineCode, machineId: units.machineId,
      modelRevisionId: units.modelRevisionId,
    })
    .from(units)
    .where(eq(units.id, assyId))
    .limit(1);

  if (!assy) throw new DomainError("UNIT_NOT_FOUND", `ASSY "${assyId}" not found`, 404);
  if (assy.unitType !== "ASSY_120") throw new DomainError("WRONG_UNIT_TYPE", `Expected ASSY_120, got ${assy.unitType}`);
  if (assy.status !== "FLUX_PASS")
    throw new DomainError("INVALID_STATE_TRANSITION", `ASSY must be FLUX_PASS (current: ${assy.status})`);

  const revisionId = assy.modelRevisionId ?? (ctx.payload.revision_id as string | undefined);
  if (!revisionId) throw new DomainError("REVISION_NOT_READY", "ASSY has no revision context");
  await ensureRevisionReady(revisionId);

  // 2. Resolve variant
  let variantId = assy.variantId;
  let variantCode: string;

  if (!variantId) {
    const selectedVariant = ctx.payload.selected_variant as string;
    if (!selectedVariant)
      throw new DomainError("VARIANT_REQUIRED", "ASSY has no variant — payload.selected_variant required");

    const [v] = await db
      .select({ id: variants.id, code: variants.code })
      .from(variants)
      .where(and(eq(variants.code, selectedVariant), eq(variants.revisionId, revisionId)))
      .limit(1);
    if (!v) throw new DomainError("VARIANT_NOT_FOUND", `Variant "${selectedVariant}" not found`, 404);
    variantId = v.id;
    variantCode = v.code;
  } else {
    const [v] = await db.select({ code: variants.code }).from(variants).where(eq(variants.id, variantId)).limit(1);
    variantCode = v?.code ?? "UNKNOWN";
  }

  // 3. Line capability check
  const effectiveMachineId = ctx.machineId ?? assy.machineId;
  const effectiveLineCode = ctx.lineCode ?? assy.lineCode;

  if (effectiveMachineId) {
    const [machine] = await db
      .select({ capabilities: machines.capabilities, lineCode: machines.lineCode })
      .from(machines)
      .where(eq(machines.id, effectiveMachineId))
      .limit(1);

    if (machine?.capabilities) {
      const caps = machine.capabilities as Record<string, unknown>;
      const supported = caps.supported_variants as string[] | undefined;
      if (supported && !supported.includes(variantCode)) {
        throw new DomainError("LINE_NOT_CAPABLE_FOR_VARIANT",
          `Line "${machine.lineCode}" does not support "${variantCode}". Supported: ${supported.join(", ")}`);
      }
    }
  }

  // 4. Determine required jigs
  const isWithShroud = variantCode === "WITH_SHROUD";
  let requiredJigTypes = [...BASE_REQUIRED_JIGS];
  if (isWithShroud) requiredJigTypes.push(SHROUD_JIG_TYPE);

  const bomRows = await db
    .select({ unitType: bom.unitType, variantId: bom.variantId, isOptional: bom.isOptional })
    .from(bom)
    .where(eq(bom.revisionId, revisionId));

  const requiredFromBom = bomRows
    .filter((row) => !row.isOptional && (!row.variantId || row.variantId === variantId))
    .map((row) => row.unitType)
    .filter((unitType) => unitType.endsWith("_JIG"));
  if (requiredFromBom.length) requiredJigTypes = Array.from(new Set(requiredFromBom));

  // Validate all required jigs are provided
  for (const jigType of requiredJigTypes) {
    const key = Object.entries(JIG_KEY_TO_TYPE).find(([_, t]) => t === jigType)?.[0];
    if (!key || !jigIds[key])
      throw new DomainError("MISSING_REQUIRED_COMPONENT", `Required jig "${jigType}" (key: ${key}) not in jig_ids`);
  }

  // Block unexpected shroud
  if (!isWithShroud && jigIds.shroud)
    throw new DomainError("VARIANT_MISMATCH", `Variant "${variantCode}" does not require shroud jig`);

  // 5. Validate each jig: exists, correct type, washed
  const jigIdList: string[] = [];
  for (const jigType of requiredJigTypes) {
    const key = Object.entries(JIG_KEY_TO_TYPE).find(([_, t]) => t === jigType)![0];
    const jigId = jigIds[key];
    jigIdList.push(jigId);

    const [jig] = await db
      .select({ id: units.id, unitType: units.unitType, status: units.status })
      .from(units).where(eq(units.id, jigId)).limit(1);

    if (!jig) throw new DomainError("UNIT_NOT_FOUND", `Jig "${jigId}" (${jigType}) not found`, 404);
    if (jig.unitType !== jigType)
      throw new DomainError("WRONG_JIG_TYPE", `Jig "${jigId}" is ${jig.unitType}, expected ${jigType}`);
    if (jig.status !== "WASH2_COMPLETED")
      throw new DomainError("COMPONENT_NOT_WASHED", `Jig "${jigId}" (${jigType}) must be WASH2_COMPLETED (current: ${jig.status})`);
  }

  // 6. Lock variant + transition ASSY → COMPONENTS_BOUND
  await db
    .update(units)
    .set({
      variantId,
      modelRevisionId: revisionId,
      status: "COMPONENTS_BOUND",
      lineCode: effectiveLineCode,
      updatedAt: new Date(),
    })
    .where(eq(units.id, assyId));

  // 7. Link ASSY → jigs + transition jigs → IN_USE
  for (const jigId of jigIdList) {
    await db.insert(unitLinks).values({ parentUnitId: assyId, childUnitId: jigId, linkType: "BOUND_COMPONENT" });
    await db.update(units).set({ status: "IN_USE", updatedAt: new Date() }).where(eq(units.id, jigId));
  }

  return {
    unit_id: assyId,
    extra: {
      assy_id: assyId,
      variant_code: variantCode,
      variant_id: variantId,
      jigs_bound: jigIdList.length,
      status: "COMPONENTS_BOUND",
    },
  };
}

// ─── ASSEMBLY STEPS ─────────────────────────────────────
// Common logic for: PRESS_FIT_PIN430_DONE, PRESS_FIT_PIN300_DONE,
// DO_CRASH_STOP_DONE, PRESS_FIT_SHROUD_DONE.
//
// 1. Validate ASSY is COMPONENTS_BOUND or ASSEMBLY_IN_PROGRESS
// 2. Check if step already done (duplicate event check)
// 3. Find bound jig of required type
// 4. Deduct qty (120)
// 5. Transition ASSY → ASSEMBLY_IN_PROGRESS

const ASSY_QTY_PER_STEP = 120;

async function handleAssemblyStep(
  ctx: HandlerContext,
  jigType: string,
  eventType: string
): Promise<HandlerResult> {
  const assyId = ctx.payload.assy_id as string;
  if (!assyId) throw new DomainError("MISSING_ASSY_ID", "payload.assy_id required");

  // 1. Look up ASSY
  const [assy] = await db
    .select({
      id: units.id,
      unitType: units.unitType,
      status: units.status,
      variantId: units.variantId,
      modelRevisionId: units.modelRevisionId,
    })
    .from(units)
    .where(eq(units.id, assyId))
    .limit(1);

  if (!assy) throw new DomainError("UNIT_NOT_FOUND", `ASSY "${assyId}" not found`, 404);
  if (assy.unitType !== "ASSY_120") throw new DomainError("WRONG_UNIT_TYPE", `Expected ASSY_120`);
  
  const validStates = ["COMPONENTS_BOUND", "ASSEMBLY_IN_PROGRESS"];
  if (!validStates.includes(assy.status))
    throw new DomainError("INVALID_STATE_TRANSITION", `ASSY must be COMPONENTS_BOUND or ASSEMBLY_IN_PROGRESS (current: ${assy.status})`);

  const revisionId = assy.modelRevisionId ?? (ctx.payload.revision_id as string | undefined);
  if (!revisionId) throw new DomainError("REVISION_NOT_READY", "ASSY has no revision context");
  await ensureRevisionReady(revisionId);

  const stepDefinitions = await getRoutingStepsForRevision(revisionId);
  const stepDef = stepDefinitions.find((row) => row.stepCode === eventType);
  if (!stepDef) {
    throw new DomainError("INVALID_STATE_TRANSITION", `Step "${eventType}" is not configured in routing`);
  }
  if (stepDef.variantOnly && stepDef.variantOnly !== assy.variantId) {
    throw new DomainError("VARIANT_MISMATCH", `Step "${eventType}" not applicable for variant`);
  }

  // 2. Check for duplicate step
  // We check if an event of this type already exists for this unit
  // (Note: events table insert happens AFTER handler, but here we query existing)
  const [prev] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.unitId, assyId), eq(events.eventType, eventType)))
    .limit(1);

  if (prev) {
    // Already done. We can either block or return success (idempotent).
    // The requirement says "Prevent double consume", implies success-no-op or error.
    // Let's error to be explicit about "Double Scan" vs "Retry".
    // Or better: return success but don't deduct? No, domain rule usually implies stricter control.
    throw new DomainError("STEP_ALREADY_COMPLETED", `Step "${eventType}" already verified for this unit`);
  }

  // 3. Find bound jig
  // Join unit_links -> units where parent=assyId and type=jigType and linkType=BOUND_COMPONENT
  const [link] = await db
    .select({
      jigId: unitLinks.childUnitId,
      qtyRemaining: units.qtyRemaining,
    })
    .from(unitLinks)
    .innerJoin(units, eq(units.id, unitLinks.childUnitId))
    .where(
      and(
        eq(unitLinks.parentUnitId, assyId),
        eq(unitLinks.linkType, "BOUND_COMPONENT"),
        eq(units.unitType, jigType)
      )
    )
    .limit(1);

  if (!link) {
    // Special case: If checking SHROUD but variant is NO_SHROUD, we should have blocked earlier?
    // Actually, if client sends PRESS_FIT_SHROUD_DONE for NO_SHROUD, link won't exist.
    // We should treat this as "Step not applicable" or error.
    throw new DomainError(
      "JIG_NOT_BOUND",
      `No bound jig of type "${jigType}" found. variant mismatch?`
    );
  }

  if ((link.qtyRemaining ?? 0) < ASSY_QTY_PER_STEP) {
    throw new DomainError("INSUFFICIENT_QTY_REMAINING", `Jig has ${link.qtyRemaining}, need ${ASSY_QTY_PER_STEP}`);
  }

  // 4. Deduct qty
  await db
    .update(units)
    .set({
      qtyRemaining: (link.qtyRemaining ?? 0) - ASSY_QTY_PER_STEP,
      updatedAt: new Date(),
    })
    .where(eq(units.id, link.jigId));

  // 5. Transition ASSY → ASSEMBLY_IN_PROGRESS (if not already)
  if (assy.status !== "ASSEMBLY_IN_PROGRESS") {
    await db
      .update(units)
      .set({ status: "ASSEMBLY_IN_PROGRESS", updatedAt: new Date() })
      .where(eq(units.id, assyId));
  }

  return {
    unit_id: assyId,
    extra: {
      assy_id: assyId,
      step: eventType,
      jig_id: link.jigId,
      deducted_qty: ASSY_QTY_PER_STEP,
    },
  };
}

export const handlePressFitPin430 = (ctx: HandlerContext) =>
  handleAssemblyStep(ctx, "PIN430_JIG", "PRESS_FIT_PIN430_DONE");

export const handlePressFitPin300 = (ctx: HandlerContext) =>
  handleAssemblyStep(ctx, "PIN300_JIG", "PRESS_FIT_PIN300_DONE");

export const handleCrashStop = (ctx: HandlerContext) =>
  handleAssemblyStep(ctx, "CRASH_STOP_JIG", "CRASH_STOP_DONE");

export const handlePressFitShroud = (ctx: HandlerContext) =>
  handleAssemblyStep(ctx, "SHROUD_JIG", "PRESS_FIT_SHROUD_DONE");

export async function handleIonizerDone(ctx: HandlerContext): Promise<HandlerResult> {
  const assyId = ctx.payload.assy_id as string;
  if (!assyId) throw new DomainError("MISSING_ASSY_ID", "payload.assy_id required");

  const [assy] = await db
    .select({ id: units.id, unitType: units.unitType, status: units.status })
    .from(units)
    .where(eq(units.id, assyId))
    .limit(1);

  if (!assy) throw new DomainError("UNIT_NOT_FOUND", `ASSY "${assyId}" not found`, 404);
  if (assy.unitType !== "ASSY_120") throw new DomainError("WRONG_UNIT_TYPE", "Expected ASSY_120");
  if (!["COMPONENTS_BOUND", "ASSEMBLY_IN_PROGRESS"].includes(assy.status)) {
    throw new DomainError(
      "INVALID_STATE_TRANSITION",
      `ASSY must be COMPONENTS_BOUND or ASSEMBLY_IN_PROGRESS (current: ${assy.status})`
    );
  }

  if (assy.status !== "ASSEMBLY_IN_PROGRESS") {
    await db.update(units).set({ status: "ASSEMBLY_IN_PROGRESS", updatedAt: new Date() }).where(eq(units.id, assyId));
  }

  return { unit_id: assyId, extra: { assy_id: assyId, step: "IONIZER_DONE" } };
}

// ─── FVMI_PASS ──────────────────────────────────────────
// Transitions ASSY_120 from ASSEMBLY_IN_PROGRESS → ASSEMBLY_COMPLETED.
// Creates 6 FOF_TRAY_20 units.
// Links ASSY → Trays (SPLIT_INTO_TRAY).

const TRAYS_PER_ASSY = 6;

export async function handleFvmiPass(
  ctx: HandlerContext
): Promise<HandlerResult> {
  const assyId = ctx.payload.assy_id as string;
  if (!assyId) throw new DomainError("MISSING_ASSY_ID", "payload.assy_id required");

  // 1. Look up ASSY
  const [assy] = await db
    .select({
      id: units.id,
      unitType: units.unitType,
      status: units.status,
      machineId: units.machineId,
      lineCode: units.lineCode,
      modelRevisionId: units.modelRevisionId,
    })
    .from(units)
    .where(eq(units.id, assyId))
    .limit(1);

  if (!assy) throw new DomainError("UNIT_NOT_FOUND", `ASSY "${assyId}" not found`, 404);
  if (assy.unitType !== "ASSY_120") throw new DomainError("WRONG_UNIT_TYPE", `Expected ASSY_120`);
  
  // Strict state check: must be ASSEMBLY_IN_PROGRESS
  if (assy.status !== "ASSEMBLY_IN_PROGRESS")
    throw new DomainError("INVALID_STATE_TRANSITION", `ASSY must be ASSEMBLY_IN_PROGRESS (current: ${assy.status})`);

  const revisionId = assy.modelRevisionId ?? (ctx.payload.revision_id as string | undefined);
  if (!revisionId) throw new DomainError("REVISION_NOT_READY", "ASSY has no revision context");
  await ensureRevisionReady(revisionId);

  const stepDefinitions = await getRoutingStepsForRevision(revisionId);
  const requiredAssemblySteps = stepDefinitions
    .map((row) => row.stepCode)
    .filter((stepCode) => ASSEMBLY_ROUTING_EVENT_SET.has(stepCode));

  if (requiredAssemblySteps.length) {
    const doneRows = await db
      .select({ eventType: events.eventType })
      .from(events)
      .where(and(eq(events.unitId, assyId), sql`${events.eventType} IN ${requiredAssemblySteps}`));
    const doneSet = new Set(doneRows.map((row) => row.eventType));
    const missing = requiredAssemblySteps.filter((stepCode) => !doneSet.has(stepCode));
    if (missing.length) {
      throw new DomainError("INVALID_STATE_TRANSITION", `Missing required assembly steps: ${missing.join(", ")}`);
    }
  }

  // 2. Create 6 Trays
  const trayIds: string[] = [];
  const trayValues = Array.from({ length: TRAYS_PER_ASSY }).map(() => ({
    unitType: "FOF_TRAY_20",
    status: "CREATED",
    machineId: ctx.machineId ?? assy.machineId,
    lineCode: ctx.lineCode ?? assy.lineCode,
  }));

  const createdTrays = await db.insert(units).values(trayValues).returning({ id: units.id });
  
  for (const t of createdTrays) {
    trayIds.push(t.id);
  }

  // 3. Link ASSY → Trays
  for (const trayId of trayIds) {
    await db.insert(unitLinks).values({
      parentUnitId: assyId,
      childUnitId: trayId,
      linkType: "SPLIT_INTO_TRAY",
    });
  }

  // 4. Update ASSY status
  await db
    .update(units)
    .set({ status: "ASSEMBLY_COMPLETED", updatedAt: new Date() })
    .where(eq(units.id, assyId));

  return {
    unit_id: assyId,
    extra: {
      assy_id: assyId,
      status: "ASSEMBLY_COMPLETED",
      created_trays: trayIds,
      tray_count: trayIds.length,
    },
  };
}

// ─── SPLIT_GROUP_CREATED ────────────────────────────
// Triggers after labeling. 
// Input: 6 Trays (usually from an assy).
// Action: Creates 2 GROUP_60 units. Links 3 trays to each.

export async function handleSplitGroupCreated(
  ctx: HandlerContext
): Promise<HandlerResult> {
  // Option A: Pass assy_id, we find 6 trays. 
  // Option B: Pass 6 tray_ids explicitly.
  // Let's support assy_id as primary for convenience.
  
  const assyId = ctx.payload.assy_id as string;
  let trays: { id: string, status: string }[] = [];

  if (assyId) {
    const linked = await db
      .select({ id: unitLinks.childUnitId })
      .from(unitLinks)
      .where(and(eq(unitLinks.parentUnitId, assyId), eq(unitLinks.linkType, "SPLIT_INTO_TRAY")));
    
    // Fetch full units to check status
    if (linked.length > 0) {
      trays = await db
        .select({ id: units.id, status: units.status })
        .from(units)
        .where(
          sql`${units.id} IN ${linked.map(l => l.id)}`
        );
    }
  } else if (Array.isArray(ctx.payload.tray_ids)) {
    const trayIds = (ctx.payload.tray_ids as unknown[]).filter((id): id is string => typeof id === "string");
    const uniqueTrayIds = Array.from(new Set(trayIds));
    if (uniqueTrayIds.length !== 6) {
      throw new DomainError("INVALID_TRAY_COUNT", `payload.tray_ids must contain 6 unique tray ids, found ${uniqueTrayIds.length}`);
    }

    trays = await db
      .select({ id: units.id, status: units.status })
      .from(units)
      .where(sql`${units.id} IN ${uniqueTrayIds}`);
  } else {
     throw new DomainError("MISSING_INPUT", "payload.assy_id required");
  }

  if (trays.length !== 6) {
    throw new DomainError("INVALID_TRAY_COUNT", `Expected 6 trays, found ${trays.length}`);
  }

  // Validate state
  const invalidTray = trays.find(t => t.status !== "LABELED");
  if (invalidTray) {
    throw new DomainError("INVALID_STATE_TRANSITION", `Tray ${invalidTray.id} is ${invalidTray.status}, expected LABELED`);
  }

  // Create 2 Groups
  // Group 1: Trays 0,1,2
  // Group 2: Trays 3,4,5
  // We assume order doesn't strictly matter for grouping unless specified.
  
  const group1Trays = trays.slice(0, 3);
  const group2Trays = trays.slice(3, 6);
  
  const createdGroups: string[] = [];

  // Helper to create group
  const createGroup = async (groupTrays: typeof trays) => {
    const [group] = await db.insert(units).values({
      unitType: "GROUP_60",
      status: "CREATED",
      machineId: ctx.machineId,
      lineCode: ctx.lineCode
    }).returning({ id: units.id });

    for (const t of groupTrays) {
      await db.insert(unitLinks).values({
        parentUnitId: group.id,
        childUnitId: t.id,
        linkType: "SPLIT_INTO_GROUP"
      });
      await db.update(units).set({ status: "IN_GROUP", updatedAt: new Date() }).where(eq(units.id, t.id));
    }
    return group.id;
  };

  const g1 = await createGroup(group1Trays);
  const g2 = await createGroup(group2Trays);

  return {
    extra: {
      generated_groups: [g1, g2],
      group_1_trays: group1Trays.map(t => t.id),
      group_2_trays: group2Trays.map(t => t.id)
    }
  };
}


// ─── OUTER_PACKED ───────────────────────────────────
// Triggers when a Group (3 trays) is packed into an Outer box.
// Input: group_id.
// Action: Create OUTER unit, link Group -> Outer.

export async function handleOuterPacked(
  ctx: HandlerContext
): Promise<HandlerResult> {
  const groupId = ctx.payload.group_id as string;
  if (!groupId) throw new DomainError("MISSING_GROUP_ID", "payload.group_id required");

  // 1. Look up Group
  const [group] = await db
    .select({
      id: units.id,
      unitType: units.unitType,
      status: units.status,
      machineId: units.machineId,
      lineCode: units.lineCode,
    })
    .from(units)
    .where(eq(units.id, groupId))
    .limit(1);

  if (!group) throw new DomainError("UNIT_NOT_FOUND", `Group "${groupId}" not found`, 404);
  if (group.unitType !== "GROUP_60") throw new DomainError("WRONG_UNIT_TYPE", `Expected GROUP_60`);
  if (group.status !== "CREATED")
    throw new DomainError("INVALID_STATE_TRANSITION", `Group must be CREATED (current: ${group.status})`);

  // 2. Create Outer Unit
  const [outer] = await db
    .insert(units)
    .values({
      unitType: "OUTER",
      status: "CREATED",
      machineId: ctx.machineId ?? group.machineId,
      lineCode: ctx.lineCode ?? group.lineCode,
    })
    .returning({ id: units.id });

  // 3. Link Group → Outer
  await db.insert(unitLinks).values({
    parentUnitId: outer.id,
    childUnitId: group.id,
    linkType: "PACKED_INTO",
  });

  // 4. Update Group status
  await db
    .update(units)
    .set({ status: "PACKED", updatedAt: new Date() })
    .where(eq(units.id, group.id));

  // 5. Update Trays status (optional but good for query speed)
  // Find trays in this group
  const trays = await db
    .select({ id: unitLinks.childUnitId })
    .from(unitLinks)
    .where(and(eq(unitLinks.parentUnitId, group.id), eq(unitLinks.linkType, "SPLIT_INTO_GROUP")));

  if (trays.length > 0) {
     await db
       .update(units)
       .set({ status: "PACKED", updatedAt: new Date() })
       .where(sql`${units.id} IN ${trays.map(t => t.id)}`);
  }

  return {
    unit_id: outer.id,
    extra: {
      outer_id: outer.id,
      group_id: group.id,
      status: "CREATED",
    },
  };
}


// ─── FG_PALLET_MAPPED ───────────────────────────────
// Triggers when Outers are placed on a Pallet.
// Input: List of outer_ids.
// Action: Create PALLET unit, link Outers -> Pallet.

export async function handleFgPalletMapped(
  ctx: HandlerContext
): Promise<HandlerResult> {
  const outerIds = ctx.payload.outer_ids as string[];
  if (!outerIds || !Array.isArray(outerIds) || outerIds.length === 0) {
    throw new DomainError("MISSING_OUTER_IDS", "payload.outer_ids (array) required");
  }

  // 1. Validate Outers
  const outers = await db
    .select({
      id: units.id,
      unitType: units.unitType,
      status: units.status,
      machineId: units.machineId,
      lineCode: units.lineCode,
    })
    .from(units)
    .where(sql`${units.id} IN ${outerIds}`);

  if (outers.length !== outerIds.length) {
    throw new DomainError("UNIT_NOT_FOUND", `Found ${outers.length} outers, expected ${outerIds.length}`);
  }

  const invalidOuter = outers.find(o => o.unitType !== "OUTER" || o.status !== "CREATED");
  if (invalidOuter) {
    throw new DomainError("INVALID_STATE_TRANSITION",
      `Outer "${invalidOuter.id}" is ${invalidOuter.unitType}:${invalidOuter.status}, expected OUTER:CREATED`);
  }

  // 2. Create Pallet
  const [pallet] = await db
    .insert(units)
    .values({
      unitType: "PALLET",
      status: "CREATED",
      machineId: ctx.machineId ?? outers[0].machineId,
      lineCode: ctx.lineCode ?? outers[0].lineCode,
    })
    .returning({ id: units.id });

  // 3. Link Outers -> Pallet
  for (const o of outers) {
    await db.insert(unitLinks).values({
      parentUnitId: pallet.id,
      childUnitId: o.id,
      linkType: "PALLETIZED",
    });
  }

  // 4. Update Outers status
  await db
    .update(units)
    .set({ status: "ON_PALLET", updatedAt: new Date() })
    .where(sql`${units.id} IN ${outerIds}`);

  return {
    unit_id: pallet.id,
    extra: {
      pallet_id: pallet.id,
      outer_count: outerIds.length,
      status: "CREATED",
    },
  };
}

// ─── Additional catalog handlers (Phase B completion) ───────────────

export async function handleDispatchCreated(ctx: HandlerContext): Promise<HandlerResult> {
  const dispatchCode = (ctx.payload.dispatch_code as string) ?? null;
  const [dispatch] = await db
    .insert(units)
    .values({
      unitType: "DISPATCH_CARD",
      status: "CREATED",
      machineId: ctx.machineId,
      lineCode: ctx.lineCode,
      batchRef: dispatchCode,
    })
    .returning({ id: units.id });

  return { unit_id: dispatch.id, extra: { dispatch_id: dispatch.id, status: "CREATED" } };
}

export async function handleDispatchConfirmed(ctx: HandlerContext): Promise<HandlerResult> {
  const dispatchId = ctx.payload.dispatch_id as string;
  if (!dispatchId) throw new DomainError("MISSING_DISPATCH_ID", "payload.dispatch_id required");

  const [dispatch] = await db
    .select({ id: units.id, unitType: units.unitType, status: units.status })
    .from(units)
    .where(eq(units.id, dispatchId))
    .limit(1);
  if (!dispatch) throw new DomainError("UNIT_NOT_FOUND", `Dispatch "${dispatchId}" not found`, 404);
  if (dispatch.unitType !== "DISPATCH_CARD") throw new DomainError("WRONG_UNIT_TYPE", "Expected DISPATCH_CARD");
  if (dispatch.status !== "CREATED")
    throw new DomainError("INVALID_STATE_TRANSITION", `Dispatch must be CREATED (current: ${dispatch.status})`);

  await db.update(units).set({ status: "CONFIRMED", updatedAt: new Date() }).where(eq(units.id, dispatchId));
  return { unit_id: dispatchId, extra: { dispatch_id: dispatchId, status: "CONFIRMED" } };
}

export async function handleDispatchReturned(ctx: HandlerContext): Promise<HandlerResult> {
  const dispatchId = ctx.payload.dispatch_id as string;
  if (!dispatchId) throw new DomainError("MISSING_DISPATCH_ID", "payload.dispatch_id required");

  const [dispatch] = await db
    .select({ id: units.id, unitType: units.unitType, status: units.status })
    .from(units)
    .where(eq(units.id, dispatchId))
    .limit(1);
  if (!dispatch) throw new DomainError("UNIT_NOT_FOUND", `Dispatch "${dispatchId}" not found`, 404);
  if (dispatch.unitType !== "DISPATCH_CARD") throw new DomainError("WRONG_UNIT_TYPE", "Expected DISPATCH_CARD");

  await db.update(units).set({ status: "RETURNED", updatedAt: new Date() }).where(eq(units.id, dispatchId));
  return { unit_id: dispatchId, extra: { dispatch_id: dispatchId, status: "RETURNED" } };
}

export async function handleWash1Start(ctx: HandlerContext): Promise<HandlerResult> {
  const plateId = ctx.payload.plate_id as string;
  if (!plateId) throw new DomainError("MISSING_PLATE_ID", "payload.plate_id required");
  const [plate] = await db
    .select({ id: units.id, unitType: units.unitType, status: units.status })
    .from(units)
    .where(eq(units.id, plateId))
    .limit(1);
  if (!plate) throw new DomainError("UNIT_NOT_FOUND", `Plate "${plateId}" not found`, 404);
  if (plate.unitType !== "PLATE_120") throw new DomainError("WRONG_UNIT_TYPE", "Expected PLATE_120");
  if (plate.status !== "CREATED")
    throw new DomainError("INVALID_STATE_TRANSITION", `Plate must be CREATED (current: ${plate.status})`);

  await db.update(units).set({ status: "WASH1_IN_PROGRESS", updatedAt: new Date() }).where(eq(units.id, plateId));
  return { unit_id: plateId, extra: { plate_id: plateId, status: "WASH1_IN_PROGRESS" } };
}

export async function handleBondingPlateScanned(ctx: HandlerContext): Promise<HandlerResult> {
  const plateId = ctx.payload.plate_id as string;
  if (!plateId) throw new DomainError("MISSING_PLATE_ID", "payload.plate_id required");
  const [plate] = await db
    .select({ id: units.id, unitType: units.unitType, status: units.status })
    .from(units)
    .where(eq(units.id, plateId))
    .limit(1);
  if (!plate) throw new DomainError("UNIT_NOT_FOUND", `Plate "${plateId}" not found`, 404);
  if (plate.unitType !== "PLATE_120") throw new DomainError("WRONG_UNIT_TYPE", "Expected PLATE_120");
  if (plate.status !== "WASHED")
    throw new DomainError("COMPONENT_NOT_WASHED", `Plate must be WASHED (current: ${plate.status})`);
  return { unit_id: plateId, extra: { plate_id: plateId, validated: true } };
}

export async function handleMagnetPrepared(ctx: HandlerContext): Promise<HandlerResult> {
  const qtyTotal = Math.max(1, Number(ctx.payload.qty_total ?? 120));
  const [pack] = await db
    .insert(units)
    .values({
      unitType: "MAG_PACK",
      status: "CREATED",
      machineId: ctx.machineId,
      lineCode: ctx.lineCode,
      batchRef: (ctx.payload.batch_ref as string) ?? null,
      qtyTotal,
      qtyRemaining: qtyTotal,
    })
    .returning({ id: units.id });

  return { unit_id: pack.id, extra: { magnet_pack_id: pack.id, qty_total: qtyTotal } };
}

export async function handleBondingMagnetScanned(ctx: HandlerContext): Promise<HandlerResult> {
  const magnetPackId = ctx.payload.magnet_pack_id as string;
  if (!magnetPackId) throw new DomainError("MISSING_MAGNET_PACK_ID", "payload.magnet_pack_id required");
  await resolveMagnetPackSource(magnetPackId);
  return { unit_id: magnetPackId, extra: { magnet_pack_id: magnetPackId, validated: true } };
}

export async function handleMagnetCardReturned(ctx: HandlerContext): Promise<HandlerResult> {
  const magnetPackId = ctx.payload.magnet_pack_id as string;
  if (!magnetPackId) throw new DomainError("MISSING_MAGNET_PACK_ID", "payload.magnet_pack_id required");
  const [pack] = await db
    .select({ id: units.id, unitType: units.unitType })
    .from(units)
    .where(eq(units.id, magnetPackId))
    .limit(1);
  if (!pack) throw new DomainError("UNIT_NOT_FOUND", `Magnet pack "${magnetPackId}" not found`, 404);
  if (pack.unitType !== "MAG_PACK" && pack.unitType !== "SUPPLIER_PACK")
    throw new DomainError("WRONG_UNIT_TYPE", "Expected MAG_PACK or SUPPLIER_PACK");
  await db.update(units).set({ status: "RETURNED", updatedAt: new Date() }).where(eq(units.id, magnetPackId));
  return { unit_id: magnetPackId, extra: { magnet_pack_id: magnetPackId, status: "RETURNED" } };
}

export async function handleWash2Start(ctx: HandlerContext): Promise<HandlerResult> {
  const jigId = ctx.payload.jig_id as string;
  if (!jigId) throw new DomainError("MISSING_JIG_ID", "payload.jig_id required");
  const [jig] = await db
    .select({ id: units.id, unitType: units.unitType, status: units.status })
    .from(units)
    .where(eq(units.id, jigId))
    .limit(1);
  if (!jig) throw new DomainError("UNIT_NOT_FOUND", `Jig "${jigId}" not found`, 404);
  if (!jig.unitType.includes("JIG")) throw new DomainError("WRONG_UNIT_TYPE", "Expected JIG variant");
  if (!["LOADED", "IN_USE"].includes(jig.status))
    throw new DomainError("INVALID_STATE_TRANSITION", `Jig must be LOADED/IN_USE (current: ${jig.status})`);
  await db.update(units).set({ status: "WASH2_IN_PROGRESS", updatedAt: new Date() }).where(eq(units.id, jigId));
  return { unit_id: jigId, extra: { jig_id: jigId, status: "WASH2_IN_PROGRESS" } };
}

export async function handleJigReturned(ctx: HandlerContext): Promise<HandlerResult> {
  const jigId = ctx.payload.jig_id as string;
  if (!jigId) throw new DomainError("MISSING_JIG_ID", "payload.jig_id required");
  const [jig] = await db
    .select({ id: units.id, unitType: units.unitType })
    .from(units)
    .where(eq(units.id, jigId))
    .limit(1);
  if (!jig) throw new DomainError("UNIT_NOT_FOUND", `Jig "${jigId}" not found`, 404);
  if (!jig.unitType.includes("JIG")) throw new DomainError("WRONG_UNIT_TYPE", "Expected JIG variant");
  await db.update(units).set({ status: "WASH2_COMPLETED", updatedAt: new Date() }).where(eq(units.id, jigId));
  return { unit_id: jigId, extra: { jig_id: jigId, status: "WASH2_COMPLETED" } };
}

export async function handleBondingStart(ctx: HandlerContext): Promise<HandlerResult> {
  const plateId = ctx.payload.plate_id as string;
  const magnetPackId = ctx.payload.magnet_pack_id as string;
  if (!plateId) throw new DomainError("MISSING_PLATE_ID", "payload.plate_id required");
  if (!magnetPackId) throw new DomainError("MISSING_MAGNET_PACK_ID", "payload.magnet_pack_id required");
  await handleBondingPlateScanned({ ...ctx, payload: { plate_id: plateId } });
  await handleBondingMagnetScanned({ ...ctx, payload: { magnet_pack_id: magnetPackId } });
  return { extra: { plate_id: plateId, magnet_pack_id: magnetPackId, validated: true } };
}

async function transitionAssy(assyId: string, from: string[], to: string): Promise<void> {
  const [assy] = await db
    .select({ id: units.id, unitType: units.unitType, status: units.status })
    .from(units)
    .where(eq(units.id, assyId))
    .limit(1);
  if (!assy) throw new DomainError("UNIT_NOT_FOUND", `ASSY "${assyId}" not found`, 404);
  if (assy.unitType !== "ASSY_120") throw new DomainError("WRONG_UNIT_TYPE", "Expected ASSY_120");
  if (!from.includes(assy.status))
    throw new DomainError("INVALID_STATE_TRANSITION", `ASSY must be ${from.join(" or ")} (current: ${assy.status})`);
  await db.update(units).set({ status: to, updatedAt: new Date() }).where(eq(units.id, assyId));
}

async function ensureAssyRevisionContext(
  assyId: string,
  fallbackRevisionId?: string
): Promise<void> {
  const [assy] = await db
    .select({ id: units.id, modelRevisionId: units.modelRevisionId })
    .from(units)
    .where(eq(units.id, assyId))
    .limit(1);

  if (!assy) throw new DomainError("UNIT_NOT_FOUND", `ASSY "${assyId}" not found`, 404);

  const revisionId = assy.modelRevisionId ?? fallbackRevisionId;
  if (!revisionId) throw new DomainError("REVISION_NOT_READY", "ASSY has no revision context");

  await ensureRevisionReady(revisionId);

  if (!assy.modelRevisionId) {
    await db.update(units).set({ modelRevisionId: revisionId, updatedAt: new Date() }).where(eq(units.id, assyId));
  }
}

export async function handleMagnetizeDone(ctx: HandlerContext): Promise<HandlerResult> {
  const assyId = ctx.payload.assy_id as string;
  if (!assyId) throw new DomainError("MISSING_ASSY_ID", "payload.assy_id required");
  await ensureAssyRevisionContext(assyId, ctx.payload.revision_id as string | undefined);
  await transitionAssy(assyId, ["CREATED", "WASH2_DONE"], "MAG_DONE");
  return { unit_id: assyId, extra: { assy_id: assyId, status: "MAG_DONE" } };
}

export async function handleFluxPass(ctx: HandlerContext): Promise<HandlerResult> {
  const assyId = ctx.payload.assy_id as string;
  if (!assyId) throw new DomainError("MISSING_ASSY_ID", "payload.assy_id required");
  await ensureAssyRevisionContext(assyId, ctx.payload.revision_id as string | undefined);
  await transitionAssy(assyId, ["MAG_DONE"], "FLUX_PASS");
  return { unit_id: assyId, extra: { assy_id: assyId, status: "FLUX_PASS" } };
}

export async function handleFluxFail(ctx: HandlerContext): Promise<HandlerResult> {
  const assyId = ctx.payload.assy_id as string;
  if (!assyId) throw new DomainError("MISSING_ASSY_ID", "payload.assy_id required");
  await ensureAssyRevisionContext(assyId, ctx.payload.revision_id as string | undefined);
  await transitionAssy(assyId, ["MAG_DONE"], "HOLD");
  return { unit_id: assyId, extra: { assy_id: assyId, status: "HOLD" } };
}

export async function handleFvmiFail(ctx: HandlerContext): Promise<HandlerResult> {
  const assyId = ctx.payload.assy_id as string;
  if (!assyId) throw new DomainError("MISSING_ASSY_ID", "payload.assy_id required");
  await ensureAssyRevisionContext(assyId, ctx.payload.revision_id as string | undefined);
  await transitionAssy(assyId, ["ASSEMBLY_IN_PROGRESS"], "HOLD");
  return { unit_id: assyId, extra: { assy_id: assyId, status: "HOLD" } };
}

export async function handleLabelGenerateRequest(ctx: HandlerContext): Promise<HandlerResult> {
  const assyId = ctx.payload.assy_id as string;
  if (!assyId) throw new DomainError("MISSING_ASSY_ID", "payload.assy_id required");
  const [assy] = await db
    .select({ id: units.id, unitType: units.unitType, status: units.status })
    .from(units)
    .where(eq(units.id, assyId))
    .limit(1);
  if (!assy) throw new DomainError("UNIT_NOT_FOUND", `ASSY "${assyId}" not found`, 404);
  if (assy.unitType !== "ASSY_120") throw new DomainError("WRONG_UNIT_TYPE", "Expected ASSY_120");
  if (assy.status !== "ASSEMBLY_COMPLETED")
    throw new DomainError("INVALID_STATE_TRANSITION", `ASSY must be ASSEMBLY_COMPLETED (current: ${assy.status})`);
  await ensureAssyRevisionContext(assyId, ctx.payload.revision_id as string | undefined);
  return { unit_id: assyId, extra: { assy_id: assyId, ready: true } };
}

export async function handleLabelsGenerated(ctx: HandlerContext): Promise<HandlerResult> {
  const assyId = ctx.payload.assy_id as string;
  if (!assyId) throw new DomainError("MISSING_ASSY_ID", "payload.assy_id required");

  const trays = await db
    .select({ id: unitLinks.childUnitId })
    .from(unitLinks)
    .where(and(eq(unitLinks.parentUnitId, assyId), eq(unitLinks.linkType, "SPLIT_INTO_TRAY")));

  if (trays.length !== 6) {
    throw new DomainError("INVALID_STATE_TRANSITION", `Expected 6 trays for ASSY "${assyId}", got ${trays.length}`);
  }

  await db.update(units).set({ status: "LABELED", updatedAt: new Date() }).where(eq(units.id, assyId));
  await db.update(units).set({ status: "LABELED", updatedAt: new Date() }).where(sql`${units.id} IN ${trays.map((t) => t.id)}`);
  return { unit_id: assyId, extra: { assy_id: assyId, tray_count: trays.length, status: "LABELED" } };
}


// ─── Handler registry ───────────────────────────────────

export const EVENT_HANDLERS: Record<string, (ctx: HandlerContext) => Promise<HandlerResult>> = {
  // Dispatch
  DISPATCH_CREATED: handleDispatchCreated,
  DISPATCH_CONFIRMED: handleDispatchConfirmed,
  DISPATCH_RETURNED: handleDispatchReturned,
  // Plate + magnet prechecks
  PLATE_LOADED: handlePlateLoaded,
  WASH1_START: handleWash1Start,
  WASH1_END: handleWash1End,
  BONDING_PLATE_SCANNED: handleBondingPlateScanned,
  MAGNET_PREPARED: handleMagnetPrepared,
  BONDING_MAGNET_SCANNED: handleBondingMagnetScanned,
  MAGNET_CARD_RETURNED: handleMagnetCardReturned,
  WASH2_START: handleWash2Start,
  BONDING_END: handleBondingEnd,
  BONDING_START: handleBondingStart,
  JIG_LOADED: handleJigLoaded,
  WASH2_END: handleWash2End,
  JIG_RETURNED: handleJigReturned,
  MAGNETIZE_DONE: handleMagnetizeDone,
  FLUX_PASS: handleFluxPass,
  FLUX_FAIL: handleFluxFail,
  ASSY_BIND_COMPONENTS: handleAssyBindComponents,
  // Assembly steps
  PRESS_FIT_PIN430_DONE: handlePressFitPin430,
  PRESS_FIT_PIN300_DONE: handlePressFitPin300,
  PRESS_FIT_SHROUD_DONE: handlePressFitShroud,
  CRASH_STOP_DONE: handleCrashStop,
  IONIZER_DONE: handleIonizerDone,
  // FVMI
  FVMI_PASS: handleFvmiPass,
  FVMI_FAIL: handleFvmiFail,
  // Labeling
  LABEL_GENERATE_REQUEST: handleLabelGenerateRequest,
  LABELS_GENERATED: handleLabelsGenerated,
  // Packaging
  SPLIT_GROUP_CREATED: handleSplitGroupCreated,
  OUTER_PACKED: handleOuterPacked,
  FG_PALLET_MAPPED: handleFgPalletMapped,
};
