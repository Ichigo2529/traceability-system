import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Variant } from "@traceability/sdk";
import { FormDialog } from "./FormDialog";
import { CheckBox, Form, FormItem, Input, Label, FlexBox, FlexBoxAlignItems } from "@ui5/webcomponents-react";

export const variantSchema = z.object({
  code: z.string().min(1, "Variant code is required"),
  description: z.string().optional(),
  is_default: z.boolean().default(false),
});

export type VariantForm = z.infer<typeof variantSchema>;

function toDefaultValues(variant?: Variant | null): VariantForm {
  return {
    code: variant?.code || "",
    description: variant?.description || "",
    is_default: variant?.is_default ?? false,
  };
}

export function VariantDialog({
  open,
  variant,
  submitting,
  modelCode,
  onClose,
  onSubmit,
}: {
  open: boolean;
  variant?: Variant | null;
  modelCode?: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (values: VariantForm) => void;
}) {
  const form = useForm<VariantForm>({
    resolver: zodResolver(variantSchema),
    defaultValues: toDefaultValues(variant),
  });

  useEffect(() => {
    if (open) form.reset(toDefaultValues(variant));
  }, [form, open, variant]);

  const err = form.formState.errors;

  return (
    <FormDialog
      open={open}
      title={variant ? "Edit Variant" : "Add Variant"}
      description={modelCode ? `Maintain variant for model ${modelCode}` : "Maintain variant code, description and defaults."}
      onClose={onClose}
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={submitting}
      width="480px"
    >
      <Form layout="S1 M1 L1 XL1" labelSpan="S12 M12 L12 XL12">
        <FormItem labelContent={<Label required>Variant Code</Label>}>
          <Input
            {...form.register("code")}
            placeholder="WITH_SHROUD"
            valueState={err.code ? "Negative" : "None"}
            valueStateMessage={err.code ? <div>{err.code.message}</div> : undefined}
          />
        </FormItem>

        <FormItem labelContent={<Label>Description</Label>}>
          <Input
            {...form.register("description")}
            placeholder="Enter description..."
          />
        </FormItem>

        <FormItem>
          <Controller
            name="is_default"
            control={form.control}
            render={({ field }) => (
              <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                <CheckBox
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
                <Label onClick={() => field.onChange(!field.value)}>Set as default variant</Label>
              </FlexBox>
            )}
          />
        </FormItem>
      </Form>
    </FormDialog>
  );
}
