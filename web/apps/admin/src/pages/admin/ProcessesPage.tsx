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
import "@ui5/webcomponents-icons/dist/process.js";

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
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["processes"], queryFn: () => sdk.admin.getProcesses() });
  const form = useForm<ProcessForm>({ resolver: zodResolver(schema), defaultValues: { active: true, sequence_order: 1 } });

  const createMutation = useMutation({
    mutationFn: (v: ProcessForm) => sdk.admin.createProcess(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processes"] });
      setOpen(false);
      form.reset({ process_code: "", name: "", sequence_order: 1, active: true });
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
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              icon="edit"
              design="Transparent"
              onClick={() => {
                setEditing(row.original);
                form.reset(row.original);
                setOpen(true);
              }}
              tooltip="Edit Process"
            />
            <Button
              icon="delete"
              design="Transparent"
              onClick={() => {
                setDeleteTarget(row.original);
              }}
              tooltip="Delete Process"
            />
          </div>
        ),
      },
    ],
    [deleteMutation, form]
  );

  return (
    <PageLayout
      title="Processes"
      subtitle="Manufacturing process master with sequence ordering"
      icon="process"
      iconColor="var(--icon-orange)"
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
            filterPlaceholder="Search process..." 
            actions={
                <Button
                  icon="add"
                  design="Emphasized"
                  className="button-hover-scale"
                  onClick={() => {
                    setEditing(null);
                    form.reset({ process_code: "", name: "", sequence_order: 1, active: true });
                    setOpen(true);
                  }}
                >
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
        <Form layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12">
          <FormItem labelContent={<Label>Process Code</Label>}>
            <Input {...form.register("process_code")} />
          </FormItem>
          <FormItem labelContent={<Label>Name</Label>}>
            <Input {...form.register("name")} />
          </FormItem>
          <FormItem labelContent={<Label>Sequence Order</Label>}>
            <Input type="Number" value={form.watch("sequence_order")?.toString()} onInput={(e: any) => form.setValue("sequence_order", Number(e.target.value))} />
          </FormItem>
          <FormItem labelContent={<Label>Status</Label>}>
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
        </Form>
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
    </PageLayout>
  );
}

