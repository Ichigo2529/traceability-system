import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { BomRow } from "@traceability/sdk";
import { FormDialog } from "./FormDialog";
import { Select, Option, CheckBox, Form, FormItem, Input, Label } from "@ui5/webcomponents-react";

const bomSchema = z.object({
  component_name: z.string().min(1, "Component name is required"),
  component_unit_type: z.string().min(1, "Component unit type is required"),
  component_part_number: z.string().optional(),
  qty_per_assy: z.coerce.number().int().positive(),
  required: z.boolean().default(true),
});

export type BomRowForm = z.infer<typeof bomSchema>;

function toDefaultValues(row?: BomRow | null): BomRowForm {
  return {
    component_name: row?.component_name || row?.component_unit_type || "",
    component_unit_type: row?.component_unit_type || "",
    component_part_number: row?.component_part_number || "",
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
  partNumberOptions?: Array<{ part_number: string; component_type_id?: string | null; component_type_code?: string | null; default_pack_size?: number | null; rm_location?: string | null }>;
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
      description={modelCode ? `Maintain BOM row for model ${modelCode}` : "Maintain component, part number, location, and qty-per-assembly."}
      onClose={onClose}
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={submitting}
    >
      <Form layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12">
        <FormItem labelContent={<Label>Part Number RM</Label>}>
          <Controller
            name="component_part_number"
            control={form.control}
            render={({ field }) =>
              partNumberOptions.length ? (
                <Select
                  onChange={(e) => {
                    const val = (e.detail.selectedOption as unknown as { value: string }).value;
                    field.onChange(val === "NONE" ? "" : val);

                    // Auto-fill logic
                    if (val !== "NONE") {
                      const pnData = partNumberOptions.find((p) => p.part_number === val);
                      if (pnData) {
                        // Attempt to match the related component type code if present
                        if (pnData.component_type_code) {
                            form.setValue("component_unit_type", pnData.component_type_code);
                            // Also default component name to component type if empty
                            const currentName = form.getValues("component_name");
                            if (!currentName || currentName === form.getValues("component_unit_type")) {
                                form.setValue("component_name", pnData.component_type_code);
                            }
                        }
                        // Default the usage qty if a default is set
                        if (pnData.default_pack_size) {
                            form.setValue("qty_per_assy", pnData.default_pack_size);
                        }
                      }
                    } else {
                      // Clear values when "Not assigned" is picked
                      form.setValue("component_unit_type", "");
                      form.setValue("component_name", "");
                      form.setValue("qty_per_assy", 1);
                    }
                  }}
                  value={field.value || "NONE"}
                >
                  <Option value="NONE">Not assigned (Manual entry)</Option>
                  {partNumberOptions.map((pn) => (
                    <Option key={pn.part_number} value={pn.part_number}>
                      {pn.part_number}
                    </Option>
                  ))}
                </Select>
              ) : (
                <Input {...field} placeholder="Enter part number..." />
              )
            }
          />
        </FormItem>

        <FormItem labelContent={<Label>Component Name</Label>}>
          <Input
            {...form.register("component_name")}
            readonly={isAutoFilled}
            valueState={err.component_name ? "Negative" : "None"}
            valueStateMessage={err.component_name ? <div>{err.component_name.message}</div> : undefined}
          />
        </FormItem>
        
        <FormItem labelContent={<Label>Component Unit Type</Label>}>
          <Controller
            name="component_unit_type"
            control={form.control}
            render={({ field }) =>
              componentTypeOptions.length ? (
                <Select
                  onChange={(e) => {
                    const selected = e.detail.selectedOption as unknown as { value: string };
                    field.onChange(selected.value === "NONE" ? "" : selected.value);
                  }}
                  value={field.value || "NONE"}
                  valueState={err.component_unit_type ? "Negative" : "None"}
                  valueStateMessage={err.component_unit_type ? <div>{err.component_unit_type.message}</div> : undefined}
                  disabled={isAutoFilled}
                >
                  <Option value="NONE">Select component type</Option>
                  {componentTypeOptions.map((option) => (
                    <Option key={option.code} value={option.code}>
                      {option.code} - {option.name}
                    </Option>
                  ))}
                </Select>
              ) : (
                <Input
                  {...field}
                  readonly={isAutoFilled}
                  placeholder="MAGNET_PACK_UNIT"
                  valueState={err.component_unit_type ? "Negative" : "None"}
                  valueStateMessage={err.component_unit_type ? <div>{err.component_unit_type.message}</div> : undefined}
                />
              )
            }
          />
        </FormItem>
        <FormItem labelContent={<Label>Requirement RM (Location)</Label>}>
          <Input 
            value={selectedPnData?.rm_location || ""} 
            readonly 
            placeholder={isAutoFilled ? "Not set in Part Number" : "Select Part Number..."} 
          />
        </FormItem>

        <FormItem labelContent={<Label>Use pcs / 1 VCM</Label>}>
          <Input
            type="Number"
            {...form.register("qty_per_assy")}
            readonly={isAutoFilled && Boolean(selectedPnData?.default_pack_size)}
            valueState={err.qty_per_assy ? "Negative" : "None"}
            valueStateMessage={err.qty_per_assy ? <div>{err.qty_per_assy.message}</div> : undefined}
          />
        </FormItem>

        <FormItem>
          <Controller
            name="required"
            control={form.control}
            render={({ field }) => (
              <CheckBox
                text="Required component"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            )}
          />
        </FormItem>
      </Form>
    </FormDialog>
  );
}
