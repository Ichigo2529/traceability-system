import { Elysia, t } from "elysia";
import { db } from "../db/connection";
import { ok, fail } from "../lib/http";
import { units, unitLinks, events } from "../db/schema/production";
import { inventoryDo, supplierPacks, suppliers } from "../db/schema/inventory";
import { consumption, setRuns, containers } from "../db/schema/genealogy";
import { eq, inArray, sql } from "drizzle-orm";

async function traceByUnitId(id: string, expectedType: string) {
  const [unit] = await db.select().from(units).where(eq(units.id, id)).limit(1);

  if (!unit) {
    return {
      status: 404 as const,
      body: fail(`${expectedType}_NOT_FOUND`, `${expectedType} not found`),
    };
  }

  if (unit.unitType !== expectedType) {
    return {
      status: 409 as const,
      body: fail("UNIT_TYPE_MISMATCH", `Expected ${expectedType}, got ${unit.unitType}`),
    };
  }

  const upstreamQuery = sql`
    WITH RECURSIVE upstream_tree AS (
      SELECT ul.parent_unit_id, ul.child_unit_id, ul.link_type, 1 as depth
      FROM unit_links ul
      WHERE ul.child_unit_id = ${id}
      UNION ALL
      SELECT ul.parent_unit_id, ul.child_unit_id, ul.link_type, ut.depth + 1
      FROM unit_links ul
      INNER JOIN upstream_tree ut ON ul.child_unit_id = ut.parent_unit_id
    )
    SELECT 
      ut.depth, ut.link_type, 'UPSTREAM' as direction,
      p.id as related_id, p.unit_type as related_type, p.status as related_status
    FROM upstream_tree ut
    JOIN units p ON p.id = ut.parent_unit_id
  `;

  const downstreamQuery = sql`
    WITH RECURSIVE downstream_tree AS (
      SELECT ul.parent_unit_id, ul.child_unit_id, ul.link_type, 1 as depth
      FROM unit_links ul
      WHERE ul.parent_unit_id = ${id}
      UNION ALL
      SELECT ul.parent_unit_id, ul.child_unit_id, ul.link_type, dt.depth + 1
      FROM unit_links ul
      INNER JOIN downstream_tree dt ON ul.parent_unit_id = dt.child_unit_id
    )
    SELECT 
      dt.depth, dt.link_type, 'DOWNSTREAM' as direction,
      c.id as related_id, c.unit_type as related_type, c.status as related_status
    FROM downstream_tree dt
    JOIN units c ON c.id = dt.child_unit_id
  `;

  const [upstream, downstream, unitEvents] = await Promise.all([
    db.execute(upstreamQuery),
    db.execute(downstreamQuery),
    db.select().from(events).where(eq(events.unitId, id)).orderBy(events.receivedAtServer),
  ]);

  const upstreamRows = upstream as unknown as Array<{ related_id: string; related_type: string }>;
  const supplierPackUnitIds = upstreamRows.filter((r) => r.related_type === "SUPPLIER_PACK").map((r) => r.related_id);

  const materialOrigins = supplierPackUnitIds.length
    ? await db
        .select({
          supplier_pack_id: supplierPacks.id,
          supplier_pack_unit_id: supplierPacks.unitId,
          part_number: supplierPacks.partNumber,
          supplier_lot: supplierPacks.supplierLot,
          pack_barcode_raw: supplierPacks.packBarcodeRaw,
          do_id: supplierPacks.doId,
          do_number: inventoryDo.doNumber,
          supplier_id: supplierPacks.supplierId,
          supplier_code: suppliers.code,
          supplier_name: suppliers.name,
        })
        .from(supplierPacks)
        .leftJoin(inventoryDo, eq(inventoryDo.id, supplierPacks.doId))
        .leftJoin(suppliers, eq(suppliers.id, supplierPacks.supplierId))
        .where(inArray(supplierPacks.unitId, supplierPackUnitIds))
    : [];

  return {
    status: 200 as const,
    body: ok({
      unit,
      genealogy: {
        upstream,
        downstream,
      },
      material_origins: materialOrigins,
      events: unitEvents,
    }),
  };
}

export const traceRoutes = new Elysia({ prefix: "/trace" })
  .get(
    "/tray/:id",
    async ({ params, set }) => {
      const result = await traceByUnitId(params.id, "FOF_TRAY_20");
      set.status = result.status;
      return result.body;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .get(
    "/outer/:id",
    async ({ params, set }) => {
      const result = await traceByUnitId(params.id, "OUTER");
      set.status = result.status;
      return result.body;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .get(
    "/pallet/:id",
    async ({ params, set }) => {
      const result = await traceByUnitId(params.id, "PALLET");
      set.status = result.status;
      return result.body;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // ─── Backward Trace: all consumed materials for a set_run ──
  .get(
    "/backward/:setId",
    async ({ params, set }) => {
      const [setRun] = await db.select().from(setRuns).where(eq(setRuns.id, params.setId)).limit(1);

      if (!setRun) {
        set.status = 404;
        return fail("SET_RUN_NOT_FOUND", "Set run not found");
      }

      // Get all consumption records for this set_run
      const consumptionRows = await db
        .select({
          id: consumption.id,
          qty: consumption.qty,
          sourceType: consumption.sourceType,
          sourceUid: consumption.sourceUid,
          stepCode: consumption.stepCode,
          consumedAt: consumption.consumedAt,
        })
        .from(consumption)
        .where(eq(consumption.setRunId, params.setId))
        .orderBy(consumption.consumedAt);

      // Get locked containers
      const containerRows = await db
        .select({
          id: containers.id,
          containerType: containers.containerType,
          unitId: containers.unitId,
        })
        .from(containers)
        .where(eq(containers.setRunId, params.setId));

      // Enrich supplier pack sources with origin data
      const supplierPackSourceIds = consumptionRows
        .filter((r) => r.sourceType === "SUPPLIER_PACK")
        .map((r) => r.sourceUid);

      const materialOrigins = supplierPackSourceIds.length
        ? await db
            .select({
              unit_id: supplierPacks.unitId,
              part_number: supplierPacks.partNumber,
              supplier_lot: supplierPacks.supplierLot,
              pack_barcode_raw: supplierPacks.packBarcodeRaw,
              do_number: inventoryDo.doNumber,
              supplier_code: suppliers.code,
              supplier_name: suppliers.name,
            })
            .from(supplierPacks)
            .leftJoin(inventoryDo, eq(inventoryDo.id, supplierPacks.doId))
            .leftJoin(suppliers, eq(suppliers.id, supplierPacks.supplierId))
            .where(inArray(supplierPacks.unitId, supplierPackSourceIds))
        : [];

      return ok({
        set_run: setRun,
        consumption: consumptionRows,
        containers: containerRows,
        material_origins: materialOrigins,
      });
    },
    {
      params: t.Object({
        setId: t.String(),
      }),
    }
  )

  // ─── Forward Trace: all set_runs that consumed from a pack ──
  .get(
    "/forward/:packUid",
    async ({ params, set }) => {
      // Verify pack exists
      const [pack] = await db
        .select({
          id: units.id,
          unitType: units.unitType,
          status: units.status,
        })
        .from(units)
        .where(eq(units.id, params.packUid))
        .limit(1);

      if (!pack) {
        set.status = 404;
        return fail("PACK_NOT_FOUND", "Pack not found");
      }

      // Get all consumption records where this pack was consumed
      const consumptionRows = await db
        .select({
          id: consumption.id,
          setRunId: consumption.setRunId,
          qty: consumption.qty,
          stepCode: consumption.stepCode,
          consumedAt: consumption.consumedAt,
        })
        .from(consumption)
        .where(eq(consumption.sourceUid, params.packUid))
        .orderBy(consumption.consumedAt);

      // Get the set_runs for those consumption records
      const setRunIds = [...new Set(consumptionRows.map((r) => r.setRunId))];
      const setRunRows = setRunIds.length
        ? await db
            .select({
              id: setRuns.id,
              setCode: setRuns.setCode,
              status: setRuns.status,
              assyUnitId: setRuns.assyUnitId,
              startedAt: setRuns.startedAt,
              endedAt: setRuns.endedAt,
            })
            .from(setRuns)
            .where(inArray(setRuns.id, setRunIds))
        : [];

      // Get supplier pack details
      const [supplierPack] = await db
        .select({
          pack_qty_total: supplierPacks.packQtyTotal,
          pack_qty_remaining: supplierPacks.packQtyRemaining,
          part_number: supplierPacks.partNumber,
          supplier_lot: supplierPacks.supplierLot,
        })
        .from(supplierPacks)
        .where(eq(supplierPacks.unitId, params.packUid))
        .limit(1);

      const totalConsumed = consumptionRows.reduce((sum, r) => sum + r.qty, 0);

      return ok({
        pack: {
          unit_id: pack.id,
          unit_type: pack.unitType,
          status: pack.status,
          ...(supplierPack ?? {}),
        },
        total_consumed: totalConsumed,
        consumption: consumptionRows,
        set_runs: setRunRows,
      });
    },
    {
      params: t.Object({
        packUid: t.String(),
      }),
    }
  )

  // ─── Fast Trace: by unit id (any type) ─────────────────
  .get(
    "/unit/:id",
    async ({ params, set }) => {
      const [unit] = await db
        .select({
          id: units.id,
          unitType: units.unitType,
          status: units.status,
          machineId: units.machineId,
          lineCode: units.lineCode,
          batchRef: units.batchRef,
          qtyTotal: units.qtyTotal,
          qtyRemaining: units.qtyRemaining,
          createdAt: units.createdAt,
          updatedAt: units.updatedAt,
        })
        .from(units)
        .where(eq(units.id, params.id))
        .limit(1);

      if (!unit) {
        set.status = 404;
        return fail("UNIT_NOT_FOUND", "Unit not found");
      }

      // Parent links (who produced this unit)
      const parentLinks = await db
        .select({
          linkType: unitLinks.linkType,
          parentUnitId: unitLinks.parentUnitId,
        })
        .from(unitLinks)
        .where(eq(unitLinks.childUnitId, params.id));

      // Child links (what was produced from this unit)
      const childLinks = await db
        .select({
          linkType: unitLinks.linkType,
          childUnitId: unitLinks.childUnitId,
        })
        .from(unitLinks)
        .where(eq(unitLinks.parentUnitId, params.id));

      // Set_runs where this unit is the assy
      const relatedSetRuns = await db
        .select({
          id: setRuns.id,
          setCode: setRuns.setCode,
          status: setRuns.status,
          startedAt: setRuns.startedAt,
          endedAt: setRuns.endedAt,
        })
        .from(setRuns)
        .where(eq(setRuns.assyUnitId, params.id));

      // Consumption records where this unit was consumed
      const consumptionRows = await db
        .select({
          id: consumption.id,
          setRunId: consumption.setRunId,
          qty: consumption.qty,
          stepCode: consumption.stepCode,
          consumedAt: consumption.consumedAt,
        })
        .from(consumption)
        .where(eq(consumption.sourceUid, params.id))
        .orderBy(consumption.consumedAt);

      // Event timeline
      const eventRows = await db
        .select({
          id: events.id,
          eventType: events.eventType,
          createdAt: events.receivedAtServer,
        })
        .from(events)
        .where(eq(events.unitId, params.id))
        .orderBy(events.receivedAtServer);

      return ok({
        unit,
        parent_links: parentLinks,
        child_links: childLinks,
        set_runs: relatedSetRuns,
        consumption: consumptionRows,
        events: eventRows,
      });
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // ─── Fast Trace: by supplier lot ──────────────────────
  .get(
    "/material/:lot",
    async ({ params, set }) => {
      // Find all supplier packs with this lot number
      const packs = await db
        .select({
          id: supplierPacks.id,
          unitId: supplierPacks.unitId,
          partNumber: supplierPacks.partNumber,
          supplierLot: supplierPacks.supplierLot,
          packQtyTotal: supplierPacks.packQtyTotal,
          packQtyRemaining: supplierPacks.packQtyRemaining,
          doNumber: inventoryDo.doNumber,
          supplierCode: suppliers.code,
          supplierName: suppliers.name,
        })
        .from(supplierPacks)
        .leftJoin(inventoryDo, eq(inventoryDo.id, supplierPacks.doId))
        .leftJoin(suppliers, eq(suppliers.id, supplierPacks.supplierId))
        .where(eq(supplierPacks.supplierLot, params.lot));

      if (packs.length === 0) {
        set.status = 404;
        return fail("LOT_NOT_FOUND", "Lot not found");
      }

      // Get all consumption records for these packs
      const packUnitIds = packs.map((p) => p.unitId).filter(Boolean) as string[];
      const consumptionRows = packUnitIds.length
        ? await db
            .select({
              id: consumption.id,
              setRunId: consumption.setRunId,
              sourceUid: consumption.sourceUid,
              qty: consumption.qty,
              stepCode: consumption.stepCode,
              consumedAt: consumption.consumedAt,
            })
            .from(consumption)
            .where(inArray(consumption.sourceUid, packUnitIds))
            .orderBy(consumption.consumedAt)
        : [];

      // Get affected set_runs
      const setRunIds = [...new Set(consumptionRows.map((r) => r.setRunId))];
      const setRunRows = setRunIds.length
        ? await db
            .select({
              id: setRuns.id,
              setCode: setRuns.setCode,
              status: setRuns.status,
              assyUnitId: setRuns.assyUnitId,
              startedAt: setRuns.startedAt,
              endedAt: setRuns.endedAt,
            })
            .from(setRuns)
            .where(inArray(setRuns.id, setRunIds))
        : [];

      const totalConsumed = consumptionRows.reduce((sum, r) => sum + r.qty, 0);

      return ok({
        lot: params.lot,
        packs,
        total_consumed: totalConsumed,
        consumption: consumptionRows,
        set_runs: setRunRows,
      });
    },
    {
      params: t.Object({
        lot: t.String(),
      }),
    }
  )

  // ─── Fast Trace: by set code ──────────────────────────
  .get(
    "/set/:code",
    async ({ params, set }) => {
      // Find set_run(s) by set_code
      const setRunRows = await db
        .select()
        .from(setRuns)
        .where(eq(setRuns.setCode, params.code))
        .orderBy(setRuns.startedAt);

      if (setRunRows.length === 0) {
        set.status = 404;
        return fail("SET_NOT_FOUND", "Set not found");
      }

      const setRunIds = setRunRows.map((sr) => sr.id);

      // All consumption for these set_runs
      const consumptionRows = await db
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
        .where(inArray(consumption.setRunId, setRunIds))
        .orderBy(consumption.consumedAt);

      // All containers for these set_runs
      const containerRows = await db
        .select({
          id: containers.id,
          setRunId: containers.setRunId,
          containerType: containers.containerType,
          unitId: containers.unitId,
        })
        .from(containers)
        .where(inArray(containers.setRunId, setRunIds));

      // Enrich supplier pack sources
      const supplierPackSourceIds = consumptionRows
        .filter((r) => r.sourceType === "SUPPLIER_PACK")
        .map((r) => r.sourceUid);

      const materialOrigins = supplierPackSourceIds.length
        ? await db
            .select({
              unit_id: supplierPacks.unitId,
              part_number: supplierPacks.partNumber,
              supplier_lot: supplierPacks.supplierLot,
              pack_barcode_raw: supplierPacks.packBarcodeRaw,
              do_number: inventoryDo.doNumber,
              supplier_code: suppliers.code,
              supplier_name: suppliers.name,
            })
            .from(supplierPacks)
            .leftJoin(inventoryDo, eq(inventoryDo.id, supplierPacks.doId))
            .leftJoin(suppliers, eq(suppliers.id, supplierPacks.supplierId))
            .where(inArray(supplierPacks.unitId, supplierPackSourceIds))
        : [];

      return ok({
        set_code: params.code,
        set_runs: setRunRows,
        consumption: consumptionRows,
        containers: containerRows,
        material_origins: materialOrigins,
      });
    },
    {
      params: t.Object({
        code: t.String(),
      }),
    }
  );
