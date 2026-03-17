import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Station } from "@traceability/sdk";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";

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
  const { showToast } = useToast();
  const { data: stations = [], isLoading: stationsLoading } = useQuery({
    queryKey: ["stations"],
    queryFn: () => sdk.admin.getStations(),
  });
  const { data: processes = [], isLoading: processesLoading } = useQuery({
    queryKey: ["processes"],
    queryFn: () => sdk.admin.getProcesses(),
  });
  const form = useForm<StationForm>({ resolver: zodResolver(schema), defaultValues: { active: true } });

  const createMutation = useMutation({
    mutationFn: (v: StationForm) => sdk.admin.createStation(toStationPayload(v)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stations"] });
      setOpen(false);
      form.reset({ station_code: "", name: "", active: true });
      showToast("Station created successfully");
    },
  });
  const updateMutation = useMutation({
    mutationFn: (v: StationForm) => sdk.admin.updateStation(editing!.id, toStationPayload(v)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stations"] });
      setOpen(false);
      setEditing(null);
      showToast("Station updated successfully");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteStation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stations"] });
      showToast("Station deleted");
    },
  });

  const columns = useMemo<ColumnDef<Station>[]>(
    () => [
      { id: "code", header: "Code", accessorKey: "station_code" },
      { id: "name", header: "Name", accessorKey: "name" },
      { id: "line", header: "Line", accessorKey: "line", cell: ({ row }) => row.original.line || "-" },
      { id: "area", header: "Area", accessorKey: "area", cell: ({ row }) => row.original.area || "-" },
      {
        id: "process",
        header: "Process",
        accessorKey: "process_name",
        cell: ({ row }) => row.original.process_name || "-",
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.active ? "active" : "disabled"} />,
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
                  station_code: row.original.station_code,
                  name: row.original.name,
                  line: row.original.line || "",
                  area: row.original.area || "",
                  process_id: row.original.process_id || "",
                  active: row.original.active,
                });
                setOpen(true);
              }}
              title="Edit Station"
              aria-label="Edit Station"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTarget(row.original)}
              title="Delete Station"
              aria-label="Delete Station"
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
      title="Stations"
      subtitle={
        <div className="flex items-center gap-2">
          <span>Factory stations bound to process and area</span>
        </div>
      }
      icon="factory"
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
          data={stations}
          columns={columns}
          loading={stationsLoading || processesLoading}
          filterPlaceholder="Search station..."
          actions={
            <Button
              className="button-hover-scale"
              onClick={() => {
                setEditing(null);
                form.reset({ station_code: "", name: "", active: true });
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Station
            </Button>
          }
        />
      </div>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Station" : "Create Station"}
        onSubmit={form.handleSubmit((v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="station_code">Station Code</Label>
            <Input id="station_code" {...form.register("station_code")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register("name")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="line">Line</Label>
            <Input id="line" {...form.register("line")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="area">Area</Label>
            <Input id="area" {...form.register("area")} />
          </div>
          <div className="grid gap-2">
            <Label>Process</Label>
            <Controller
              control={form.control}
              name="process_id"
              render={({ field }) => (
                <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
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
              )}
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
        title="Delete station"
        description={deleteTarget ? `Delete station ${deleteTarget.station_code}?` : ""}
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
