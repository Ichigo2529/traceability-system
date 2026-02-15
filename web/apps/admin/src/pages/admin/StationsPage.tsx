import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Process, Station } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Checkbox } from "../../components/ui/checkbox";
import { Button } from "../../components/ui/button";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";

const NONE = "__none__";

const schema = z.object({
  station_code: z.string().min(1),
  name: z.string().min(2),
  line: z.string().optional(),
  area: z.string().optional(),
  process_id: z.string().optional(),
  active: z.boolean().default(true),
});
type StationForm = z.infer<typeof schema>;

function toStationPayload(v: StationForm) {
  return {
    station_code: v.station_code,
    name: v.name,
    line: v.line?.trim() || undefined,
    area: v.area?.trim() || undefined,
    process_id: v.process_id?.trim() || undefined,
    active: v.active,
  };
}

export function StationsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Station | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Station | null>(null);
  const { data: stations = [] } = useQuery({ queryKey: ["stations"], queryFn: () => sdk.admin.getStations() });
  const { data: processes = [] } = useQuery({ queryKey: ["processes"], queryFn: () => sdk.admin.getProcesses() });
  const form = useForm<StationForm>({ resolver: zodResolver(schema), defaultValues: { active: true } });

  const createMutation = useMutation({
    mutationFn: (v: StationForm) => sdk.admin.createStation(toStationPayload(v)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stations"] });
      setOpen(false);
    },
  });
  const updateMutation = useMutation({
    mutationFn: (v: StationForm) => sdk.admin.updateStation(editing!.id, toStationPayload(v)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stations"] });
      setOpen(false);
      setEditing(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteStation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stations"] });
    },
  });

  const processMap = processes.reduce<Record<string, Process>>((acc, p) => ({ ...acc, [p.id]: p }), {});
  const columns = useMemo<ColumnDef<Station>[]>(
    () => [
      { header: "Code", accessorKey: "station_code" },
      { header: "Name", accessorKey: "name" },
      { header: "Line", accessorKey: "line", cell: ({ row }) => row.original.line || "-" },
      { header: "Area", accessorKey: "area", cell: ({ row }) => row.original.area || "-" },
      { header: "Process", accessorKey: "process_name", cell: ({ row }) => row.original.process_name || "-" },
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
                  station_code: row.original.station_code,
                  name: row.original.name,
                  line: row.original.line || "",
                  area: row.original.area || "",
                  process_id: row.original.process_id || "",
                  active: row.original.active,
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
        title="Stations"
        description="Factory stations bound to process and area."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              form.reset({ station_code: "", name: "", active: true });
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Station
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
      <DataTable data={stations} columns={columns} filterPlaceholder="Search station..." />

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Station" : "Create Station"}
        onSubmit={form.handleSubmit((v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Station Code</Label>
            <Input {...form.register("station_code")} />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...form.register("name")} />
          </div>
          <div className="space-y-2">
            <Label>Line</Label>
            <Input {...form.register("line")} />
          </div>
          <div className="space-y-2">
            <Label>Area</Label>
            <Input {...form.register("area")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Process</Label>
            <Select
              value={form.watch("process_id") || NONE}
              onValueChange={(v) => form.setValue("process_id", v === NONE ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select process" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Unassigned</SelectItem>
                {processes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.process_code} - {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.watch("process_id") && processMap[form.watch("process_id") || ""] ? (
              <p className="text-xs text-muted-foreground">{processMap[form.watch("process_id") || ""].name}</p>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.watch("active")} onCheckedChange={(v) => form.setValue("active", Boolean(v))} />
              Active
            </label>
          </div>
        </div>
      </FormDialog>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete station"
        description={deleteTarget ? `Delete station ${deleteTarget.station_code}?` : ""}
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
