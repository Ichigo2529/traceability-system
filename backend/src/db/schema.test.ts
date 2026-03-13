/**
 * Schema sanity check: ensure barrel exports and key tables are defined.
 * Run with: bun test backend/src/db/schema.test.ts (or from backend: bun test src/db/schema.test.ts)
 */
import { describe, expect, it } from "bun:test";
import * as schema from "./schema";

describe("DB schema exports", () => {
  it("exports auth tables", () => {
    expect(schema.users).toBeDefined();
    expect(schema.roles).toBeDefined();
    expect(schema.refreshTokens).toBeDefined();
  });

  it("exports devices table", () => {
    expect(schema.devices).toBeDefined();
  });

  it("exports production-related tables", () => {
    expect(schema.models).toBeDefined();
    expect(schema.stations).toBeDefined();
  });

  it("exports inventory and labels", () => {
    expect(schema.inventoryDo).toBeDefined();
    expect(schema.labels).toBeDefined();
  });
});
