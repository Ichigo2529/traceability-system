import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { BomRow } from "@traceability/sdk";
import { FormDialog } from "./FormDialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  modelCode,
  onClose,
  onSubmit,
}: {
  open: boolean;
  row?: BomRow | null;
  modelCode?: string;
  submitting?: boolean;
  componentTypeOptions?: Array<{ code: string; name: string }>;
  partNumberOptions?: Array<{
    part_number: string;
    component_type_id?: string | null;
    component_type_code?: string | null;
    default_pack_size?: number | null;
    rm_location?: string | null;
  }>;
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
  const selectedPartNumber = form.watch("component_part_number");
  const selectedPnData = partNumberOptions.find((p) => p.part_number === selectedPartNumber);
  const isAutoFilled = Boolean(selectedPnData);

  return (
    <FormDialog
      open={open}
      title={row ? "Edit BOM Row" : "Add BOM Row"}
      description={
        modelCode
          ? `Maintain BOM row for model ${modelCode}`
          : "Maintain component, part number, location, and qty-per-assembly."
      }
      onClose={onClose}
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={submitting}
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label>Part Number RM</Label>
          <Controller
            name="component_part_number"
            control={form.control}
            render={({ field }) =>
              partNumberOptions.length ? (
                <Select
                  value={field.value || "NONE"}
                  onValueChange={(val) => {
                    field.onChange(val === "NONE" ? "" : val);
                    if (val !== "NONE") {
                      const pnData = partNumberOptions.find((p) => p.part_number === val);
                      if (pnData) {
                        if (pnData.component_type_code) {
                          form.setValue("component_unit_type", pnData.component_type_code);
                          const currentName = form.getValues("component_name");
                          if (!currentName || currentName === form.getValues("component_unit_type")) {
                            form.setValue("component_name", pnData.component_type_code);
                          }
                        }
                        if (pnData.default_pack_size) {
                          form.setValue("qty_per_assy", pnData.default_pack_size);
                        }
                      }
                    } else {
                      form.setValue("component_unit_type", "");
                      form.setValue("component_name", "");
                      form.setValue("qty_per_assy", 1);
                    }
                  }}
                >
                  <SelectTrigger className={err.component_part_number ? "border-destructive" : ""}>
                    <SelectValue placeholder="Not assigned (Manual entry)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Not assigned (Manual entry)</SelectItem>
                    {partNumberOptions.map((pn) => (
                      <SelectItem key={pn.part_number} value={pn.part_number}>
                        {pn.part_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input {...field} placeholder="Enter part number..." value={field.value ?? ""} />
              )
            }
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="bom-component_name">Component Name</Label>
          <Input
            id="bom-component_name"
            {...form.register("component_name")}
            readOnly={isAutoFilled}
            className={err.component_name ? "border-destructive" : ""}
          />
          {err.component_name && <p className="text-sm text-destructive">{err.component_name.message}</p>}
        </div>

        <div className="grid gap-2">
          <Label>Component Unit Type</Label>
          <Controller
            name="component_unit_type"
            control={form.control}
            render={({ field }) =>
              componentTypeOptions.length ? (
                <>
                  <Select
                    value={field.value || "NONE"}
                    onValueChange={(v) => field.onChange(v === "NONE" ? "" : v)}
                    disabled={isAutoFilled}
                  >
                    <SelectTrigger className={err.component_unit_type ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select component type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Select component type</SelectItem>
                      {componentTypeOptions.map((option) => (
                        <SelectItem key={option.code} value={option.code}>
                          {option.code} - {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {err.component_unit_type && (
                    <p className="text-sm text-destructive">{err.component_unit_type.message}</p>
                  )}
                </>
              ) : (
                <>
                  <Input
                    {...field}
                    readOnly={isAutoFilled}
                    placeholder="MAGNET_PACK_UNIT"
                    className={err.component_unit_type ? "border-destructive" : ""}
                  />
                  {err.component_unit_type && (
                    <p className="text-sm text-destructive">{err.component_unit_type.message}</p>
                  )}
                </>
              )
            }
          />
        </div>

        <div className="grid gap-2">
          <Label>Requirement RM (Location)</Label>
          <Input
            value={selectedPnData?.rm_location || ""}
            readOnly
            placeholder={isAutoFilled ? "Not set in Part Number" : "Select Part Number..."}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="bom-qty_per_assy">Use pcs / 1 VCM</Label>
          <Input
            id="bom-qty_per_assy"
            type="number"
            {...form.register("qty_per_assy")}
            readOnly={isAutoFilled && Boolean(selectedPnData?.default_pack_size)}
            className={err.qty_per_assy ? "border-destructive" : ""}
          />
          {err.qty_per_assy && <p className="text-sm text-destructive">{err.qty_per_assy.message}</p>}
        </div>

        <div className="flex items-center gap-2">
          <Controller
            name="required"
            control={form.control}
            render={({ field }) => (
              <Checkbox id="bom-required" checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
            )}
          />
          <Label htmlFor="bom-required" className="cursor-pointer">
            Required component
          </Label>
        </div>
      </div>
    </FormDialog>
  );
}
