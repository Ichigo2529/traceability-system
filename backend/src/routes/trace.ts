import { Elysia, t } from "elysia";
import { db } from "../db/connection";
import { units, unitLinks, events } from "../db/schema/production";
import { inventoryDo, supplierPacks, suppliers } from "../db/schema/inventory";
import { eq, inArray, sql } from "drizzle-orm";

async function traceByUnitId(id: string, expectedType: string) {
  const [unit] = await db.select().from(units).where(eq(units.id, id)).limit(1);

  if (!unit) {
    return {
      status: 404 as const,
      body: { success: false, error: `${expectedType}_NOT_FOUND` },
    };
  }

  if (unit.unitType !== expectedType) {
    return {
      status: 409 as const,
      body: {
        success: false,
        error: "UNIT_TYPE_MISMATCH",
        message: `Expected ${expectedType}, got ${unit.unitType}`,
      },
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
  const supplierPackUnitIds = upstreamRows
    .filter((r) => r.related_type === "SUPPLIER_PACK")
    .map((r) => r.related_id);

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
    body: {
      success: true,
      data: {
        unit,
        genealogy: {
          upstream,
          downstream,
        },
        material_origins: materialOrigins,
        events: unitEvents,
      },
    },
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
  );
