import { DomainError } from "./errors";

export interface ParsedSupplierPackBarcode {
  supplierCode?: string;
  vendorId?: string;
  partNumber?: string;
  lotNumber?: string;
  packQty?: number;
  productionDate?: string;
  extra?: Record<string, unknown>;
}

export interface SupplierPackParser {
  parse(raw: string): ParsedSupplierPackBarcode;
}

export type BarcodeTemplateDefinition = {
  key: string;
  format: "ASTERISK_DFI";
  identifiers: string[];
  lot_identifiers?: string[];
  quantity_identifiers?: string[];
  part_identifiers?: string[];
  vendor_identifiers?: string[];
  production_date_identifiers?: string[];
};

class GenericKvParser implements SupplierPackParser {
  parse(raw: string): ParsedSupplierPackBarcode {
    const out: ParsedSupplierPackBarcode = {};
    const tokens = raw.split(/[;|,]/).map((p) => p.trim());

    for (const token of tokens) {
      const [k, ...rest] = token.split(/[:=]/);
      if (!k || !rest.length) continue;
      const key = k.trim().toUpperCase();
      const value = rest.join(":").trim();
      if (!value) continue;

      if (["SUP", "SUPPLIER", "SUPPLIER_CODE"].includes(key)) out.supplierCode = value;
      else if (["PN", "PART", "PARTNO", "PART_NUMBER"].includes(key)) out.partNumber = value;
      else if (["LOT", "LOTNO", "LOT_NUMBER"].includes(key)) out.lotNumber = value;
      else if (["QTY", "PACK_QTY", "QTY_PER_PACK"].includes(key)) {
        const n = Number(value);
        if (Number.isFinite(n)) out.packQty = n;
      } else if (["DATE", "PROD_DATE", "PRODUCTION_DATE"].includes(key)) out.productionDate = value;
      else {
        out.extra = out.extra ?? {};
        out.extra[key] = value;
      }
    }

    return out;
  }
}

type DfiTemplate = {
  key: string;
  identifiers: string[];
  lotIdentifiers: string[];
  quantityIdentifiers: string[];
  partIdentifiers: string[];
  vendorIdentifiers: string[];
  productionDateIdentifiers: string[];
};

function toDfiTemplate(input: BarcodeTemplateDefinition): DfiTemplate {
  return {
    key: input.key,
    identifiers: input.identifiers,
    lotIdentifiers: input.lot_identifiers ?? ["LOT", "PT", "PL"],
    quantityIdentifiers: input.quantity_identifiers ?? ["QTY", "Q"],
    partIdentifiers: input.part_identifiers ?? ["P"],
    vendorIdentifiers: input.vendor_identifiers ?? ["V"],
    productionDateIdentifiers: input.production_date_identifiers ?? ["PD", "D", "TD", "MD"],
  };
}

const MARLIN_MAGNET_TEMPLATE: DfiTemplate = {
  key: "MARLIN_MAGNET_V1",
  identifiers: ["3S", "PD", "PL", "PT", "K", "P", "E", "Q", "V", "D", "R"],
  lotIdentifiers: ["PT"],
  quantityIdentifiers: ["Q"],
  partIdentifiers: ["P"],
  vendorIdentifiers: ["V"],
  productionDateIdentifiers: ["PD", "D"],
};

const MARLIN_PLATE_TEMPLATE: DfiTemplate = {
  key: "MARLIN_PLATE_V1",
  identifiers: ["PD", "PL", "PT", "SW", "P", "E", "Q", "V", "R"],
  lotIdentifiers: ["PT"],
  quantityIdentifiers: ["Q"],
  partIdentifiers: ["P"],
  vendorIdentifiers: ["V"],
  productionDateIdentifiers: ["PD"],
};

const MARLIN_PIN_TEMPLATE: DfiTemplate = {
  key: "MARLIN_PIN_V1",
  identifiers: ["TD", "AD", "PS", "PL", "P", "E", "Q", "V", "R"],
  lotIdentifiers: ["PL"],
  quantityIdentifiers: ["Q"],
  partIdentifiers: ["P"],
  vendorIdentifiers: ["V"],
  productionDateIdentifiers: ["TD"],
};

const MARLIN_CRASH_STOP_TEMPLATE: DfiTemplate = {
  key: "MARLIN_CRASH_STOP_V1",
  identifiers: ["MD", "SC", "SD", "OD", "OL", "WO", "P", "E", "Q", "V", "R"],
  lotIdentifiers: ["OL"],
  quantityIdentifiers: ["Q"],
  partIdentifiers: ["P"],
  vendorIdentifiers: ["V"],
  productionDateIdentifiers: ["MD", "OD"],
};

function sanitizeRawToken(value: string) {
  return value.replace(/[\u0000-\u001F]/g, "").trim();
}

function splitAsteriskSegments(raw: string) {
  return raw
    .split("*")
    .map((p) => sanitizeRawToken(p))
    .filter((p) => p.length > 0);
}

function toIntOrNull(value: string | undefined) {
  if (!value) return null;
  const normalized = value.replace(/,/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function normalizeVendorToken(token: string | undefined) {
  if (!token) return "";
  const trimmed = token.trim().toUpperCase();
  const cleaned = trimmed.replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return "";
  // Common format in samples: "0C", "0P", "0F", "0R"
  if (cleaned.length >= 2 && cleaned.startsWith("0")) return cleaned.slice(-1);
  return cleaned.slice(-1);
}

class DfiAsteriskParser implements SupplierPackParser {
  constructor(private readonly template: DfiTemplate) {}

  parse(raw: string): ParsedSupplierPackBarcode {
    const out: ParsedSupplierPackBarcode = {
      extra: {
        template_key: this.template.key,
      },
    };

    const fields: Record<string, string> = {};
    const identifiers = [...this.template.identifiers].sort((a, b) => b.length - a.length);
    const segments = splitAsteriskSegments(raw);

    for (const segment of segments) {
      const dfi = identifiers.find((id) => segment.toUpperCase().startsWith(id));
      if (!dfi) {
        const unknown = (out.extra?.unknown_segments as string[] | undefined) ?? [];
        unknown.push(segment);
        out.extra = { ...(out.extra ?? {}), unknown_segments: unknown };
        continue;
      }
      const value = segment.slice(dfi.length).trim();
      fields[dfi] = value;
    }

    const partId = this.template.partIdentifiers.find((id) => fields[id] != null);
    const qtyId = this.template.quantityIdentifiers.find((id) => fields[id] != null);
    const lotId = this.template.lotIdentifiers.find((id) => fields[id] != null);
    const vendorId = this.template.vendorIdentifiers.find((id) => fields[id] != null);
    const dateId = this.template.productionDateIdentifiers.find((id) => fields[id] != null);

    if (partId) out.partNumber = fields[partId]?.toUpperCase();
    if (qtyId) {
      const qty = toIntOrNull(fields[qtyId]);
      if (qty != null) out.packQty = qty;
    }
    if (lotId) out.lotNumber = fields[lotId];
    if (dateId) out.productionDate = fields[dateId];
    if (vendorId) {
      out.supplierCode = fields[vendorId];
      out.vendorId = normalizeVendorToken(fields[vendorId]);
    }

    out.extra = {
      ...(out.extra ?? {}),
      fields,
    };
    return out;
  }
}

const VENDOR_ID_BY_VENDOR_CODE: Record<string, string> = {
  DP: "P",
  DUFU: "F",
  IPM: "P",
  "DP-M(MPMT)": "F",
  INTRIPLEX: "I",
  CFTC: "C",
  RAYCO: "R",
};

export function getVendorIdByVendorCode(codeOrName: string | null | undefined) {
  if (!codeOrName) return null;
  const key = String(codeOrName).trim().toUpperCase();
  if (!key) return null;
  return VENDOR_ID_BY_VENDOR_CODE[key] ?? null;
}

export function normalizeVendorIdToken(input: string | null | undefined) {
  const v = normalizeVendorToken(input ?? "");
  return v || null;
}

const parserRegistry: Record<string, SupplierPackParser> = {
  GENERIC: new GenericKvParser(),
  MARLIN_MAGNET_V1: new DfiAsteriskParser(MARLIN_MAGNET_TEMPLATE),
  MARLIN_PLATE_V1: new DfiAsteriskParser(MARLIN_PLATE_TEMPLATE),
  MARLIN_PIN_V1: new DfiAsteriskParser(MARLIN_PIN_TEMPLATE),
  MARLIN_CRASH_STOP_V1: new DfiAsteriskParser(MARLIN_CRASH_STOP_TEMPLATE),
};

export function registerSupplierPackParser(key: string, parser: SupplierPackParser) {
  parserRegistry[key.toUpperCase()] = parser;
}

export function parseSupplierPackBarcode(raw: string, parserKey?: string): ParsedSupplierPackBarcode {
  const selected = (parserKey ?? "GENERIC").toUpperCase();
  const parser = parserRegistry[selected];
  if (!parser) throw new DomainError("PARSER_NOT_FOUND", `Unknown supplier parser "${selected}"`, 400);
  return parser.parse(raw);
}

export function parseSupplierPackBarcodeWithTemplate(
  raw: string,
  template: BarcodeTemplateDefinition
): ParsedSupplierPackBarcode {
  if (template.format !== "ASTERISK_DFI") {
    throw new DomainError("INVALID_TEMPLATE", `Unsupported template format "${template.format}"`, 400);
  }
  const parser = new DfiAsteriskParser(toDfiTemplate(template));
  return parser.parse(raw);
}

export function listSupplierPackParsers(): string[] {
  return Object.keys(parserRegistry).sort();
}
