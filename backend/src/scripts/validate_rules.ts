import { readFile } from "node:fs/promises";
import path from "node:path";

type RuleCheck = {
  name: string;
  file: string;
  patterns: string[];
};

const RULE_CHECKS: RuleCheck[] = [
  {
    name: "Shift-day boundary is 08:00 Asia/Bangkok",
    file: "backend/src/lib/shift-day.ts",
    patterns: ["08:00", "UTC+7"],
  },
  {
    name: "Events persist shift_day and require operator auth",
    file: "backend/src/routes/events.ts",
    patterns: ["computeShiftDay", "NO_OPERATOR_SESSION", "operatorUserId"],
  },
  {
    name: "Active revision lock exists in admin routes",
    file: "backend/src/routes/admin.ts",
    patterns: ["REVISION_LOCKED", "status === \"ACTIVE\""],
  },
  {
    name: "Supplier pack tracked in event handlers",
    file: "backend/src/lib/event-handlers.ts",
    patterns: ["SUPPLIER_PACK", "packQtyRemaining", "BONDING_END"],
  },
  {
    name: "Offline queue blocks label/serial events",
    file: "web/packages/offline-queue/src/queue.ts",
    patterns: ["OFFLINE_SERIAL_NOT_ALLOWED", "LABELS_GENERATED"],
  },
  {
    name: "Station header uses server-side shift_day model",
    file: "web/apps/admin/src/components/shared/StationHeader.tsx",
    patterns: ["shift_day", "sdk.device.heartbeat"],
  },
  {
    name: "Serial counter scope includes part + shift_day + line_code",
    file: "backend/src/db/schema/labels.ts",
    patterns: ["part_number", "shift_day", "line_code"],
  },
];

async function run() {
  const repoRoot = process.cwd().endsWith(path.join("backend"))
    ? path.resolve(process.cwd(), "..")
    : process.cwd();

  const failures: string[] = [];

  for (const check of RULE_CHECKS) {
    const fullPath = path.join(repoRoot, check.file);
    const content = await readFile(fullPath, "utf8").catch(() => "");
    if (!content) {
      failures.push(`[MISSING] ${check.name} (${check.file})`);
      continue;
    }

    const missing = check.patterns.filter((p) => !content.includes(p));
    if (missing.length) {
      failures.push(
        `[FAILED] ${check.name} (${check.file}) missing: ${missing.join(", ")}`
      );
    }
  }

  if (failures.length) {
    console.error("Rule validation failed:");
    for (const item of failures) console.error(`- ${item}`);
    process.exit(1);
  }

  console.log("Rule validation passed.");
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
