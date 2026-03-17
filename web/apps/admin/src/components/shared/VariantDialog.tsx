import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Variant } from "@traceability/sdk";
import { FormDialog } from "./FormDialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

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
      description={
        modelCode ? `Maintain variant for model ${modelCode}` : "Maintain variant code, description and defaults."
      }
      onClose={onClose}
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={submitting}
      width="480px"
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="variant-code">Variant Code *</Label>
          <Input
            id="variant-code"
            {...form.register("code")}
            placeholder="WITH_SHROUD"
            className={err.code ? "border-destructive" : ""}
          />
          {err.code && <p className="text-sm text-destructive">{err.code.message}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="variant-description">Description</Label>
          <Input id="variant-description" {...form.register("description")} placeholder="Enter description..." />
        </div>
        <div className="flex items-center gap-2">
          <Controller
            name="is_default"
            control={form.control}
            render={({ field }) => (
              <Checkbox id="variant-is_default" checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
            )}
          />
          <Label
            htmlFor="variant-is_default"
            className="cursor-pointer"
            onClick={() => form.setValue("is_default", !form.watch("is_default"))}
          >
            Set as default variant
          </Label>
        </div>
      </div>
    </FormDialog>
  );
}
