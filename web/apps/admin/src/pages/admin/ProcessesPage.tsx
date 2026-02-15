import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Process } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { Button } from "../../components/ui/button";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { formatApiError } from "../../lib/errors";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";

const schema = z.object({
  process_code: z.string().min(1),
  name: z.string().min(2),
  sequence_order: z.coerce.number().int().positive(),
  active: z.boolean().default(true),
});
type ProcessForm = z.infer<typeof schema>;

export function ProcessesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Process | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Process | null>(null);
  const { data: rows = [] } = useQuery({ queryKey: ["processes"], queryFn: () => sdk.admin.getProcesses() });
  const form = useForm<ProcessForm>({ resolver: zodResolver(schema), defaultValues: { active: true, sequence_order: 1 } });

  const createMutation = useMutation({
    mutationFn: (v: ProcessForm) => sdk.admin.createProcess(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processes"] });
      setOpen(false);
    },
  });
  const updateMutation = useMutation({
    mutationFn: (v: ProcessForm) => sdk.admin.updateProcess(editing!.id, v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processes"] });
      setOpen(false);
      setEditing(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteProcess(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processes"] });
    },
  });

  const columns = useMemo<ColumnDef<Process>[]>(
    () => [
      { header: "Code", accessorKey: "process_code" },
      { header: "Name", accessorKey: "name" },
      { header: "Sequence", accessorKey: "sequence_order" },
      { header: "Status", cell: ({ row }) => <StatusBadge status={row.original.active ? "active" : "disabled"} /> },
      {
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(row.original);
                form.reset(row.original);
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
        title="Processes"
        description="Manufacturing process master with sequence ordering."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              form.reset({ process_code: "", name: "", sequence_order: 1, active: true });
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Process
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
      <DataTable data={rows} columns={columns} filterPlaceholder="Search process..." />

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Process" : "Create Process"}
        onSubmit={form.handleSubmit((v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Process Code</Label>
            <Input {...form.register("process_code")} />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...form.register("name")} />
          </div>
          <div className="space-y-2">
            <Label>Sequence Order</Label>
            <Input type="number" {...form.register("sequence_order", { valueAsNumber: true })} />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.watch("active")} onCheckedChange={(v) => form.setValue("active", Boolean(v))} />
              Active
            </label>
          </div>
        </div>
      </FormDialog>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete process"
        description={deleteTarget ? `Delete process ${deleteTarget.process_code}?` : ""}
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
