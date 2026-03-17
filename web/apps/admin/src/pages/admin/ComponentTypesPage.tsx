import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ComponentType } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { PageLayout } from "@traceability/ui";
import { useToast } from "../../hooks/useToast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2 } from "lucide-react";

const schema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});
type FormValues = z.infer<typeof schema>;

export function ComponentTypesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ComponentType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ComponentType | null>(null);
  const { showToast } = useToast();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["component-types"],
    queryFn: () => sdk.admin.getComponentTypes(),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true },
  });

  const createMutation = useMutation({
    mutationFn: (v: FormValues) => sdk.admin.createComponentType(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["component-types"] });
      setOpen(false);
      form.reset({ code: "", name: "", description: "", is_active: true });
      showToast("Component type created successfully");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (v: FormValues) => sdk.admin.updateComponentType(editing!.id, v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["component-types"] });
      setOpen(false);
      setEditing(null);
      showToast("Component type updated successfully");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteComponentType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["component-types"] });
      showToast("Component type deleted");
    },
  });

  const columns = useMemo<ColumnDef<ComponentType>[]>(
    () => [
      { id: "code", header: "Code", accessorKey: "code" },
      { id: "name", header: "Name", accessorKey: "name" },
      { id: "description", header: "Description", cell: ({ row }) => row.original.description || "-" },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.is_active ? "active" : "disabled"} />,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditing(row.original);
                form.reset({
                  code: row.original.code,
                  name: row.original.name,
                  description: row.original.description || "",
                  is_active: row.original.is_active,
                });
                setOpen(true);
              }}
              title="Edit Component Type"
              aria-label="Edit Component Type"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTarget(row.original)}
              title="Delete Component Type"
              aria-label="Delete Component Type"
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
      title="Component Types"
      subtitle={
        <div className="flex items-center gap-2">
          <span>Canonical component categories for BOM and routing</span>
        </div>
      }
      icon="dimension"
      iconColor="indigo"
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
          data={rows}
          columns={columns}
          loading={isLoading}
          filterPlaceholder="Search component type..."
          actions={
            <Button
              className="button-hover-scale"
              onClick={() => {
                setEditing(null);
                form.reset({ code: "", name: "", description: "", is_active: true });
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Component Type
            </Button>
          }
        />
      </div>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Component Type" : "Create Component Type"}
        onSubmit={form.handleSubmit((v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ct-code">Code</Label>
            <Input id="ct-code" {...form.register("code")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ct-name">Name</Label>
            <Input id="ct-name" {...form.register("name")} />
          </div>
          <div className="flex items-center gap-2">
            <Controller
              name="is_active"
              control={form.control}
              render={({ field }) => (
                <Checkbox id="ct-active" checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
              )}
            />
            <Label htmlFor="ct-active" className="cursor-pointer">
              Active
            </Label>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ct-desc">Description</Label>
            <Textarea id="ct-desc" {...form.register("description")} rows={3} />
          </div>
        </div>
      </FormDialog>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete component type"
        description={deleteTarget ? `Delete component type ${deleteTarget.code}?` : ""}
        confirmText="Delete"
        destructive
        submitting={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />
    </PageLayout>
  );
}
