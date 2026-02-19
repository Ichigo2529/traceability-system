import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ComponentType, PartNumberMaster } from "@traceability/sdk";
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
  TextArea,
  Select,
  Option,
  CheckBox,
  Label,
  Form,
  FormItem
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/number-sign.js";

const schema = z.object({
  part_number: z.string().min(1),
  component_type_id: z.string().optional(),
  description: z.string().optional(),
  default_pack_size: z.coerce.number().int().positive().optional(),
  is_active: z.boolean().default(true),
});
type FormValues = z.infer<typeof schema>;

import "@ui5/webcomponents-icons/dist/grid.js";

export function PartNumbersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PartNumberMaster | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PartNumberMaster | null>(null);

  const { data: rows = [], isLoading: rowsLoading } = useQuery({
    queryKey: ["part-numbers"],
    queryFn: () => sdk.admin.getPartNumbers(),
  });

  const { data: componentTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ["component-types"],
    queryFn: () => sdk.admin.getComponentTypes(),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true },
  });

  const createMutation = useMutation({
    mutationFn: (v: FormValues) => sdk.admin.createPartNumber(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["part-numbers"] });
      setOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (v: FormValues) => sdk.admin.updatePartNumber(editing!.id, v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["part-numbers"] });
      setOpen(false);
      setEditing(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deletePartNumber(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["part-numbers"] });
    },
  });

  const columns = useMemo<ColumnDef<PartNumberMaster>[]>(
    () => [
      { header: "Part Number", accessorKey: "part_number" },
      { header: "Component Type", accessorKey: "component_type_code" },
      { header: "Default Pack Size", accessorKey: "default_pack_size" },
      { header: "Description", accessorKey: "description" },
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
                  part_number: row.original.part_number,
                  component_type_id: row.original.component_type_id ?? undefined,
                  description: row.original.description ?? "",
                  default_pack_size: row.original.default_pack_size ?? undefined,
                  is_active: row.original.is_active,
                });
                setOpen(true);
              }}
              tooltip="Edit Part Number"
            />
            <Button
              icon="delete"
              design="Transparent"
              onClick={() => {
                setDeleteTarget(row.original);
              }}
              tooltip="Delete Part Number"
            />
          </div>
        ),
      },
    ],
    [deleteMutation, form]
  );

  return (
    <PageLayout
      title="Part Numbers"
      subtitle="Master FG/RM part numbers mapped to component type"
      icon="number-sign"
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
            loading={rowsLoading || typesLoading}
            filterPlaceholder="Search part number..." 
            actions={
                <Button
                  icon="add"
                  design="Emphasized"
                  className="button-hover-scale"
                  onClick={() => {
                    setEditing(null);
                    form.reset({ part_number: "", component_type_id: undefined, description: "", default_pack_size: undefined, is_active: true });
                    setOpen(true);
                  }}
                >
                  Add Part Number
                </Button>
            }
        />
      </div>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Part Number" : "Create Part Number"}
        onSubmit={form.handleSubmit((v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <Form layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12">
          <FormItem labelContent={<Label>Part Number</Label>}>
              <Input {...form.register("part_number")} />
          </FormItem>
          
           <FormItem labelContent={<Label>Default Pack Size</Label>}>
              <Input type="Number" {...form.register("default_pack_size")} />
          </FormItem>

           <FormItem labelContent={<Label>Component Type</Label>}>
               <Controller
                  control={form.control}
                  name="component_type_id"
                  render={({ field }) => (
                       <Select
                          onChange={(e) => {
                              const selected = e.detail.selectedOption as unknown as { value: string };
                              field.onChange(selected.value === "NONE" ? "" : selected.value);
                          }}
                          value={field.value || "NONE"}
                      >
                           <Option value="NONE">Not assigned</Option>
                           {componentTypes.map((ct: ComponentType) => (
                              <Option key={ct.id} value={ct.id}>
                                {ct.code} - {ct.name}
                              </Option>
                            ))}
                      </Select>
                  )}
               />
          </FormItem>
          
          <FormItem labelContent={<Label>Description</Label>} style={{ gridColumn: "span 2" }}>
               <TextArea {...form.register("description")} />
          </FormItem>
          
          <FormItem labelContent={<Label>Status</Label>} style={{ gridColumn: "span 2" }}>
              <Controller
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                       <CheckBox
                           checked={field.value}
                           onChange={(e) => field.onChange(e.target.checked)}
                           text="Active"
                       />
                  )}
              />
          </FormItem>
        </Form>
      </FormDialog>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete part number"
        description={deleteTarget ? `Delete part number ${deleteTarget.part_number}?` : ""}
        confirmText="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </PageLayout>
  );
}
