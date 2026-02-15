import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { BomRow } from "@traceability/sdk";
import { FormDialog } from "./FormDialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const bomSchema = z.object({
  component_name: z.string().min(1, "Component name is required"),
  component_unit_type: z.string().min(1, "Component unit type is required"),
  component_part_number: z.string().optional(),
  rm_location: z.string().optional(),
  qty_per_assy: z.coerce.number().int().positive(),
  required: z.boolean().default(true),
});

export type BomRowForm = z.infer<typeof bomSchema>;

function toDefaultValues(row?: BomRow | null): BomRowForm {
  return {
    component_name: row?.component_name || row?.component_unit_type || "",
    component_unit_type: row?.component_unit_type || "",
    component_part_number: row?.component_part_number || "",
    rm_location: row?.rm_location || "",
    qty_per_assy: row?.qty_per_assy ?? 1,
    required: row?.required ?? true,
  };
}

export function BomRowDialog({
  open,
  row,
  submitting,
  componentTypeOptions = [],
  partNumberOptions = [],
  onClose,
  onSubmit,
}: {
  open: boolean;
  row?: BomRow | null;
  submitting?: boolean;
  componentTypeOptions?: Array<{ code: string; name: string }>;
  partNumberOptions?: string[];
  onClose: () => void;
  onSubmit: (values: BomRowForm) => void;
}) {
  const form = useForm<BomRowForm>({
    resolver: zodResolver(bomSchema),
    defaultValues: toDefaultValues(row),
  });

  useEffect(() => {
    if (open) form.reset(toDefaultValues(row));
  }, [form, open, row]);

  const err = form.formState.errors;

  return (
    <FormDialog
      open={open}
      title={row ? "Edit BOM Row" : "Add BOM Row"}
      description="Maintain component, part number, location, and qty-per-assembly."
      onClose={onClose}
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={submitting}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Component</Label>
          <Input {...form.register("component_name")} />
          {err.component_name ? <p className="text-xs text-red-600">{err.component_name.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label>Component Unit Type</Label>
          {componentTypeOptions.length ? (
            <Select value={form.watch("component_unit_type")} onValueChange={(v) => form.setValue("component_unit_type", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select component type" />
              </SelectTrigger>
              <SelectContent>
                {componentTypeOptions.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.code} - {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input {...form.register("component_unit_type")} placeholder="MAGNET_PACK_UNIT" />
          )}
          {err.component_unit_type ? <p className="text-xs text-red-600">{err.component_unit_type.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label>Part Number RM</Label>
          {partNumberOptions.length ? (
            <Select value={form.watch("component_part_number") || "NONE"} onValueChange={(v) => form.setValue("component_part_number", v === "NONE" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select part number" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Not assigned</SelectItem>
                {partNumberOptions.map((pn) => (
                  <SelectItem key={pn} value={pn}>
                    {pn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input {...form.register("component_part_number")} />
          )}
        </div>
        <div className="space-y-2">
          <Label>Location</Label>
          <Input {...form.register("rm_location")} placeholder="2001" />
        </div>
        <div className="space-y-2">
          <Label>Use pcs / 1 VCM</Label>
          <Input type="number" {...form.register("qty_per_assy")} />
          {err.qty_per_assy ? <p className="text-xs text-red-600">{err.qty_per_assy.message}</p> : null}
        </div>
        <div className="md:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.watch("required")}
              onCheckedChange={(v) => form.setValue("required", Boolean(v))}
            />
            Required component
          </label>
        </div>
      </div>
    </FormDialog>
  );
}
