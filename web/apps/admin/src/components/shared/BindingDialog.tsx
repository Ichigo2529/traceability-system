import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LabelBinding, LabelTemplate } from "@traceability/sdk";
import { FormDialog } from "./FormDialog";
import { Form, FormItem, Input, Label, Select, Option } from "@ui5/webcomponents-react";

export const bindingSchema = z.object({
  unit_type: z.string().min(1, "Unit type is required"),
  process_point: z.string().min(1, "Process point is required"),
  label_template_id: z.string().min(1, "Label template is required"),
});

export type BindingForm = z.infer<typeof bindingSchema>;

function toDefaultValues(binding?: LabelBinding | null, templates?: LabelTemplate[]): BindingForm {
  return {
    unit_type: binding?.unit_type || "FOF_TRAY_20",
    process_point: binding?.process_point || "POST_FVMI_LABEL",
    label_template_id: binding?.label_template_id || (templates && templates.length > 0 ? templates[0].id : ""),
  };
}

export function BindingDialog({
  open,
  binding,
  templates = [],
  submitting,
  modelCode,
  onClose,
  onSubmit,
}: {
  open: boolean;
  binding?: LabelBinding | null;
  templates?: LabelTemplate[];
  modelCode?: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (values: BindingForm) => void;
}) {
  const form = useForm<BindingForm>({
    resolver: zodResolver(bindingSchema),
    defaultValues: toDefaultValues(binding, templates),
  });

  useEffect(() => {
    if (open) form.reset(toDefaultValues(binding, templates));
  }, [form, open, binding, templates]);

  const err = form.formState.errors;

  return (
    <FormDialog
      open={open}
      title={binding ? "Edit Label Binding" : "Add Label Binding"}
      description={modelCode ? `Maintain label binding for model ${modelCode}` : "Maintain unit type, process point and template."}
      onClose={onClose}
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={submitting}
      width="540px"
    >
      <Form layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12">
        <FormItem labelContent={<Label required>Unit Type</Label>}>
          <Input
            {...form.register("unit_type")}
            placeholder="FOF_TRAY_20"
            valueState={err.unit_type ? "Negative" : "None"}
            valueStateMessage={err.unit_type ? <div>{err.unit_type.message}</div> : undefined}
          />
        </FormItem>

        <FormItem labelContent={<Label required>Process Point</Label>}>
          <Input
            {...form.register("process_point")}
            placeholder="POST_FVMI"
            valueState={err.process_point ? "Negative" : "None"}
            valueStateMessage={err.process_point ? <div>{err.process_point.message}</div> : undefined}
          />
        </FormItem>

        <FormItem labelContent={<Label required>Label Template</Label>}>
          <Controller
            name="label_template_id"
            control={form.control}
            render={({ field }) => (
              <Select
                onChange={(e) => {
                  const selected = (e.detail.selectedOption as unknown as { value: string }).value;
                  field.onChange(selected);
                }}
                value={field.value}
                style={{ width: "100%" }}
              >
                {templates.map((t) => (
                  <Option key={t.id} value={t.id}>
                    {t.name}
                  </Option>
                ))}
              </Select>
            )}
          />
        </FormItem>
      </Form>
    </FormDialog>
  );
}
