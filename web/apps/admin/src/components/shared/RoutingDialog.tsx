import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { RoutingStep } from "@traceability/sdk";
import { FormDialog } from "./FormDialog";
import { CheckBox, Form, FormItem, Input, Label, FlexBox, FlexBoxAlignItems } from "@ui5/webcomponents-react";

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
  onClose,
  onSubmit,
}: {
  open: boolean;
  step?: RoutingStep | null;
  nextSequence?: number;
  modelCode?: string;
  submitting?: boolean;
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
      description={modelCode ? `Maintain routing for model ${modelCode}` : "Maintain step code, sequence and requirements."}
      onClose={onClose}
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={submitting}
      width="540px"
    >
      <Form layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12">
        <FormItem labelContent={<Label required>Step Code</Label>}>
          <Input
            {...form.register("step_code")}
            placeholder="PRESS_FIT"
            valueState={err.step_code ? "Negative" : "None"}
            valueStateMessage={err.step_code ? <div>{err.step_code.message}</div> : undefined}
          />
        </FormItem>

        <FormItem labelContent={<Label required>Sequence</Label>}>
          <Input
            type="Number"
            {...form.register("sequence")}
            valueState={err.sequence ? "Negative" : "None"}
            valueStateMessage={err.sequence ? <div>{err.sequence.message}</div> : undefined}
          />
        </FormItem>

        <FormItem labelContent={<Label>Component Type</Label>}>
          <Input
            {...form.register("component_type")}
            placeholder="PIN430_JIG"
          />
        </FormItem>

        <FormItem labelContent={<Label>Description</Label>}>
          <Input
            {...form.register("description")}
            placeholder="Optional description..."
          />
        </FormItem>

        <FormItem>
          <Controller
            name="mandatory"
            control={form.control}
            render={({ field }) => (
              <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                <CheckBox
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
                <Label onClick={() => field.onChange(!field.value)}>Mandatory step</Label>
              </FlexBox>
            )}
          />
        </FormItem>
      </Form>
    </FormDialog>
  );
}
