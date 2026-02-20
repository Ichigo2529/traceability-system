import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Model } from "@traceability/sdk";
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
  CheckBox,
  Label,
  Form,
  FormItem,
  FlexBox,
  FlexBoxAlignItems
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/product.js";
import "@ui5/webcomponents-icons/dist/navigation-right-arrow.js";
import { useToast } from "../../hooks/useToast";

const schema = z.object({
  code: z.string().min(1),
  name: z.string().min(2),
  part_number: z.string().min(1, "Part Number is required"),
  pack_size: z.coerce.number().int().positive().default(1),
  active: z.boolean().default(true),
  description: z.string().optional(),
});
type ModelForm = z.infer<typeof schema>;

export function ModelsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Model | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Model | null>(null);
  const { showToast, ToastComponent } = useToast();
  const { data: models = [], isLoading } = useQuery({ queryKey: ["models"], queryFn: () => sdk.admin.getModels() });
  const form = useForm<ModelForm>({ resolver: zodResolver(schema), defaultValues: { active: true, pack_size: 1 } });

  const createMutation = useMutation({
    mutationFn: (v: ModelForm) => sdk.admin.createModel(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      setOpen(false);
      form.reset({ code: "", name: "", part_number: "", active: true, pack_size: 1, description: "" });
      showToast("Model created successfully");
    },
  });
  const updateMutation = useMutation({
    mutationFn: (v: ModelForm) => sdk.admin.updateModel(editing!.id, v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      setOpen(false);
      setEditing(null);
      showToast("Model updated successfully");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      showToast("Model deleted");
    },
  });

  const columns = useMemo<ColumnDef<Model>[]>(
    () => [
      { header: "Model Code", accessorKey: "code" },
      { header: "Model Name", accessorKey: "name" },
      { header: "Part Number", accessorKey: "part_number", cell: ({ row }) => row.original.part_number || "-" },
      { header: "Pack Size", accessorKey: "pack_size" },
      { header: "Active Revision", accessorKey: "active_revision_code", cell: ({ row }) => row.original.active_revision_code || "-" },
      { header: "Status", cell: ({ row }) => <StatusBadge status={row.original.active ? "active" : "disabled"} /> },
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
                  part_number: row.original.part_number || "",
                  pack_size: row.original.pack_size || 1,
                  active: row.original.active ?? true,
                  description: row.original.description || "",
                });
                setOpen(true);
              }}
              tooltip="Edit Model"
              aria-label="Edit Model"
            />
            <Button 
                icon="navigation-right-arrow" 
                design="Transparent" 
                onClick={() => navigate(`/admin/models/${row.original.id}`)}
                tooltip="View Revisions"
                aria-label="View Revisions"
            />
            <Button
              icon="delete"
              design="Transparent"
              onClick={() => {
                setDeleteTarget(row.original);
              }}
              tooltip="Delete Model"
              aria-label="Delete Model"
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
      subtitle={
        <FlexBox alignItems={FlexBoxAlignItems.Center}>
          <span className="indicator-live" />
          <span>Manage product models and specifications</span>
        </FlexBox>
      }
      icon="product"
      iconColor="blue"
    >
      <div className="page-container">
        <ApiErrorBanner 
          message={
            createMutation.error ? formatApiError(createMutation.error) :
            updateMutation.error ? formatApiError(updateMutation.error) :
            deleteMutation.error ? formatApiError(deleteMutation.error) :
            undefined
          } 
        />

        <DataTable
          data={models}
          columns={columns}
          loading={isLoading}
          filterPlaceholder="Search models..."
          actions={
            <Button 
                icon="add" 
                design="Emphasized" 
                className="button-hover-scale"
                onClick={() => {
                    setEditing(null);
                    form.reset({ name: "", code: "", description: "" });
                    setOpen(true);
                }}
            >
              New Model
            </Button>
          }
        />
      </div>

        <FormDialog
          open={open}
          onClose={() => setOpen(false)}
          title={editing ? "Edit Model" : "Create Model"}
          onSubmit={form.handleSubmit((v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v)))}
          submitting={createMutation.isPending || updateMutation.isPending}
        >
          <Form layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12">
            <FormItem labelContent={<Label>Model Code</Label>}>
              <Input {...form.register("code")} />
            </FormItem>
            <FormItem labelContent={<Label>Model Name</Label>}>
              <Input {...form.register("name")} />
            </FormItem>
            <FormItem labelContent={<Label>Part Number</Label>}>
              <Input {...form.register("part_number")} />
            </FormItem>
            <FormItem labelContent={<Label>Pack Size</Label>}>
              <Input type="Number" {...form.register("pack_size")} />
            </FormItem>
            <FormItem labelContent={<Label>Status</Label>} style={{ gridColumn: "span 2" }}>
                <Controller
                    name="active"
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
          title="Delete model"
          description={deleteTarget ? `Delete model ${deleteTarget.code}?` : ""}
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
      <ToastComponent />
    </PageLayout>
  );
}
