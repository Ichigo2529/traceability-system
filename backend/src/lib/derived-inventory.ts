/**
 * Derived Inventory Service
 *
 * Computes remaining quantity from the consumption ledger.
 * Does NOT directly deduct stock — purely read-only computation.
 *
 * remaining = initial_qty - SUM(consumption.qty WHERE source_uid = ?)
 */

import { db } from "../db/connection";
import { consumption } from "../db/schema/genealogy";
import { supplierPacks } from "../db/schema/inventory";
import { bag100 } from "../db/schema/genealogy";
import { eq, sql, and } from "drizzle-orm";
import { DomainError } from "./errors";

export interface DerivedBalance {
  sourceType: string;
  sourceUid: string;
  initial: number;
  consumed: number;
  remaining: number;
}

/**
 * Compute derived remaining quantity for a material source.
 *
 * For SUPPLIER_PACK: initial is supplier_packs.pack_qty_total
 * For BAG100: initial is bag100.qty_initial
 * For UNIT: initial is units.qty_total (not yet implemented)
 */
export async function getDerivedRemaining(
  sourceType: "SUPPLIER_PACK" | "BAG100",
  sourceUid: string
): Promise<DerivedBalance> {
  // Get initial quantity based on source type
  let initial: number;

  if (sourceType === "SUPPLIER_PACK") {
    const [pack] = await db
      .select({ packQtyTotal: supplierPacks.packQtyTotal })
      .from(supplierPacks)
      .where(eq(supplierPacks.id, sourceUid))
      .limit(1);

    if (!pack) {
      throw new DomainError(
        "SOURCE_NOT_FOUND",
        `Supplier pack "${sourceUid}" not found`
      );
    }
    initial = pack.packQtyTotal;
  } else if (sourceType === "BAG100") {
    const [bag] = await db
      .select({ qtyInitial: bag100.qtyInitial })
      .from(bag100)
      .where(eq(bag100.id, sourceUid))
      .limit(1);

    if (!bag) {
      throw new DomainError(
        "SOURCE_NOT_FOUND",
        `Bag100 "${sourceUid}" not found`
      );
    }
    initial = bag.qtyInitial;
  } else {
    throw new DomainError(
      "UNSUPPORTED_SOURCE_TYPE",
      `Source type "${sourceType}" is not supported for derived inventory`
    );
  }

  // Sum all consumption from the ledger for this source
  const [result] = await db
    .select({
      totalConsumed: sql<number>`COALESCE(SUM(${consumption.qty}), 0)`,
    })
    .from(consumption)
    .where(
      and(
        eq(consumption.sourceType, sourceType),
        eq(consumption.sourceUid, sourceUid)
      )
    );

  const consumed = Number(result.totalConsumed);
  const remaining = initial - consumed;

  return {
    sourceType,
    sourceUid,
    initial,
    consumed,
    remaining,
  };
}
