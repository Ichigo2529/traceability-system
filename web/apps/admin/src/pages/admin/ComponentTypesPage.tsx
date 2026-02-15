import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { ComponentType } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Checkbox } from "../../components/ui/checkbox";
import { Button } from "../../components/ui/button";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";

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

  const { data: rows = [] } = useQuery({
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
    },
  });

  const updateMutation = useMutation({
    mutationFn: (v: FormValues) => sdk.admin.updateComponentType(editing!.id, v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["component-types"] });
      setOpen(false);
      setEditing(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteComponentType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["component-types"] });
    },
  });

  const columns = useMemo<ColumnDef<ComponentType>[]>(
    () => [
      { header: "Code", accessorKey: "code" },
      { header: "Name", accessorKey: "name" },
      { header: "Description", cell: ({ row }) => row.original.description || "-" },
      { header: "Status", cell: ({ row }) => <StatusBadge status={row.original.is_active ? "active" : "disabled"} /> },
      {
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
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
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setDeleteTarget(row.original);
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [deleteMutation, form]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Component Types"
        description="Canonical component categories for BOM and routing."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              form.reset({ code: "", name: "", description: "", is_active: true });
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Component Type
          </Button>
        }
      />
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
      <DataTable data={rows} columns={columns} filterPlaceholder="Search component type..." />

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Component Type" : "Create Component Type"}
        onSubmit={form.handleSubmit((v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Code</Label>
            <Input {...form.register("code")} />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...form.register("name")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea {...form.register("description")} />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.watch("is_active")} onCheckedChange={(v) => form.setValue("is_active", Boolean(v))} />
              Active
            </label>
          </div>
        </div>
      </FormDialog>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete component type"
        description={deleteTarget ? `Delete component type ${deleteTarget.code}?` : ""}
        confirmText="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
