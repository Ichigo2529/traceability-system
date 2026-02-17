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
      <Form layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12">
        <FormItem labelContent={<Label>Component</Label>}>
          <Input
            {...form.register("component_name")}
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
                  onChange={(e) => field.onChange(e.target.value)}
                  value={field.value}
                  valueState={err.component_unit_type ? "Negative" : "None"}
                  valueStateMessage={err.component_unit_type ? <div>{err.component_unit_type.message}</div> : undefined}
                >
                  <Option value="">Select component type</Option>
                  {componentTypeOptions.map((option) => (
                    <Option key={option.code} value={option.code}>
                      {option.code} - {option.name}
                    </Option>
                  ))}
                </Select>
              ) : (
                <Input
                  {...field}
                  placeholder="MAGNET_PACK_UNIT"
                  valueState={err.component_unit_type ? "Negative" : "None"}
                  valueStateMessage={err.component_unit_type ? <div>{err.component_unit_type.message}</div> : undefined}
                />
              )
            }
          />
        </FormItem>

        <FormItem labelContent={<Label>Part Number RM</Label>}>
          <Controller
            name="component_part_number"
            control={form.control}
            render={({ field }) =>
              partNumberOptions.length ? (
                <Select
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val === "NONE" ? "" : val);
                  }}
                  value={field.value || "NONE"}
                >
                  <Option value="NONE">Not assigned</Option>
                  {partNumberOptions.map((pn) => (
                    <Option key={pn} value={pn}>
                      {pn}
                    </Option>
                  ))}
                </Select>
              ) : (
                <Input {...field} />
              )
            }
          />
        </FormItem>

        <FormItem labelContent={<Label>Location</Label>}>
          <Input {...form.register("rm_location")} placeholder="2001" />
        </FormItem>

        <FormItem labelContent={<Label>Use pcs / 1 VCM</Label>}>
          <Input
            type="Number"
            {...form.register("qty_per_assy")}
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
