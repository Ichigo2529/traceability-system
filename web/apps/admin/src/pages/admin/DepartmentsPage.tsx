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
import {
  Button,
  Input,
  CheckBox,
  Label,
  Form,
  FormItem
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/org-chart.js";

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

  const { data: rows = [], isLoading } = useQuery({
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
      form.reset({ code: "", name: "", sort_order: 100, is_active: true });
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
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              icon="edit"
              design="Transparent"
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
              tooltip="Edit Department"
            />
            <Button
              icon="delete"
              design="Transparent"
              onClick={() => {
                setDisableTarget(row.original);
              }}
              tooltip="Disable Department"
            />
          </div>
        ),
      },
    ],
    [deleteMutation, form]
  );

  return (
    <PageLayout
      title="Departments"
      subtitle="Department master used by user profile and request section"
      icon="org-chart"
      iconColor="var(--icon-indigo)"
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
                  icon="add"
                  design="Emphasized"
                  className="button-hover-scale"
                  onClick={() => {
                    setEditing(null);
                    form.reset({ code: "", name: "", sort_order: 100, is_active: true });
                    setOpen(true);
                  }}
                >
                  Add Department
                </Button>
            }
        />
      </div>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Department" : "Create Department"}
        onSubmit={form.handleSubmit((payload) => (editing ? updateMutation.mutate(payload) : createMutation.mutate(payload)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <Form layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12">
          <FormItem labelContent={<Label>Code</Label>}>
            <Input {...form.register("code")} />
          </FormItem>
          <FormItem labelContent={<Label>Name</Label>}>
            <Input {...form.register("name")} />
          </FormItem>
          <FormItem labelContent={<Label>Sort Order</Label>}>
            <Input
              type="Number"
              value={form.watch("sort_order")?.toString()}
              onInput={(event: any) => form.setValue("sort_order", Number(event.target.value || 100))}
            />
          </FormItem>
          <FormItem labelContent={<Label>Status</Label>}>
              <Controller
                  name="is_active"
                  control={form.control}
                  render={({ field }) => (
                      <CheckBox
                          text="Active"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                      />
                  )}
              />
          </FormItem>
        </Form>
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
    </PageLayout>
  );
}
