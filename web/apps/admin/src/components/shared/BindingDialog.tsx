import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LabelBinding, LabelTemplate } from "@traceability/sdk";
import { FormDialog } from "./FormDialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
      description={
        modelCode ? `Maintain label binding for model ${modelCode}` : "Maintain unit type, process point and template."
      }
      onClose={onClose}
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={submitting}
      width="540px"
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="binding-unit_type">Unit Type *</Label>
          <Input
            id="binding-unit_type"
            {...form.register("unit_type")}
            placeholder="FOF_TRAY_20"
            className={err.unit_type ? "border-destructive" : ""}
          />
          {err.unit_type && <p className="text-sm text-destructive">{err.unit_type.message}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="binding-process_point">Process Point *</Label>
          <Input
            id="binding-process_point"
            {...form.register("process_point")}
            placeholder="POST_FVMI"
            className={err.process_point ? "border-destructive" : ""}
          />
          {err.process_point && <p className="text-sm text-destructive">{err.process_point.message}</p>}
        </div>
        <div className="grid gap-2">
          <Label>Label Template *</Label>
          <Controller
            name="label_template_id"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {err.label_template_id && <p className="text-sm text-destructive">{err.label_template_id.message}</p>}
        </div>
      </div>
    </FormDialog>
  );
}
