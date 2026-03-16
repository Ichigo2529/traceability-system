import { describe, expect, it } from "bun:test";
import { computeShiftDay } from "./shift-day";

/**
 * Timezone and shift-day validation (T03).
 * Boundary: 08:00 Asia/Bangkok (UTC+7).
 * Before 08:00 Bangkok -> previous calendar day; at/after 08:00 -> today.
 */
describe("computeShiftDay", () => {
  it("returns YYYY-MM-DD format", () => {
    const d = new Date("2026-03-13T12:00:00.000Z"); // 19:00 Bangkok
    expect(computeShiftDay(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(computeShiftDay(d)).toBe("2026-03-13");
  });

  it("at 08:00 Bangkok (01:00 UTC) uses today", () => {
    // 2026-03-13 01:00 UTC = 08:00 Bangkok
    const d = new Date("2026-03-13T01:00:00.000Z");
    expect(computeShiftDay(d)).toBe("2026-03-13");
  });

  it("at 07:59 Bangkok (00:59 UTC) uses previous day", () => {
    const d = new Date("2026-03-13T00:59:00.000Z"); // 07:59 Bangkok
    expect(computeShiftDay(d)).toBe("2026-03-12");
  });

  it("at 00:00 Bangkok (previous day 17:00 UTC) uses previous calendar day", () => {
    const d = new Date("2026-03-13T17:00:00.000Z"); // 00:00 14 Mar Bangkok
    expect(computeShiftDay(d)).toBe("2026-03-13");
  });

  it("at 07:00 Bangkok uses previous day", () => {
    const d = new Date("2026-03-13T00:00:00.000Z"); // 07:00 Bangkok
    expect(computeShiftDay(d)).toBe("2026-03-12");
  });
});
