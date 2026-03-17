import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MasterRoutingStep, RoutingStep } from "@traceability/sdk";
import { FormDialog } from "./FormDialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const routingSchema = z.object({
  step_code: z.string().min(1, "Step code is required"),
  sequence: z.coerce.number().int().positive("Sequence must be a positive number"),
  mandatory: z.boolean().default(true),
  description: z.string().optional(),
  component_type: z.string().optional(),
});

export type RoutingForm = z.infer<typeof routingSchema>;

function toDefaultValues(step?: RoutingStep | null, nextSequence?: number): RoutingForm {
  return {
    step_code: step?.step_code || "",
    sequence: step?.sequence ?? nextSequence ?? 1,
    mandatory: step?.mandatory ?? true,
    description: step?.description || "",
    component_type: step?.component_type || "",
  };
}

export function RoutingDialog({
  open,
  step,
  nextSequence,
  submitting,
  modelCode,
  masterSteps,
  onClose,
  onSubmit,
}: {
  open: boolean;
  step?: RoutingStep | null;
  nextSequence?: number;
  modelCode?: string;
  submitting?: boolean;
  masterSteps?: MasterRoutingStep[];
  onClose: () => void;
  onSubmit: (values: RoutingForm) => void;
}) {
  const form = useForm<RoutingForm>({
    resolver: zodResolver(routingSchema),
    defaultValues: toDefaultValues(step, nextSequence),
  });

  useEffect(() => {
    if (open) form.reset(toDefaultValues(step, nextSequence));
  }, [form, open, step, nextSequence]);

  const err = form.formState.errors;

  return (
    <FormDialog
      open={open}
      title={step ? "Edit Routing Step" : "Add Routing Step"}
      description={
        modelCode ? `Maintain routing for model ${modelCode}` : "Maintain step code, sequence and requirements."
      }
      onClose={onClose}
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={submitting}
      width="540px"
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label>Step Code *</Label>
          <Controller
            control={form.control}
            name="step_code"
            render={({ field }) => (
              <Select
                value={field.value || ""}
                onValueChange={(val) => {
                  field.onChange(val);
                  const masterStep = masterSteps?.find((s) => s.step_code === val);
                  if (masterStep?.description && !form.getValues("description")) {
                    form.setValue("description", masterStep.description, { shouldValidate: true });
                  }
                }}
              >
                <SelectTrigger className={err.step_code ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select a step..." />
                </SelectTrigger>
                <SelectContent>
                  {(masterSteps || []).map((ms) => (
                    <SelectItem key={ms.id} value={ms.step_code}>
                      {ms.step_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {err.step_code && <p className="text-sm text-destructive">{err.step_code.message}</p>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="routing-sequence">Sequence *</Label>
          <Input
            id="routing-sequence"
            type="number"
            {...form.register("sequence")}
            className={err.sequence ? "border-destructive" : ""}
          />
          {err.sequence && <p className="text-sm text-destructive">{err.sequence.message}</p>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="routing-component_type">Component Type</Label>
          <Input id="routing-component_type" {...form.register("component_type")} placeholder="PIN430_JIG" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="routing-description">Description</Label>
          <Input id="routing-description" {...form.register("description")} placeholder="Optional description..." />
        </div>

        <div className="flex items-center gap-2">
          <Controller
            name="mandatory"
            control={form.control}
            render={({ field }) => (
              <Checkbox id="routing-mandatory" checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
            )}
          />
          <Label htmlFor="routing-mandatory" className="cursor-pointer">
            Mandatory step
          </Label>
        </div>
      </div>
    </FormDialog>
  );
}
