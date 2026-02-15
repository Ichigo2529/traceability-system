import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Model } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Checkbox } from "../../components/ui/checkbox";
import { Button } from "../../components/ui/button";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";

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
  const { data: models = [] } = useQuery({ queryKey: ["models"], queryFn: () => sdk.admin.getModels() });
  const form = useForm<ModelForm>({ resolver: zodResolver(schema), defaultValues: { active: true, pack_size: 1 } });

  const createMutation = useMutation({
    mutationFn: (v: ModelForm) => sdk.admin.createModel(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      setOpen(false);
    },
  });
  const updateMutation = useMutation({
    mutationFn: (v: ModelForm) => sdk.admin.updateModel(editing!.id, v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      setOpen(false);
      setEditing(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
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
            >
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/admin/models/${row.original.id}`)}>
              Revisions
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
    [form, navigate]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Models"
        description="Product master for all station dropdowns."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              form.reset({ code: "", name: "", part_number: "", active: true, pack_size: 1, description: "" });
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New Model
          </Button>
        }
      />
      <DataTable data={models} columns={columns} filterPlaceholder="Search model..." />

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Model" : "Create Model"}
        onSubmit={form.handleSubmit((v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Model Code</Label>
            <Input {...form.register("code")} />
          </div>
          <div className="space-y-2">
            <Label>Model Name</Label>
            <Input {...form.register("name")} />
          </div>
          <div className="space-y-2">
            <Label>Part Number</Label>
            <Input {...form.register("part_number")} />
          </div>
          <div className="space-y-2">
            <Label>Pack Size</Label>
            <Input type="number" {...form.register("pack_size")} />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.watch("active")} onCheckedChange={(v) => form.setValue("active", Boolean(v))} />
              Active
            </label>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea {...form.register("description")} />
          </div>
        </div>
      </FormDialog>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete model"
        description={deleteTarget ? `Delete model ${deleteTarget.code}?` : ""}
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
