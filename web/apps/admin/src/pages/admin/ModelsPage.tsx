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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "../../hooks/useToast";
import { Plus, Pencil, Trash2 } from "lucide-react";

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
      { id: "code", header: "Model Code", accessorKey: "code", minSize: 120 },
      { id: "name", header: "Model Name", accessorKey: "name", minSize: 200 },
      {
        id: "part_number",
        header: "Part Number",
        accessorKey: "part_number",
        minSize: 140,
        cell: ({ row }) => row.original.part_number || "-",
      },
      { id: "pack_size", header: "FOF Tray Pack Size", accessorKey: "pack_size", minSize: 140 },
      {
        id: "active_revision",
        header: "Active Revision",
        accessorKey: "active_revision_code",
        minSize: 140,
        cell: ({ row }) => row.original.active_revision_code || "-",
      },
      {
        id: "status",
        header: "Status",
        minSize: 100,
        cell: ({ row }) => <StatusBadge status={row.original.active ? "active" : "disabled"} />,
      },
      {
        id: "actions",
        header: "Actions",
        size: 100,
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Edit Model"
              aria-label="Edit Model"
              onClick={(e) => {
                e.stopPropagation();
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Delete Model"
              aria-label="Delete Model"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(row.original);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [form]
  );

  return (
    <PageLayout
      title="Models"
      subtitle={
        <div className="flex items-center gap-2">
          <span>Manage product models and specifications</span>
        </div>
      }
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
          onRowClick={(row) => navigate(`/admin/models/${row.id}`)}
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
