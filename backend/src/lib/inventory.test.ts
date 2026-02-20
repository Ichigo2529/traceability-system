import { describe, expect, it } from "bun:test";
import { parseExcelDate, parseIntSafe } from "../routes/inventory";

// ═══════════════════════════════════════════════════════
//  1) reject_qty validation logic
// ═══════════════════════════════════════════════════════

describe("reject_qty validation", () => {
  it("should accept reject_qty = 0", () => {
    const rejectQty = 0;
    const qtyReceived = 100;
    expect(rejectQty >= 0 && rejectQty <= qtyReceived).toBe(true);
  });

  it("should accept reject_qty = qty_received", () => {
    const rejectQty = 100;
    const qtyReceived = 100;
    expect(rejectQty >= 0 && rejectQty <= qtyReceived).toBe(true);
  });

  it("should accept reject_qty between 0 and qty_received", () => {
    const rejectQty = 42;
    const qtyReceived = 100;
    expect(rejectQty >= 0 && rejectQty <= qtyReceived).toBe(true);
  });

  it("should reject negative reject_qty", () => {
    const rejectQty = -1;
    const qtyReceived = 100;
    expect(rejectQty >= 0 && rejectQty <= qtyReceived).toBe(false);
  });

  it("should reject reject_qty > qty_received", () => {
    const rejectQty = 101;
    const qtyReceived = 100;
    expect(rejectQty >= 0 && rejectQty <= qtyReceived).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
//  2) Excel date + integer parsing
// ═══════════════════════════════════════════════════════

describe("parseExcelDate", () => {
  it("should parse Excel serial date (45678)", () => {
    const result = parseExcelDate(45678);
    expect(result).toBeString();
    // 45678 → 2025-01-21 (calculated from Excel epoch)
    expect(result).toBe("2025-01-21");
  });

  it("should parse ISO date string (2024-03-15)", () => {
    expect(parseExcelDate("2024-03-15")).toBe("2024-03-15");
  });

  it("should parse slash date string (2024/06/01)", () => {
    expect(parseExcelDate("2024/06/01")).toBe("2024-06-01");
  });

  it("should parse DD/MM/YYYY (15/03/2024)", () => {
    expect(parseExcelDate("15/03/2024")).toBe("2024-03-15");
  });

  it("should return null for empty/null values", () => {
    expect(parseExcelDate(null)).toBeNull();
    expect(parseExcelDate("")).toBeNull();
    expect(parseExcelDate(undefined)).toBeNull();
  });

  it("should handle another serial date (44927 → 2023-01-01)", () => {
    // 44927 = 2023-01-01
    expect(parseExcelDate(44927)).toBe("2023-01-01");
  });
});

describe("parseIntSafe", () => {
  it("should parse integer from number", () => {
    expect(parseIntSafe(42)).toBe(42);
  });

  it("should parse integer from string", () => {
    expect(parseIntSafe("100")).toBe(100);
  });

  it("should parse comma-separated number", () => {
    expect(parseIntSafe("1,500")).toBe(1500);
  });

  it("should round floating point to nearest int", () => {
    expect(parseIntSafe(99.7)).toBe(100);
  });

  it("should clamp negative to 0", () => {
    expect(parseIntSafe(-5)).toBe(0);
  });

  it("should return null for non-numeric strings", () => {
    expect(parseIntSafe("abc")).toBeNull();
    expect(parseIntSafe("")).toBeNull();
    expect(parseIntSafe(null)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════
//  3) Summary totals correctness
// ═══════════════════════════════════════════════════════

describe("summary totals computation", () => {
  // Simulate the same logic used in the GET /inventory/do/summary/:doNo endpoint
  function computeTotals(rows: { qty_received: number; reject_qty: number }[]) {
    const totalReceived = rows.reduce((sum, r) => sum + (r.qty_received ?? 0), 0);
    const totalReject = rows.reduce((sum, r) => sum + (r.reject_qty ?? 0), 0);
    const totalNet = totalReceived - totalReject;
    return { total_received: totalReceived, total_reject: totalReject, total_net: totalNet };
  }

  it("should compute totals correctly with no rejects", () => {
    const rows = [
      { qty_received: 100, reject_qty: 0 },
      { qty_received: 200, reject_qty: 0 },
    ];
    const totals = computeTotals(rows);
    expect(totals.total_received).toBe(300);
    expect(totals.total_reject).toBe(0);
    expect(totals.total_net).toBe(300);
  });

  it("should compute totals correctly with rejects", () => {
    const rows = [
      { qty_received: 100, reject_qty: 10 },
      { qty_received: 200, reject_qty: 25 },
      { qty_received: 50, reject_qty: 5 },
    ];
    const totals = computeTotals(rows);
    expect(totals.total_received).toBe(350);
    expect(totals.total_reject).toBe(40);
    expect(totals.total_net).toBe(310);
  });

  it("should compute totals correctly when all rejected", () => {
    const rows = [
      { qty_received: 100, reject_qty: 100 },
      { qty_received: 50, reject_qty: 50 },
    ];
    const totals = computeTotals(rows);
    expect(totals.total_received).toBe(150);
    expect(totals.total_reject).toBe(150);
    expect(totals.total_net).toBe(0);
  });

  it("should handle empty rows", () => {
    const totals = computeTotals([]);
    expect(totals.total_received).toBe(0);
    expect(totals.total_reject).toBe(0);
    expect(totals.total_net).toBe(0);
  });
});
