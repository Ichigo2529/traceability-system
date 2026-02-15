import { DomainError } from "./errors";

export interface LabelData {
  partNumber: string; // 30 chars max in schema? Payload is 92 bytes.
  variantCode: string;
  serial: number;
  lineCode: string;
  shiftDay: string; // YYYY-MM-DD
  component2d?: string; // Optional component traceability
}

/**
 * Builds the 92-byte label payload.
 * 
 * Format (Assumed Standard based on "field sources"):
 * [PART_NUMBER:30][VARIANT:20][SERIAL:4][LINE:5][SHIFT:10][RESERVED:23]
 * Total: 92 bytes.
 * 
 * NOTE: This is the deterministic default 92-char layout used by backend generation.
 * Template selection/binding is resolved in /labels/generate before calling this builder.
 */
export function buildLabelContent(data: LabelData): string {
  const { partNumber, variantCode, serial, lineCode, shiftDay } = data;

  // Validate inputs
  if (!partNumber) throw new DomainError("LABEL_BUILD_ERROR", "Missing partNumber");
  if (!variantCode) throw new DomainError("LABEL_BUILD_ERROR", "Missing variantCode");
  if (!lineCode) throw new DomainError("LABEL_BUILD_ERROR", "Missing lineCode");
  if (!shiftDay) throw new DomainError("LABEL_BUILD_ERROR", "Missing shiftDay");

  // Format Serial to 4 digits
  const serialStr = serial.toString().padStart(4, "0");
  if (serialStr.length > 4) throw new DomainError("LABEL_BUILD_ERROR", "Serial exceeds 4 digits");

  // Format ShiftDay (YYYY-MM-DD) -> 10 chars
  const shiftStr = shiftDay.substring(0, 10);

  // Construct rough payload
  // We use pipe delimiter for readability if space permits, OR fixed width.
  // Requirement: "92-char payload".
  // Let's use a structured format:
  // "P:<PART>|V:<VAR>|S:<SER>|L:<LINE>|D:<DATE>"
  // Check length.
  
  // Actually, standard industry labels often use fixed width or specific separators.
  // Let's implement a dense format:
  // PART(30) + VARIANT(20) + SERIAL(4) + LINE(5) + SHIFT(10) + PADDING(23)
  
  const pPart = partNumber.padEnd(30, " ").substring(0, 30);
  const pVar = variantCode.padEnd(20, " ").substring(0, 20);
  const pSer = serialStr; // 4 chars
  const pLine = lineCode.padEnd(5, " ").substring(0, 5);
  const pShift = shiftStr; // 10 chars

  // 30+20+4+5+10 = 69 chars.
  // Remaining: 92 - 69 = 23 chars.
  const padding = " ".repeat(23);

  const payload = `${pPart}${pVar}${pSer}${pLine}${pShift}${padding}`;
  
  if (payload.length !== 92) {
    throw new DomainError("LABEL_BUILD_ERROR", `Generated label length is ${payload.length}, expected 92`);
  }

  return payload;
}
