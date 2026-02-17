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
import { PageLayout, Section } from "@traceability/ui";
import {
  Button,
  Input,
  TextArea,
  CheckBox,
  Label,
  Form,
  FormItem
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/dimension.js";

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
      form.reset({ code: "", name: "", description: "", is_active: true });
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
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              icon="edit"
              design="Transparent"
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
              tooltip="Edit Component Type"
            />
            <Button
              icon="delete"
              design="Transparent"
              onClick={() => {
                setDeleteTarget(row.original);
              }}
              tooltip="Delete Component Type"
            />
          </div>
        ),
      },
    ],
    [deleteMutation, form]
  );

  return (
    <PageLayout
      title="Component Types"
      subtitle="Canonical component categories for BOM and routing"
      icon="dimension"
    >
      <Section variant="card">
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
            filterPlaceholder="Search component type..." 
            actions={
                <Button
                  icon="add"
                  design="Emphasized"
                  onClick={() => {
                    setEditing(null);
                    form.reset({ code: "", name: "", description: "", is_active: true });
                    setOpen(true);
                  }}
                >
                  Add Component Type
                </Button>
            }
        />

        <FormDialog
          open={open}
          onClose={() => setOpen(false)}
          title={editing ? "Edit Component Type" : "Create Component Type"}
          onSubmit={form.handleSubmit((v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v)))}
          submitting={createMutation.isPending || updateMutation.isPending}
        >
          <Form layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12">
            <FormItem labelContent={<Label>Code</Label>}>
              <Input {...form.register("code")} />
            </FormItem>
            <FormItem labelContent={<Label>Name</Label>}>
              <Input {...form.register("name")} />
            </FormItem>
            <FormItem labelContent={<Label>Status</Label>} style={{ gridColumn: "span 2" }}>
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
            <FormItem labelContent={<Label>Description</Label>} style={{ gridColumn: "span 2" }}>
              <TextArea {...form.register("description")} rows={3} />
            </FormItem>
          </Form>
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
      </Section>
    </PageLayout>
  );
}

