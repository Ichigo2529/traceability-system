import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC_ROOT = join(import.meta.dir, "..");
const EVENT_HANDLERS_PATH = join(SRC_ROOT, "lib", "event-handlers.ts");
const EVENTS_ROUTE_PATH = join(SRC_ROOT, "routes", "events.ts");

describe("error contract", () => {
  it("does not use legacy error codes in event handlers", () => {
    const source = readFileSync(EVENT_HANDLERS_PATH, "utf8");
    const forbidden = [
      '"INVALID_TRANSITION"',
      '"INVALID_STATE"',
      '"INVALID_OUTER_STATE"',
      '"NOT_IMPLEMENTED"',
    ];

    for (const token of forbidden) {
      expect(source.includes(token)).toBe(false);
    }
  });

  it("uses error_code in /events and /labels error responses", () => {
    const source = readFileSync(EVENTS_ROUTE_PATH, "utf8");
    expect(source.includes("error_code:")).toBe(true);
    expect(source.includes(" error: ")).toBe(false);
  });
});
