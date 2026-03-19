import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Process } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { formatApiError } from "../../lib/errors";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { PageLayout } from "@traceability/ui";
import { useToast } from "../../hooks/useToast";
import { Button } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil } from "lucide-react";

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
  const { showToast } = useToast();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["processes"], queryFn: () => sdk.admin.getProcesses() });
  const form = useForm<ProcessForm>({
    resolver: zodResolver(schema),
    defaultValues: { active: true, sequence_order: 1 },
  });

  const createMutation = useMutation({
    mutationFn: (v: ProcessForm) => sdk.admin.createProcess(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processes"] });
      setOpen(false);
      form.reset({ process_code: "", name: "", sequence_order: 1, active: true });
      showToast("Process created successfully");
    },
  });
  const updateMutation = useMutation({
    mutationFn: (v: ProcessForm) => sdk.admin.updateProcess(editing!.id, v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processes"] });
      setOpen(false);
      setEditing(null);
      showToast("Process updated successfully");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteProcess(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processes"] });
      showToast("Process deleted");
    },
  });

  const columns = useMemo<ColumnDef<Process>[]>(
    () => [
      {
        id: "code",
        header: "Process",
        accessorKey: "process_code",
        size: 240,
        cell: ({ row }) => (
          <div className="min-w-0 whitespace-normal">
            <p className="truncate font-medium text-foreground">{row.original.process_code}</p>
            <p className="truncate text-xs text-muted-foreground">{row.original.name}</p>
          </div>
        ),
      },
      {
        id: "sequence",
        header: "Sequence",
        accessorKey: "sequence_order",
        size: 140,
        cell: ({ row }) => (
          <div className="min-w-0 whitespace-normal">
            <p className="tabular-nums text-foreground">{row.original.sequence_order}</p>
            <p className="truncate text-xs text-muted-foreground">Order in manufacturing flow</p>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        size: 120,
        cell: ({ row }) => (
          <div className="min-w-0 whitespace-normal">
            <StatusBadge status={row.original.active ? "active" : "disabled"} />
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {row.original.active ? "Available in routing configuration" : "Excluded from active routing"}
            </p>
          </div>
        ),
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
                form.reset(row.original);
                setOpen(true);
              }}
              title="Edit Process"
              aria-label="Edit Process"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <DeleteIconButton
              onClick={() => setDeleteTarget(row.original)}
              title="Delete Process"
              aria-label="Delete Process"
            />
          </div>
        ),
      },
    ],
    [form]
  );

  return (
    <PageLayout
      title="Processes"
      subtitle={
        <div className="flex items-center gap-2">
          <span>Manage the ordered process steps used by routing, stations, and workflow setup</span>
        </div>
      }
      icon="process"
      iconColor="orange"
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
          onRowClick={(process) => {
            setEditing(process);
            form.reset(process);
            setOpen(true);
          }}
          filterPlaceholder="Search process code, name, or sequence..."
          actions={
            <Button
              className="button-hover-scale"
              onClick={() => {
                setEditing(null);
                form.reset({ process_code: "", name: "", sequence_order: 1, active: true });
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Process
            </Button>
          }
        />
      </div>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Process" : "Create Process"}
        onSubmit={form.handleSubmit((v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="process_code">Process Code</Label>
            <Input id="process_code" {...form.register("process_code")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register("name")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sequence_order">Sequence Order</Label>
            <Input
              id="sequence_order"
              type="number"
              value={form.watch("sequence_order") ?? 1}
              onChange={(e) => form.setValue("sequence_order", Number(e.target.value))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Controller
              name="active"
              control={form.control}
              render={({ field }) => (
                <Checkbox id="active" checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
              )}
            />
            <Label htmlFor="active" className="cursor-pointer">
              Active
            </Label>
          </div>
        </div>
      </FormDialog>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete process"
        description={deleteTarget ? `Delete process ${deleteTarget.process_code}?` : ""}
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
