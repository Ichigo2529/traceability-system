import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Department } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { Button } from "../../components/ui/button";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";

const schema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  sort_order: z.number().int().min(1).default(100),
  is_active: z.boolean().default(true),
});
type DepartmentForm = z.infer<typeof schema>;

export function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [disableTarget, setDisableTarget] = useState<Department | null>(null);

  const { data: rows = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: () => sdk.admin.getDepartments(),
  });

  const form = useForm<DepartmentForm>({
    resolver: zodResolver(schema),
    defaultValues: { code: "", name: "", sort_order: 100, is_active: true },
  });

  const createMutation = useMutation({
    mutationFn: (payload: DepartmentForm) => sdk.admin.createDepartment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      setOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: DepartmentForm) => sdk.admin.updateDepartment(editing!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });

  const columns = useMemo<ColumnDef<Department>[]>(
    () => [
      { header: "Code", accessorKey: "code" },
      { header: "Name", accessorKey: "name" },
      { header: "Sort", accessorKey: "sort_order" },
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
                  sort_order: row.original.sort_order,
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
                setDisableTarget(row.original);
              }}
            >
              Disable
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
        title="Departments"
        description="Department master used by user profile and request section."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              form.reset({ code: "", name: "", sort_order: 100, is_active: true });
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Department
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
      <DataTable data={rows} columns={columns} filterPlaceholder="Search department..." />

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Department" : "Create Department"}
        onSubmit={form.handleSubmit((payload) => (editing ? updateMutation.mutate(payload) : createMutation.mutate(payload)))}
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
          <div className="space-y-2">
            <Label>Sort Order</Label>
            <Input
              type="number"
              value={form.watch("sort_order")}
              onChange={(event) => form.setValue("sort_order", Number(event.target.value || 100))}
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.watch("is_active")} onCheckedChange={(v) => form.setValue("is_active", Boolean(v))} />
              Active
            </label>
          </div>
        </div>
      </FormDialog>
      <ConfirmDialog
        open={Boolean(disableTarget)}
        title="Disable department"
        description={disableTarget ? `Disable department ${disableTarget.name}?` : ""}
        confirmText="Disable"
        destructive
        onCancel={() => setDisableTarget(null)}
        onConfirm={() => {
          if (!disableTarget) return;
          deleteMutation.mutate(disableTarget.id);
          setDisableTarget(null);
        }}
      />
    </div>
  );
}
