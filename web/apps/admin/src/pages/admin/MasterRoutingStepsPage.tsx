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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2 } from "lucide-react";

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
  const { showToast } = useToast();

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
      { id: "step_code", header: "Step Code", accessorKey: "step_code" },
      { id: "description", header: "Description", accessorKey: "description" },
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
                  step_code: row.original.step_code,
                  description: row.original.description ?? "",
                  is_active: row.original.is_active,
                });
                setOpen(true);
              }}
              title="Edit Master Step"
              aria-label="Edit Master Step"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTarget(row.original)}
              title="Delete Master Step"
              aria-label="Delete Master Step"
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
      title="Master Routing Steps"
      subtitle={
        <div className="flex items-center gap-2">
          <span className="indicator-live" />
          <span>Standardized production process steps catalogue</span>
        </div>
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
              className="button-hover-scale"
              onClick={() => {
                setEditing(null);
                form.reset({ step_code: "", description: "", is_active: true });
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
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
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="mrs-step_code">Step Code *</Label>
            <Input id="mrs-step_code" {...form.register("step_code")} placeholder="e.g. SMT, PRESS_FIT, PACKING" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mrs-description">Description</Label>
            <Textarea
              id="mrs-description"
              {...form.register("description")}
              placeholder="Describe the operations at this step"
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <Controller
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <Checkbox id="mrs-active" checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
              )}
            />
            <Label htmlFor="mrs-active" className="cursor-pointer">
              Active
            </Label>
          </div>
        </div>
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
    </PageLayout>
  );
}
