import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MasterRoutingStep } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { PageLayout } from "@traceability/ui";
import { useToast } from "../../hooks/useToast";
import {
  Button,
  Input,
  TextArea,
  CheckBox,
  Label,
  Form,
  FormItem,
  FlexBox,
  FlexBoxAlignItems,
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/bullet-text.js";
import "@ui5/webcomponents-icons/dist/grid.js";

const schema = z.object({
  step_code: z.string().min(1, "Step code is required"),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});
type FormValues = z.infer<typeof schema>;

export function MasterRoutingStepsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MasterRoutingStep | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MasterRoutingStep | null>(null);
  const { showToast, ToastComponent } = useToast();

  const { data: rows = [], isLoading: rowsLoading } = useQuery({
    queryKey: ["master-routing-steps"],
    queryFn: () => sdk.admin.getMasterRoutingSteps(),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true },
  });

  const createMutation = useMutation({
    mutationFn: (v: FormValues) => sdk.admin.createMasterRoutingStep(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-routing-steps"] });
      setOpen(false);
      showToast("Master routing step created successfully");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (v: FormValues) => sdk.admin.updateMasterRoutingStep(editing!.id, v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-routing-steps"] });
      setOpen(false);
      setEditing(null);
      showToast("Master routing step updated successfully");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteMasterRoutingStep(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-routing-steps"] });
      showToast("Master routing step deleted");
    },
  });

  const columns = useMemo<ColumnDef<MasterRoutingStep>[]>(
    () => [
      { header: "Step Code", accessorKey: "step_code" },
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
                  step_code: row.original.step_code,
                  description: row.original.description ?? "",
                  is_active: row.original.is_active,
                });
                setOpen(true);
              }}
              tooltip="Edit Master Step"
              aria-label="Edit Master Step"
            />
            <Button
              icon="delete"
              design="Transparent"
              onClick={() => {
                setDeleteTarget(row.original);
              }}
              tooltip="Delete Master Step"
              aria-label="Delete Master Step"
            />
          </div>
        ),
      },
    ],
    [deleteMutation, form]
  );

  return (
    <PageLayout
      title="Master Routing Steps"
      subtitle={
        <FlexBox alignItems={FlexBoxAlignItems.Center}>
          <span className="indicator-live" />
          <span>Standardized production process steps catalogue</span>
        </FlexBox>
      }
      icon="bullet-text"
      iconColor="teal"
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
          loading={rowsLoading}
          filterPlaceholder="Search step code..."
          actions={
            <Button
              icon="add"
              design="Emphasized"
              className="button-hover-scale"
              onClick={() => {
                setEditing(null);
                form.reset({ step_code: "", description: "", is_active: true });
                setOpen(true);
              }}
            >
              Add Step
            </Button>
          }
        />
      </div>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Routing Step" : "Create Routing Step"}
        onSubmit={form.handleSubmit((v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <Form layout="S1 M1 L1" labelSpan="S12 M12 L12">
          <FormItem labelContent={<Label required>Step Code</Label>}>
            <Input
              {...form.register("step_code")}
              placeholder="e.g. SMT, PRESS_FIT, PACKING"
            />
          </FormItem>

          <FormItem labelContent={<Label>Description</Label>}>
            <TextArea
              {...form.register("description")}
              placeholder="Describe the operations at this step"
              rows={3}
            />
          </FormItem>

          <FormItem labelContent={<Label>Status</Label>}>
            <Controller
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <CheckBox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} text="Active" />
              )}
            />
          </FormItem>
        </Form>
      </FormDialog>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete routing step"
        description={deleteTarget ? `Delete routing step '${deleteTarget.step_code}'?` : ""}
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
