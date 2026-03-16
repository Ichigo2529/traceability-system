import { z } from "zod";

// ── Line item schema ────────────────────────────────────────────────────────
export const MaterialRequestLineSchema = z.object({
  item_no: z.number(),
  model_id: z.string().min(1, "Please select a model"),
  part_number: z.string().min(1, "Please select a part number"),
  description: z.string().optional().default(""),
  requested_qty: z
    .number({ required_error: "Quantity is required", invalid_type_error: "Quantity is required" })
    .positive("Quantity must be greater than 0"),
  uom: z.string().default("PCS"),
  remarks: z.string().optional().default(""),
});

// ── Full form schema ────────────────────────────────────────────────────────
export const MaterialRequestFormSchema = z
  .object({
    cost_center_id: z.string().min(1, "Please select a cost center"),
    lines: z
      .array(MaterialRequestLineSchema)
      .min(1, "At least one item with a part number is required"),
  })
  .refine(
    (data) => {
      const modelIds = new Set(data.lines.map((l) => l.model_id).filter(Boolean));
      return modelIds.size <= 1;
    },
    { message: "All items must belong to the same model", path: ["_form"] }
  );

// ── Error shape ─────────────────────────────────────────────────────────────
export type MaterialRequestLineErrors = {
  model_id?: string;
  part_number?: string;
  requested_qty?: string;
};

export type MaterialRequestFormErrors = {
  cost_center_id?: string;
  lines?: (MaterialRequestLineErrors | undefined)[];
  _form?: string;
};

// ── Validator ───────────────────────────────────────────────────────────────

type RawLine = {
  item_no: number;
  model_id: string;
  part_number: string;
  description: string;
  requested_qty?: number;
  uom: string;
  remarks: string;
};

export function validateMaterialRequestForm(data: {
  cost_center_id: string;
  lines: RawLine[];
}): { success: true } | { success: false; errors: MaterialRequestFormErrors } {
  const filledLines = data.lines.filter((l) => l.part_number.trim().length > 0);

  const result = MaterialRequestFormSchema.safeParse({
    cost_center_id: data.cost_center_id,
    lines: filledLines,
  });

  if (result.success) return { success: true };

  const errors: MaterialRequestFormErrors = {};

  for (const issue of result.error.issues) {
    const path = issue.path;
    const [first, ...rest] = path;

    if (first === "cost_center_id") {
      errors.cost_center_id = issue.message;
    } else if (first === "lines" && typeof rest[0] === "number") {
      const lineIdx = rest[0];
      const field = rest[1] as string | undefined;
      if (!errors.lines) errors.lines = [];
      if (!errors.lines[lineIdx]) errors.lines[lineIdx] = {};
      if (field === "model_id") errors.lines[lineIdx]!.model_id = issue.message;
      if (field === "part_number") errors.lines[lineIdx]!.part_number = issue.message;
      if (field === "requested_qty") errors.lines[lineIdx]!.requested_qty = issue.message;
    } else if (first === "_form" || first === "lines") {
      errors._form = issue.message;
    }
  }

  return { success: false, errors };
}
