// ─── 2D Barcode Parser ──────────────────────────────────
// Parses supplier 2D barcodes (DFI-like delimiter-based format).
// Pluggable parser registry keyed by supplier_part_profiles.parser_key.

// ── Types ──

export interface ParsedBarcode {
  partNumber: string | null;
  quantity: number | null;
  supplierCode: string | null;
  lotNumber: string | null;
  productionDate: string | null; // ISO date YYYY-MM-DD
  expiryDate: string | null; // ISO date YYYY-MM-DD
  uom: string | null;
  packSequence: string | null;
  serial: string | null;
  raw: string;
  segments: Record<string, string>; // all AI→value pairs
  parserKey: string;
  errors: string[];
}

export type ScanEventResult =
  | "MATCHED"
  | "DUPLICATE"
  | "NOT_FOUND"
  | "EXPIRED"
  | "PARSE_ERROR"
  | "MISMATCH";

export interface ScanValidationResult {
  result: ScanEventResult;
  detail?: string;
  matchedItemId?: string;
  matchedSupplierPackId?: string;
  parsedQty?: number;
}

export interface BatchItemForValidation {
  id: string;
  part_number: string;
  do_number: string;
  expected_packs: number;
  scanned_packs: number;
}

export interface ExistingScanForValidation {
  barcode_raw: string;
  result: string;
}

// ── Parser Interface ──

export type BarcodeParser = (raw: string) => ParsedBarcode;

// ── Delimiter Detection ──

const DELIMITERS = [
  { char: "\x1E", name: "RS" },
  { char: "\x1D", name: "GS" },
  { char: "|", name: "PIPE" },
  { char: ";", name: "SEMICOLON" },
  { char: "\t", name: "TAB" },
] as const;

function detectDelimiter(raw: string): string | null {
  for (const d of DELIMITERS) {
    if (raw.includes(d.char)) return d.char;
  }
  return null;
}

// ── Utility Helpers ──

function toInt(val: string | undefined): number | null {
  if (!val) return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

/**
 * Parse date from common formats:
 *  - YYYYMMDD
 *  - YYYY-MM-DD
 *  - YYYY/MM/DD
 *  - DDMMYYYY
 */
function parseDate(val: string | undefined): string | null {
  if (!val) return null;
  const clean = val.trim();

  // YYYY-MM-DD (already ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  // YYYYMMDD
  if (/^\d{8}$/.test(clean)) {
    const y = clean.slice(0, 4);
    const m = clean.slice(4, 6);
    const d = clean.slice(6, 8);
    const candidate = `${y}-${m}-${d}`;
    if (!isNaN(Date.parse(candidate))) return candidate;
  }

  // YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(clean)) {
    const candidate = clean.replace(/\//g, "-");
    if (!isNaN(Date.parse(candidate))) return candidate;
  }

  return null;
}

function emptyResult(raw: string, parserKey: string): ParsedBarcode {
  return {
    partNumber: null,
    quantity: null,
    supplierCode: null,
    lotNumber: null,
    productionDate: null,
    expiryDate: null,
    uom: null,
    packSequence: null,
    serial: null,
    raw,
    segments: {},
    parserKey,
    errors: [],
  };
}

// ── Known Application Identifier (AI) mappings ──

const AI_MAP: Record<string, keyof Omit<ParsedBarcode, "raw" | "segments" | "parserKey" | "errors">> = {
  P: "partNumber",
  "1P": "partNumber",
  Q: "quantity",
  Q1: "quantity",
  V: "supplierCode",
  "1V": "supplierCode",
  T: "lotNumber",
  "1T": "lotNumber",
  D: "productionDate",
  "2D": "productionDate",
  E: "expiryDate",
  U: "uom",
  K: "packSequence",
  S: "serial",
};

// ── GENERIC Parser ──

export function parseGenericBarcode(raw: string): ParsedBarcode {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ...emptyResult(trimmed, "GENERIC"), errors: ["EMPTY_BARCODE"] };
  }

  const delimiter = detectDelimiter(trimmed);
  if (!delimiter) {
    // Try single-segment: might be a plain part number or structured differently
    return {
      ...emptyResult(trimmed, "GENERIC"),
      partNumber: trimmed, // treat entire string as part number fallback
      errors: ["NO_DELIMITER_DETECTED"],
    };
  }

  const segments = trimmed.split(delimiter).filter(Boolean);
  const parsed: Record<string, string> = {};
  const errors: string[] = [];

  for (const seg of segments) {
    const trimSeg = seg.trim();
    if (!trimSeg) continue;

    // Try 2-char AI first, then 1-char
    let matched = false;
    for (const aiLen of [2, 1]) {
      if (trimSeg.length <= aiLen) continue;
      const ai = trimSeg.slice(0, aiLen);
      if (/^[A-Z][A-Z0-9]?$/.test(ai)) {
        parsed[ai] = trimSeg.slice(aiLen).trim();
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Store as positional segment
      parsed[`_pos${Object.keys(parsed).length}`] = trimSeg;
      errors.push(`UNKNOWN_SEGMENT:${trimSeg.slice(0, 20)}`);
    }
  }

  // Map AI → canonical fields
  const result = emptyResult(trimmed, "GENERIC");
  result.segments = parsed;
  result.errors = errors;

  for (const [ai, value] of Object.entries(parsed)) {
    const field = AI_MAP[ai];
    if (!field) continue;

    switch (field) {
      case "quantity":
        result.quantity = toInt(value);
        break;
      case "productionDate":
        result.productionDate = parseDate(value);
        break;
      case "expiryDate":
        result.expiryDate = parseDate(value);
        break;
      default:
        // String fields
        (result as any)[field] = value;
    }
  }

  return result;
}

// ── Parser Registry ──

const parserRegistry: Map<string, BarcodeParser> = new Map();
parserRegistry.set("GENERIC", parseGenericBarcode);

export function registerParser(key: string, parser: BarcodeParser): void {
  parserRegistry.set(key.toUpperCase(), parser);
}

export function getParser(key: string): BarcodeParser {
  return parserRegistry.get(key.toUpperCase()) ?? parseGenericBarcode;
}

/**
 * Parse a barcode using the appropriate parser for the given key.
 * Falls back to GENERIC if key not found.
 */
export function parseBarcode(raw: string, parserKey: string = "GENERIC"): ParsedBarcode {
  const parser = getParser(parserKey);
  return parser(raw);
}

// ── Validation ──

/**
 * Validate a parsed barcode against the expected handover batch items
 * and existing scans to determine the scan result.
 */
export function validateScannedBarcode(
  parsed: ParsedBarcode,
  batchItems: BatchItemForValidation[],
  existingScans: ExistingScanForValidation[],
  options?: { checkExpiry?: boolean }
): ScanValidationResult {
  // 1. Parse success check
  if (
    parsed.errors.includes("EMPTY_BARCODE") ||
    (!parsed.partNumber && parsed.errors.includes("NO_DELIMITER_DETECTED"))
  ) {
    return { result: "PARSE_ERROR", detail: "Cannot parse barcode format" };
  }

  if (!parsed.partNumber) {
    return { result: "PARSE_ERROR", detail: "No part number found in barcode" };
  }

  // 2. Duplicate awareness (same raw barcode already MATCHED in this batch)
  // NOTE: We no longer block duplicates — identical barcodes are expected
  // because all packs of the same part/lot/vendor share the same 2D barcode.
  // Instead, we flag it as informational so the caller can warn the user.
  const previousMatchCount = existingScans.filter(
    (s) => s.barcode_raw === parsed.raw && s.result === "MATCHED"
  ).length;

  // 3. Find matching batch item by part_number (case-insensitive)
  const normalizedPart = parsed.partNumber.toUpperCase().trim();
  const matchingItem = batchItems.find(
    (bi) => bi.part_number.toUpperCase().trim() === normalizedPart
  );
  if (!matchingItem) {
    const expectedParts = batchItems.map((bi) => bi.part_number).join(", ");
    return {
      result: "NOT_FOUND",
      detail: `Part ${parsed.partNumber} not in issued items. Expected: ${expectedParts}`,
    };
  }

  // 4. Expiry check (if enabled and expiry date present)
  if (options?.checkExpiry !== false && parsed.expiryDate) {
    const expiry = new Date(parsed.expiryDate);
    if (!isNaN(expiry.getTime()) && expiry < new Date()) {
      return {
        result: "EXPIRED",
        detail: `Material expired: ${parsed.expiryDate}`,
      };
    }
  }

  // 5. Over-scan warning (matched but already at or above expected)
  const overIntake = matchingItem.scanned_packs >= matchingItem.expected_packs;
  const details: string[] = [];
  if (previousMatchCount > 0) details.push(`ALREADY_SCANNED:${previousMatchCount}`);
  if (overIntake) details.push("OVER_INTAKE_WARNING");
  return {
    result: "MATCHED",
    detail: details.length > 0 ? details.join(",") : undefined,
    matchedItemId: matchingItem.id,
    parsedQty: parsed.quantity ?? undefined,
  };
}
