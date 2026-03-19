import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Department } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { PageLayout } from "@traceability/ui";
import { useToast } from "../../hooks/useToast";
import { getSections } from "../../lib/section-api";
import { Button } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";

const SELECT_NONE = "__none__";

const schema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  sort_order: z.number().int().min(1).default(100),
  section_id: z.string().optional(),
  is_active: z.boolean().default(true),
});
type DepartmentForm = z.infer<typeof schema>;

type Section = { id: string; section_name: string };

export function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [disableTarget, setDisableTarget] = useState<Department | null>(null);
  const { showToast } = useToast();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: () => sdk.admin.getDepartments(),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["admin-sections"],
    queryFn: getSections,
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
      form.reset({ code: "", name: "", sort_order: 100, is_active: true });
      showToast("Department created successfully");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: DepartmentForm) => sdk.admin.updateDepartment(editing!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      setOpen(false);
      setEditing(null);
      showToast("Department updated successfully");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      showToast("Department deleted");
    },
  });

  const columns = useMemo<ColumnDef<Department>[]>(
    () => [
      { id: "code", header: "Code", accessorKey: "code" },
      { id: "name", header: "Name", accessorKey: "name" },
      { id: "sort", header: "Sort", accessorKey: "sort_order" },
      {
        id: "section",
        header: "Section",
        cell: ({ row }) =>
          (sections as Section[]).find(
            (s) => s.id === (row.original as Department & { section_id?: string }).section_id
          )?.section_name ?? "-",
      },
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
                  sort_order: row.original.sort_order,
                  section_id: (row.original as Department & { section_id?: string }).section_id || undefined,
                  is_active: row.original.is_active,
                });
                setOpen(true);
              }}
              title="Edit Department"
              aria-label="Edit Department"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <DeleteIconButton
              onClick={() => setDisableTarget(row.original)}
              title="Disable Department"
              aria-label="Disable Department"
            />
          </div>
        ),
      },
    ],
    [form, sections]
  );

  return (
    <PageLayout
      title="Departments"
      subtitle={
        <div className="flex items-center gap-2">
          <span>Organizational units and cost centers</span>
        </div>
      }
      icon="org-chart"
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
          filterPlaceholder="Search department..."
          actions={
            <Button
              className="button-hover-scale"
              onClick={() => {
                setEditing(null);
                form.reset({ code: "", name: "", sort_order: 100, section_id: undefined, is_active: true });
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          }
        />
      </div>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Department" : "Create Department"}
        onSubmit={form.handleSubmit((payload) =>
          editing ? updateMutation.mutate(payload) : createMutation.mutate(payload)
        )}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="dept-code">Code *</Label>
            <Input
              id="dept-code"
              {...form.register("code")}
              className={form.formState.errors.code ? "border-destructive" : ""}
            />
            {form.formState.errors.code && (
              <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dept-name">Name *</Label>
            <Input
              id="dept-name"
              {...form.register("name")}
              className={form.formState.errors.name ? "border-destructive" : ""}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dept-sort">Sort Order</Label>
            <Input
              id="dept-sort"
              type="number"
              value={form.watch("sort_order") ?? 100}
              onChange={(e) => form.setValue("sort_order", Number(e.target.value) || 100)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Section</Label>
            <Controller
              name="section_id"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value || SELECT_NONE}
                  onValueChange={(v) => field.onChange(v === SELECT_NONE ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>None</SelectItem>
                    {(sections as Section[]).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.section_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex items-center gap-2">
            <Controller
              name="is_active"
              control={form.control}
              render={({ field }) => (
                <Checkbox id="dept-active" checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
              )}
            />
            <Label htmlFor="dept-active" className="cursor-pointer">
              Active
            </Label>
          </div>
        </div>
      </FormDialog>
      <ConfirmDialog
        open={Boolean(disableTarget)}
        title="Disable department"
        description={disableTarget ? `Disable department ${disableTarget.name}?` : ""}
        confirmText="Disable"
        destructive
        submitting={deleteMutation.isPending}
        onCancel={() => setDisableTarget(null)}
        onConfirm={() => {
          if (!disableTarget) return;
          deleteMutation.mutate(disableTarget.id, {
            onSuccess: () => setDisableTarget(null),
          });
        }}
      />
    </PageLayout>
  );
}
