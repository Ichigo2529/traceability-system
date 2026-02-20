import Elysia, { t } from "elysia";
import { and, asc, eq, ilike, sql } from "drizzle-orm";
import { db } from "../db/connection";
import { authDerive, checkRole } from "../middleware/auth";
import { ok, fail } from "../lib/http";
import { inventoryDo, suppliers, supplierPartProfiles } from "../db/schema";
import * as XLSX from "xlsx";

// ─── Helpers ────────────────────────────────────────────

function parseErrorCode(error: unknown): string {
  const maybe = error as { code?: string };
  if (maybe?.code === "23505") return "DUPLICATE_KEY";
  if (maybe?.code === "23503") return "FOREIGN_KEY_ERROR";
  return "INTERNAL_ERROR";
}

/**
 * Parse an Excel serial date number (e.g. 45678) or a common string date
 * into an ISO "YYYY-MM-DD" string.
 */
export function parseExcelDate(raw: unknown): string | null {
  if (raw == null || raw === "") return null;

  // Excel serial number
  if (typeof raw === "number" && raw > 30000 && raw < 100000) {
    // Excel epoch: 1899-12-30; adjust for the phantom 1900-02-29 bug
    const utcDays = raw - 25569; // days since 1970-01-01
    const ms = utcDays * 86_400_000;
    const d = new Date(ms);
    return d.toISOString().slice(0, 10);
  }

  const s = String(raw).trim();
  if (!s) return null;

  // Try ISO-like: 2024-01-15 or 2024/01/15
  const isoMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Fallback: parse with Date()
  const fallback = new Date(s);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toISOString().slice(0, 10);
  }

  return null;
}

/**
 * Parse a value as a non-negative integer; returns null for unparseable values.
 */
export function parseIntSafe(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, "").trim());
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n));
}

// Column header normalisation map (case-insensitive)
const EXCEL_COL_MAP: Record<string, string> = {
  "part no.": "part_number",
  "part no": "part_number",
  "part_number": "part_number",
  "partnumber": "part_number",
  description: "description",
  vendor: "vendor",
  supplier: "vendor",
  "lot no.": "lot_number",
  "lot no": "lot_number",
  "lot_number": "lot_number",
  lotnumber: "lot_number",
  "receive date": "receive_date",
  "received date": "receive_date",
  receivedate: "receive_date",
  "do. no.": "do_number",
  "do.no.": "do_number",
  "do no.": "do_number",
  "do no": "do_number",
  "do_number": "do_number",
  donumber: "do_number",
  quantity: "quantity",
  qty: "quantity",
  gr: "gr_number",
  "gr number": "gr_number",
  "gr_number": "gr_number",
  grnumber: "gr_number",
};

function normaliseHeaders(headers: string[]): Record<number, string> {
  const map: Record<number, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const key = String(headers[i] ?? "")
      .trim()
      .toLowerCase();
    if (key && EXCEL_COL_MAP[key]) {
      map[i] = EXCEL_COL_MAP[key];
    }
  }
  return map;
}

// ─── Route plugin ───────────────────────────────────────

export const inventoryRoutes = new Elysia({ prefix: "/inventory" })
  .use(authDerive)
  .onBeforeHandle(checkRole(["ADMIN", "STORE"]));

// ═══════════════════════════════════════════════════════
//  1) DO Detail CRUD
// ═══════════════════════════════════════════════════════

// GET /inventory/do
inventoryRoutes.get(
  "/do",
  async ({ query }) => {
    const conditions = [];
    if (query.do_number) conditions.push(ilike(inventoryDo.doNumber, `%${query.do_number}%`));
    if (query.part_number) conditions.push(ilike(inventoryDo.partNumber, `%${query.part_number}%`));
    if (query.supplier_id) conditions.push(eq(inventoryDo.supplierId, query.supplier_id));

    const rows = await db
      .select({
        id: inventoryDo.id,
        supplier_id: inventoryDo.supplierId,
        do_number: inventoryDo.doNumber,
        supplier: inventoryDo.supplier,
        part_number: inventoryDo.partNumber,
        lot_number: inventoryDo.lotNumber,
        description: inventoryDo.description,
        gr_number: inventoryDo.grNumber,
        material_code: inventoryDo.materialCode,
        total_qty: inventoryDo.totalQty,
        qty_received: inventoryDo.qtyReceived,
        qty_issued: inventoryDo.qtyIssued,
        reject_qty: inventoryDo.rejectQty,
        received_date: inventoryDo.receivedDate,
        received_at: inventoryDo.receivedAt,
        supplier_name: suppliers.name,
      })
      .from(inventoryDo)
      .leftJoin(suppliers, eq(suppliers.id, inventoryDo.supplierId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(inventoryDo.doNumber), asc(inventoryDo.partNumber));

    return ok(rows);
  },
  {
    query: t.Object({
      do_number: t.Optional(t.String()),
      part_number: t.Optional(t.String()),
      supplier_id: t.Optional(t.String()),
    }),
  }
);

// POST /inventory/do  (manual create)
inventoryRoutes.post(
  "/do",
  async ({ body, set }) => {
    try {
      // Resolve supplier if provided
      let supplierId: string | null = null;
      if (body.supplier_id) {
        supplierId = body.supplier_id;
      } else if (body.supplier) {
        const [found] = await db
          .select({ id: suppliers.id })
          .from(suppliers)
          .where(
            sql`(LOWER(${suppliers.code}) = LOWER(${body.supplier}) OR LOWER(${suppliers.name}) = LOWER(${body.supplier}))`
          )
          .limit(1);
        supplierId = found?.id ?? null;
      }

      const [row] = await db
        .insert(inventoryDo)
        .values({
          supplierId,
          doNumber: body.do_number,
          supplier: body.supplier ?? null,
          partNumber: body.part_number ?? null,
          lotNumber: body.lot_number ?? null,
          description: body.description ?? null,
          grNumber: body.gr_number ?? null,
          materialCode: body.material_code ?? body.part_number ?? "",
          totalQty: body.total_qty ?? body.qty_received ?? 0,
          qtyReceived: body.qty_received ?? 0,
          rejectQty: body.reject_qty ?? 0,
          receivedDate: body.received_date ?? null,
        })
        .returning();

      return ok(row);
    } catch (error) {
      set.status = 500;
      return fail(parseErrorCode(error), "Failed to create DO record");
    }
  },
  {
    body: t.Object({
      do_number: t.String(),
      supplier_id: t.Optional(t.String()),
      supplier: t.Optional(t.String()),
      part_number: t.Optional(t.String()),
      lot_number: t.Optional(t.String()),
      description: t.Optional(t.String()),
      gr_number: t.Optional(t.String()),
      material_code: t.Optional(t.String()),
      total_qty: t.Optional(t.Number()),
      qty_received: t.Optional(t.Number()),
      reject_qty: t.Optional(t.Number()),
      received_date: t.Optional(t.String()),
    }),
  }
);

// PATCH /inventory/do/:id  (update; particularly reject_qty)
inventoryRoutes.patch(
  "/do/:id",
  async ({ params, body, set }) => {
    // Fetch current row
    const [current] = await db
      .select()
      .from(inventoryDo)
      .where(eq(inventoryDo.id, params.id))
      .limit(1);

    if (!current) {
      set.status = 404;
      return fail("NOT_FOUND", "DO record not found");
    }

    // Validate reject_qty bounds
    if (body.reject_qty !== undefined) {
      const rejectQty = body.reject_qty;
      const qtyReceived = body.qty_received ?? current.qtyReceived;
      if (rejectQty < 0 || rejectQty > qtyReceived) {
        set.status = 400;
        return fail("VALIDATION_ERROR", `reject_qty must be between 0 and ${qtyReceived}`);
      }
    }

    try {
      const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
      if (body.do_number !== undefined) updatePayload.doNumber = body.do_number;
      if (body.supplier !== undefined) updatePayload.supplier = body.supplier;
      if (body.part_number !== undefined) updatePayload.partNumber = body.part_number;
      if (body.lot_number !== undefined) updatePayload.lotNumber = body.lot_number;
      if (body.description !== undefined) updatePayload.description = body.description;
      if (body.gr_number !== undefined) updatePayload.grNumber = body.gr_number;
      if (body.material_code !== undefined) updatePayload.materialCode = body.material_code;
      if (body.total_qty !== undefined) updatePayload.totalQty = body.total_qty;
      if (body.qty_received !== undefined) updatePayload.qtyReceived = body.qty_received;
      if (body.reject_qty !== undefined) updatePayload.rejectQty = body.reject_qty;
      if (body.received_date !== undefined) updatePayload.receivedDate = body.received_date;
      if (body.supplier_id !== undefined) updatePayload.supplierId = body.supplier_id;

      const [updated] = await db
        .update(inventoryDo)
        .set(updatePayload)
        .where(eq(inventoryDo.id, params.id))
        .returning();

      return ok(updated);
    } catch (error) {
      set.status = 500;
      return fail(parseErrorCode(error), "Failed to update DO record");
    }
  },
  {
    body: t.Object({
      do_number: t.Optional(t.String()),
      supplier_id: t.Optional(t.String()),
      supplier: t.Optional(t.String()),
      part_number: t.Optional(t.String()),
      lot_number: t.Optional(t.String()),
      description: t.Optional(t.String()),
      gr_number: t.Optional(t.String()),
      material_code: t.Optional(t.String()),
      total_qty: t.Optional(t.Number()),
      qty_received: t.Optional(t.Number()),
      reject_qty: t.Optional(t.Number()),
      received_date: t.Optional(t.String()),
    }),
  }
);

// DELETE /inventory/do/:id  (hard delete)
inventoryRoutes.delete("/do/:id", async ({ params, set }) => {
  const [deleted] = await db
    .delete(inventoryDo)
    .where(eq(inventoryDo.id, params.id))
    .returning({ id: inventoryDo.id });

  if (!deleted) {
    set.status = 404;
    return fail("NOT_FOUND", "DO record not found");
  }

  return ok({ id: deleted.id, deleted: true });
});

// ═══════════════════════════════════════════════════════
//  2) Excel Import – POST /inventory/do/import-excel
// ═══════════════════════════════════════════════════════

inventoryRoutes.post(
  "/do/import-excel",
  async ({ body, set }) => {
    const file = body.file;
    if (!file) {
      set.status = 400;
      return fail("VALIDATION_ERROR", "file is required (.xlsx)");
    }

    let workbook: XLSX.WorkBook;
    try {
      const buffer = await file.arrayBuffer();
      workbook = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: false });
    } catch {
      set.status = 400;
      return fail("PARSE_ERROR", "Unable to read Excel file");
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) {
      set.status = 400;
      return fail("PARSE_ERROR", "Workbook has no sheets");
    }

    const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
    if (rawRows.length < 2) {
      set.status = 400;
      return fail("PARSE_ERROR", "Sheet has no data rows");
    }

    // First row = headers
    const headerRow = (rawRows[0] as unknown[]).map(String);
    const colMap = normaliseHeaders(headerRow);

    // Pre-load all suppliers for quick lookup
    const allSuppliers = await db.select().from(suppliers).where(eq(suppliers.isActive, true));
    const suppliersByCode = new Map(allSuppliers.map((s) => [s.code.toLowerCase(), s]));
    const suppliersByName = new Map(allSuppliers.map((s) => [s.name.toLowerCase(), s]));

    const batchId = crypto.randomUUID();
    let inserted = 0;
    let updated = 0;
    let failed = 0;
    const errors: { row_no: number; message: string }[] = [];

    // Process rows inside a transaction
    await db.transaction(async (tx) => {
      for (let i = 1; i < rawRows.length; i++) {
        const cells = rawRows[i];
        if (!cells || cells.length === 0) continue;

        const rowNo = i + 1; // 1-based, accounting for header

        // Map cells to named fields
        const mapped: Record<string, unknown> = {};
        for (const [colIdx, fieldName] of Object.entries(colMap)) {
          mapped[fieldName] = cells[Number(colIdx)];
        }

        // Validate required: do_number
        const doNumber = String(mapped.do_number ?? "").trim();
        if (!doNumber) {
          errors.push({ row_no: rowNo, message: "Missing DO. No." });
          failed++;
          continue;
        }

        const partNumber = String(mapped.part_number ?? "").trim() || null;
        const lotNumber = String(mapped.lot_number ?? "").trim() || null;
        const grNumber = String(mapped.gr_number ?? "").trim() || null;
        const description = String(mapped.description ?? "").trim() || null;
        const vendorRaw = String(mapped.vendor ?? "").trim();
        const receivedDate = parseExcelDate(mapped.receive_date);
        const quantity = parseIntSafe(mapped.quantity);

        // Resolve supplier
        let supplierId: string | null = null;
        let supplierText: string | null = vendorRaw || null;
        if (vendorRaw) {
          const vendorLower = vendorRaw.toLowerCase();
          const byCode = suppliersByCode.get(vendorLower);
          const byName = suppliersByName.get(vendorLower);
          const match = byCode ?? byName;
          if (match) {
            supplierId = match.id;
            supplierText = match.name;
          }
        }

        try {
          // Upsert based on natural key (do_number, part_number, lot_number, gr_number)
          const existing = await tx
            .select({ id: inventoryDo.id })
            .from(inventoryDo)
            .where(
              and(
                eq(inventoryDo.doNumber, doNumber),
                partNumber
                  ? eq(inventoryDo.partNumber, partNumber)
                  : sql`${inventoryDo.partNumber} IS NULL`,
                lotNumber
                  ? eq(inventoryDo.lotNumber, lotNumber)
                  : sql`${inventoryDo.lotNumber} IS NULL`,
                grNumber
                  ? eq(inventoryDo.grNumber, grNumber)
                  : sql`${inventoryDo.grNumber} IS NULL`
              )
            )
            .limit(1);

          if (existing.length > 0) {
            // Update
            await tx
              .update(inventoryDo)
              .set({
                supplierId,
                supplier: supplierText,
                description,
                materialCode: partNumber ?? doNumber,
                qtyReceived: quantity ?? 0,
                totalQty: quantity ?? 0,
                receivedDate,
                updatedAt: new Date(),
              })
              .where(eq(inventoryDo.id, existing[0].id));
            updated++;
          } else {
            // Insert
            await tx.insert(inventoryDo).values({
              doNumber,
              supplierId,
              supplier: supplierText,
              partNumber,
              lotNumber,
              description,
              grNumber,
              materialCode: partNumber ?? doNumber,
              qtyReceived: quantity ?? 0,
              totalQty: quantity ?? 0,
              receivedDate,
            });
            inserted++;
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          errors.push({ row_no: rowNo, message: msg });
          failed++;
        }
      }
    });

    return ok({ batch_id: batchId, inserted, updated, failed, errors });
  },
  {
    body: t.Object({
      file: t.File(),
    }),
  }
);

// ═══════════════════════════════════════════════════════
//  3) Auto-load DO summary – GET /inventory/do/summary/:doNo
// ═══════════════════════════════════════════════════════

inventoryRoutes.get("/do/summary/:doNo", async ({ params, set }) => {
  const rows = await db
    .select({
      id: inventoryDo.id,
      supplier_id: inventoryDo.supplierId,
      do_number: inventoryDo.doNumber,
      supplier: inventoryDo.supplier,
      part_number: inventoryDo.partNumber,
      lot_number: inventoryDo.lotNumber,
      description: inventoryDo.description,
      gr_number: inventoryDo.grNumber,
      material_code: inventoryDo.materialCode,
      total_qty: inventoryDo.totalQty,
      qty_received: inventoryDo.qtyReceived,
      qty_issued: inventoryDo.qtyIssued,
      reject_qty: inventoryDo.rejectQty,
      received_date: inventoryDo.receivedDate,
      supplier_name: suppliers.name,
    })
    .from(inventoryDo)
    .leftJoin(suppliers, eq(suppliers.id, inventoryDo.supplierId))
    .where(eq(inventoryDo.doNumber, params.doNo))
    .orderBy(asc(inventoryDo.partNumber));

  if (rows.length === 0) {
    set.status = 404;
    return fail("NOT_FOUND", `No DO rows found for DO number: ${params.doNo}`);
  }

  const totalReceived = rows.reduce((sum, r) => sum + (r.qty_received ?? 0), 0);
  const totalReject = rows.reduce((sum, r) => sum + (r.reject_qty ?? 0), 0);
  const totalNet = totalReceived - totalReject;

  return ok({
    do_number: params.doNo,
    rows,
    totals: {
      total_received: totalReceived,
      total_reject: totalReject,
      total_net: totalNet,
    },
  });
});

// ═══════════════════════════════════════════════════════
//  4) Material Vendor Pack Detail CRUD (supplier_part_profiles)
// ═══════════════════════════════════════════════════════

// GET /inventory/vendor-pack
inventoryRoutes.get(
  "/vendor-pack",
  async ({ query }) => {
    const conditions = [];
    if (query.part_number) conditions.push(ilike(supplierPartProfiles.partNumber, `%${query.part_number}%`));
    if (query.supplier_id) conditions.push(eq(supplierPartProfiles.supplierId, query.supplier_id));

    const rows = await db
      .select({
        id: supplierPartProfiles.id,
        supplier_id: supplierPartProfiles.supplierId,
        part_number: supplierPartProfiles.partNumber,
        supplier_part_number: supplierPartProfiles.supplierPartNumber,
        component_name: supplierPartProfiles.componentName,
        parser_key: supplierPartProfiles.parserKey,
        default_pack_qty: supplierPartProfiles.defaultPackQty,
        vendor_detail: supplierPartProfiles.vendorDetail,
        qr_sample: supplierPartProfiles.qrSample,
        is_active: supplierPartProfiles.isActive,
        created_at: supplierPartProfiles.createdAt,
        updated_at: supplierPartProfiles.updatedAt,
        supplier_name: suppliers.name,
        supplier_code: suppliers.code,
      })
      .from(supplierPartProfiles)
      .leftJoin(suppliers, eq(suppliers.id, supplierPartProfiles.supplierId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(supplierPartProfiles.partNumber));

    return ok(rows);
  },
  {
    query: t.Object({
      part_number: t.Optional(t.String()),
      supplier_id: t.Optional(t.String()),
    }),
  }
);

// POST /inventory/vendor-pack
inventoryRoutes.post(
  "/vendor-pack",
  async ({ body, set }) => {
    try {
      const [row] = await db
        .insert(supplierPartProfiles)
        .values({
          supplierId: body.supplier_id,
          partNumber: body.part_number,
          supplierPartNumber: body.supplier_part_number ?? "",
          componentName: body.component_name ?? null,
          parserKey: body.parser_key ?? "GENERIC",
          defaultPackQty: body.default_pack_qty ?? null,
          vendorDetail: body.vendor_detail ?? null,
          qrSample: body.qr_sample ?? null,
        })
        .returning();

      return ok(row);
    } catch (error) {
      set.status = 500;
      return fail(parseErrorCode(error), "Failed to create vendor pack profile");
    }
  },
  {
    body: t.Object({
      supplier_id: t.String(),
      part_number: t.String(),
      supplier_part_number: t.Optional(t.String()),
      component_name: t.Optional(t.String()),
      parser_key: t.Optional(t.String()),
      default_pack_qty: t.Optional(t.Number()),
      vendor_detail: t.Optional(t.Any()),
      qr_sample: t.Optional(t.String()),
    }),
  }
);

// PATCH /inventory/vendor-pack/:id
inventoryRoutes.patch(
  "/vendor-pack/:id",
  async ({ params, body, set }) => {
    const [current] = await db
      .select()
      .from(supplierPartProfiles)
      .where(eq(supplierPartProfiles.id, params.id))
      .limit(1);

    if (!current) {
      set.status = 404;
      return fail("NOT_FOUND", "Vendor pack profile not found");
    }

    try {
      const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
      if (body.supplier_id !== undefined) updatePayload.supplierId = body.supplier_id;
      if (body.part_number !== undefined) updatePayload.partNumber = body.part_number;
      if (body.supplier_part_number !== undefined) updatePayload.supplierPartNumber = body.supplier_part_number;
      if (body.component_name !== undefined) updatePayload.componentName = body.component_name;
      if (body.parser_key !== undefined) updatePayload.parserKey = body.parser_key;
      if (body.default_pack_qty !== undefined) updatePayload.defaultPackQty = body.default_pack_qty;
      if (body.vendor_detail !== undefined) updatePayload.vendorDetail = body.vendor_detail;
      if (body.qr_sample !== undefined) updatePayload.qrSample = body.qr_sample;

      const [updated] = await db
        .update(supplierPartProfiles)
        .set(updatePayload)
        .where(eq(supplierPartProfiles.id, params.id))
        .returning();

      return ok(updated);
    } catch (error) {
      set.status = 500;
      return fail(parseErrorCode(error), "Failed to update vendor pack profile");
    }
  },
  {
    body: t.Object({
      supplier_id: t.Optional(t.String()),
      part_number: t.Optional(t.String()),
      supplier_part_number: t.Optional(t.String()),
      component_name: t.Optional(t.String()),
      parser_key: t.Optional(t.String()),
      default_pack_qty: t.Optional(t.Number()),
      vendor_detail: t.Optional(t.Any()),
      qr_sample: t.Optional(t.String()),
    }),
  }
);

// DELETE /inventory/vendor-pack/:id  (soft deactivate – consistent with existing patterns)
inventoryRoutes.delete("/vendor-pack/:id", async ({ params, set }) => {
  const [current] = await db
    .select({ id: supplierPartProfiles.id })
    .from(supplierPartProfiles)
    .where(eq(supplierPartProfiles.id, params.id))
    .limit(1);

  if (!current) {
    set.status = 404;
    return fail("NOT_FOUND", "Vendor pack profile not found");
  }

  const [deactivated] = await db
    .update(supplierPartProfiles)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(supplierPartProfiles.id, params.id))
    .returning({ id: supplierPartProfiles.id, is_active: supplierPartProfiles.isActive });

  return ok({ id: deactivated.id, is_active: deactivated.is_active, deactivated: true });
});
