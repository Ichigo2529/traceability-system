import { describe, expect, it } from "bun:test";
import { EVENT_HANDLERS } from "./event-handlers";

const REQUIRED_EVENTS = [
  "DISPATCH_CREATED",
  "DISPATCH_CONFIRMED",
  "DISPATCH_RETURNED",
  "PLATE_LOADED",
  "WASH1_START",
  "WASH1_END",
  "BONDING_PLATE_SCANNED",
  "MAGNET_PREPARED",
  "BONDING_MAGNET_SCANNED",
  "MAGNET_CARD_RETURNED",
  "JIG_LOADED",
  "WASH2_START",
  "WASH2_END",
  "JIG_RETURNED",
  "BONDING_START",
  "BONDING_END",
  "MAGNETIZE_DONE",
  "FLUX_PASS",
  "FLUX_FAIL",
  "ASSY_BIND_COMPONENTS",
  "PRESS_FIT_PIN430_DONE",
  "PRESS_FIT_PIN300_DONE",
  "PRESS_FIT_SHROUD_DONE",
  "CRASH_STOP_DONE",
  "IONIZER_DONE",
  "FVMI_PASS",
  "FVMI_FAIL",
  "LABEL_GENERATE_REQUEST",
  "LABELS_GENERATED",
  "SPLIT_GROUP_CREATED",
  "OUTER_PACKED",
  "FG_PALLET_MAPPED",
];

describe("event handler contract", () => {
  it("contains every required catalog event handler", () => {
    for (const eventType of REQUIRED_EVENTS) {
      expect(typeof EVENT_HANDLERS[eventType]).toBe("function");
    }
  });
});

