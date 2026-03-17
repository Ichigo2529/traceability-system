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
import { useToast } from "../../hooks/useToast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";

const schema = z.object({
  part_number: z.string().min(1),
  component_type_id: z.string().optional(),
  description: z.string().optional(),
  rm_location: z.string().optional(),
  default_pack_size: z.coerce.number().int().positive().optional(),
  is_active: z.boolean().default(true),
});
type FormValues = z.infer<typeof schema>;

const NONE = "__none__";

export function PartNumbersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PartNumberMaster | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PartNumberMaster | null>(null);
  const { showToast } = useToast();

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
      showToast("Part number created successfully");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (v: FormValues) => sdk.admin.updatePartNumber(editing!.id, v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["part-numbers"] });
      setOpen(false);
      setEditing(null);
      showToast("Part number updated successfully");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deletePartNumber(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["part-numbers"] });
      showToast("Part number deleted");
    },
  });

  const columns = useMemo<ColumnDef<PartNumberMaster>[]>(
    () => [
      { id: "part_number", header: "Part Number", accessorKey: "part_number" },
      { id: "component_type", header: "Component Type", accessorKey: "component_type_code" },
      { id: "default_pack_size", header: "Base UOM (Usage/VCM)", accessorKey: "default_pack_size" },
      { id: "rm_location", header: "RM Location", accessorKey: "rm_location" },
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
                  part_number: row.original.part_number,
                  component_type_id: row.original.component_type_id ?? undefined,
                  rm_location: row.original.rm_location ?? "",
                  description: row.original.description ?? "",
                  default_pack_size: row.original.default_pack_size ?? undefined,
                  is_active: row.original.is_active,
                });
                setOpen(true);
              }}
              title="Edit Part Number"
              aria-label="Edit Part Number"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTarget(row.original)}
              title="Delete Part Number"
              aria-label="Delete Part Number"
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
      title="Part Numbers"
      subtitle={
        <div className="flex items-center gap-2">
          <span className="indicator-live" />
          <span>Component master with base usage definitions</span>
        </div>
      }
      icon="number-sign"
      iconColor="indigo"
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
              className="button-hover-scale"
              onClick={() => {
                setEditing(null);
                form.reset({
                  part_number: "",
                  component_type_id: undefined,
                  description: "",
                  rm_location: "",
                  default_pack_size: undefined,
                  is_active: true,
                });
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
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
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="pn-part_number">Part Number</Label>
            <Input id="pn-part_number" {...form.register("part_number")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pn-default_pack_size">Base UOM (Usage/VCM)</Label>
            <Input
              id="pn-default_pack_size"
              type="number"
              {...form.register("default_pack_size")}
              placeholder="e.g. 1"
            />
          </div>
          <div className="grid gap-2">
            <Label>Component Type</Label>
            <Controller
              control={form.control}
              name="component_type_id"
              render={({ field }) => (
                <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Not assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not assigned</SelectItem>
                    {(componentTypes as ComponentType[]).map((ct) => (
                      <SelectItem key={ct.id} value={ct.id}>
                        {ct.code} - {ct.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pn-rm_location">Requirement RM (Location)</Label>
            <Input id="pn-rm_location" {...form.register("rm_location")} placeholder="e.g. WH-01" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pn-description">Description</Label>
            <Textarea id="pn-description" {...form.register("description")} />
          </div>
          <div className="flex items-center gap-2">
            <Controller
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <Checkbox id="pn-active" checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
              )}
            />
            <Label htmlFor="pn-active" className="cursor-pointer">
              Active
            </Label>
          </div>
        </div>
      </FormDialog>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete part number"
        description={deleteTarget ? `Delete part number ${deleteTarget.part_number}?` : ""}
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
