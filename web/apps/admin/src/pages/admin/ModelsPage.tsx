import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ColumnDef } from "@tanstack/react-table";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Model } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { DataTable } from "../../components/shared/DataTable";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { FormDialog } from "../../components/shared/FormDialog";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { PageLayout } from "@traceability/ui";
import { Button } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "../../hooks/useToast";
import { Plus, Pencil, GitBranch } from "lucide-react";
const modelSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  part_number: z.string().optional().or(z.literal("")),
  pack_size: z.coerce.number().min(1).optional(),
  active: z.boolean().default(true),
  description: z.string().optional().or(z.literal("")),
});
type ModelForm = z.infer<typeof modelSchema>;

const defaultValues: ModelForm = {
  code: "",
  name: "",
  part_number: "",
  pack_size: 1,
  active: true,
  description: "",
};

export function ModelsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Model | null>(null);
  const editingRef = useRef<Model | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Model | null>(null);
  const { showToast } = useToast();

  const form = useForm<ModelForm>({
    resolver: zodResolver(modelSchema),
    defaultValues,
  });

  const { data: models = [], isLoading } = useQuery({ queryKey: ["models"], queryFn: () => sdk.admin.getModels() });

  const createMutation = useMutation({
    mutationFn: (payload: ModelForm) =>
      sdk.admin.createModel({
        code: payload.code,
        name: payload.name,
        part_number: payload.part_number || undefined,
        pack_size: payload.pack_size,
        active: payload.active,
        description: payload.description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      setOpen(false);
      form.reset(defaultValues);
      showToast("Model created successfully");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: ModelForm) =>
      sdk.admin.updateModel(editingRef.current!.id, {
        code: payload.code,
        name: payload.name,
        part_number: payload.part_number || undefined,
        pack_size: payload.pack_size,
        active: payload.active,
        description: payload.description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      setOpen(false);
      setEditing(null);
      editingRef.current = null;
      showToast("Model updated successfully");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      setDeleteTarget(null);
      showToast("Model deleted");
    },
  });

  const columns = useMemo<ColumnDef<Model>[]>(
    () => [
      {
        id: "code",
        header: "Code",
        accessorKey: "code",
        minSize: 88,
        maxSize: 140,
        meta: { flex: 0.9 },
      },
      {
        id: "name",
        header: "Name",
        accessorKey: "name",
        minSize: 100,
        maxSize: 240,
        meta: { flex: 1.4 },
      },
      {
        id: "part_number",
        header: "Part #",
        accessorKey: "part_number",
        minSize: 72,
        maxSize: 120,
        meta: { flex: 0.85 },
        cell: ({ row }) => row.original.part_number || "—",
      },
      {
        id: "pack_size",
        header: "Pack",
        accessorKey: "pack_size",
        size: 52,
        minSize: 48,
        maxSize: 56,
        meta: { fixed: true },
      },
      {
        id: "active_revision",
        header: "Rev",
        accessorKey: "active_revision_code",
        size: 56,
        minSize: 52,
        maxSize: 64,
        meta: { fixed: true },
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">{row.original.active_revision_code || "—"}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        size: 76,
        minSize: 72,
        maxSize: 88,
        meta: { fixed: true },
        cell: ({ row }) => <StatusBadge status={row.original.active ? "active" : "disabled"} />,
      },
      {
        id: "revisions",
        header: "Revs",
        size: 52,
        minSize: 48,
        maxSize: 52,
        meta: { fixed: true },
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              title={`Revisions — ${row.original.code}`}
              aria-label={`Open revisions for ${row.original.code}`}
              onClick={() => navigate(`/admin/models/${row.original.id}`)}
            >
              <GitBranch className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        ),
      },
      {
        id: "actions",
        header: "Edit",
        size: 76,
        minSize: 72,
        maxSize: 80,
        meta: { fixed: true },
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Edit Model"
              aria-label="Edit Model"
              onClick={(e) => {
                e.preventDefault();
                const model = row.original;
                setEditing(model);
                editingRef.current = model;
                form.reset({
                  code: model.code,
                  name: model.name,
                  part_number: model.part_number || "",
                  pack_size: model.pack_size ?? 1,
                  active: model.active ?? true,
                  description: model.description || "",
                });
                setOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <DeleteIconButton
              title="Delete Model"
              aria-label="Delete Model"
              onClick={(e) => {
                e.preventDefault();
                setDeleteTarget(row.original);
              }}
            />
          </div>
        ),
      },
    ],
    [form, navigate]
  );

  return (
    <PageLayout
      title="Models"
      subtitle="Product models and tray pack settings. Open revisions to manage BOM and routing."
      icon="product"
      iconColor="blue"
      maxWidth="100%"
    >
      <div className="page-container">
        <ApiErrorBanner
          message={
            createMutation.error
              ? formatApiError(createMutation.error)
              : updateMutation.error
                ? formatApiError(updateMutation.error)
                : deleteMutation.error
                  ? formatApiError(deleteMutation.error)
                  : undefined
          }
        />

        <DataTable
          data={models}
          columns={columns}
          loading={isLoading}
          filterPlaceholder="Search models..."
          actions={
            <Button
              className="button-hover-scale"
              onClick={() => {
                setEditing(null);
                editingRef.current = null;
                form.reset(defaultValues);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Model
            </Button>
          }
        />
      </div>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Model" : "Create Model"}
        onSubmit={form.handleSubmit((values) =>
          editing ? updateMutation.mutate(values) : createMutation.mutate(values)
        )}
        submitting={createMutation.isPending || updateMutation.isPending}
        contentClassName="max-w-md"
      >
        <div className="grid gap-4 p-4">
          <div className="grid gap-2">
            <Label htmlFor="model-code">Model Code *</Label>
            <Input
              id="model-code"
              {...form.register("code")}
              disabled={Boolean(editing)}
              className={form.formState.errors.code ? "border-destructive" : ""}
            />
            {form.formState.errors.code && (
              <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="model-name">Model Name *</Label>
            <Input
              id="model-name"
              {...form.register("name")}
              className={form.formState.errors.name ? "border-destructive" : ""}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="model-part_number">Part Number</Label>
            <Input id="model-part_number" {...form.register("part_number")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="model-pack_size">FOF Tray Pack Size</Label>
            <Input
              id="model-pack_size"
              type="number"
              min={1}
              {...form.register("pack_size", { valueAsNumber: true })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="model-description">Description</Label>
            <Input id="model-description" {...form.register("description")} />
          </div>
          <div className="flex items-center gap-2">
            <Controller
              control={form.control}
              name="active"
              render={({ field }) => (
                <>
                  <Checkbox id="model-active" checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                  <Label htmlFor="model-active" className="cursor-pointer font-normal">
                    Active
                  </Label>
                </>
              )}
            />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Model"
        description={deleteTarget ? `Are you sure you want to delete model "${deleteTarget.name}"?` : ""}
        confirmText="Delete"
        destructive
        submitting={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </PageLayout>
  );
}
