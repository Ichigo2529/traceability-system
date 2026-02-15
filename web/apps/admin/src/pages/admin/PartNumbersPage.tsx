import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { ComponentType, PartNumberMaster } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Checkbox } from "../../components/ui/checkbox";
import { Button } from "../../components/ui/button";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";

const schema = z.object({
  part_number: z.string().min(1),
  component_type_id: z.string().optional(),
  description: z.string().optional(),
  default_pack_size: z.coerce.number().int().positive().optional(),
  is_active: z.boolean().default(true),
});
type FormValues = z.infer<typeof schema>;

export function PartNumbersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PartNumberMaster | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PartNumberMaster | null>(null);

  const { data: rows = [] } = useQuery({
    queryKey: ["part-numbers"],
    queryFn: () => sdk.admin.getPartNumbers(),
  });

  const { data: componentTypes = [] } = useQuery({
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
      { header: "Component Type", cell: ({ row }) => row.original.component_type_code || "-" },
      { header: "Default Pack Size", cell: ({ row }) => row.original.default_pack_size ?? "-" },
      { header: "Description", cell: ({ row }) => row.original.description || "-" },
      { header: "Status", cell: ({ row }) => <StatusBadge status={row.original.is_active ? "active" : "disabled"} /> },
      {
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(row.original);
                form.reset({
                  part_number: row.original.part_number,
                  component_type_id: row.original.component_type_id || undefined,
                  description: row.original.description || "",
                  default_pack_size: row.original.default_pack_size ?? undefined,
                  is_active: row.original.is_active,
                });
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
        title="Part Numbers"
        description="Master FG/RM part numbers mapped to component type."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              form.reset({ part_number: "", component_type_id: undefined, description: "", default_pack_size: undefined, is_active: true });
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Part Number
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
      <DataTable data={rows} columns={columns} filterPlaceholder="Search part number..." />

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Part Number" : "Create Part Number"}
        onSubmit={form.handleSubmit((v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Part Number</Label>
            <Input {...form.register("part_number")} />
          </div>
          <div className="space-y-2">
            <Label>Default Pack Size</Label>
            <Input type="number" {...form.register("default_pack_size")} />
          </div>
          <div className="space-y-2">
            <Label>Component Type</Label>
            <Select value={form.watch("component_type_id") || "NONE"} onValueChange={(v) => form.setValue("component_type_id", v === "NONE" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select component type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Not assigned</SelectItem>
                {componentTypes.map((ct: ComponentType) => (
                  <SelectItem key={ct.id} value={ct.id}>
                    {ct.code} - {ct.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea {...form.register("description")} />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.watch("is_active")} onCheckedChange={(v) => form.setValue("is_active", Boolean(v))} />
              Active
            </label>
          </div>
        </div>
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
    </div>
  );
}
