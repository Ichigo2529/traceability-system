import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, RotateCcw, ShieldAlert } from "lucide-react";
import { DeviceInfo } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { Card, CardContent } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { formatDateTime } from "../../lib/datetime";

const NONE = "__none__";

const schema = z.object({
  device_code: z.string().min(3),
  name: z.string().min(2),
  device_type: z.enum(["pi", "pc", "tablet", "kiosk"]),
  station_id: z.string().optional(),
  process_id: z.string().optional(),
  ip_address: z.string().optional(),
  status: z.enum(["active", "disabled", "maintenance"]).default("active"),
  activation_pin: z.string().min(4).max(16),
});

type DeviceForm = z.infer<typeof schema>;

function toDateText(value?: string | null) {
  return formatDateTime(value);
}

export function DevicesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DeviceInfo | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ device: DeviceInfo; status: "active" | "disabled" | "maintenance" } | null>(null);
  const [secretTarget, setSecretTarget] = useState<DeviceInfo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeviceInfo | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const { data: devices = [] } = useQuery({ queryKey: ["devices"], queryFn: () => sdk.admin.getDevices() });
  const { data: stations = [] } = useQuery({ queryKey: ["stations"], queryFn: () => sdk.admin.getStations() });
  const { data: processes = [] } = useQuery({ queryKey: ["processes"], queryFn: () => sdk.admin.getProcesses() });
  const { data: heartbeatSettings } = useQuery({ queryKey: ["heartbeat-settings"], queryFn: () => sdk.admin.getHeartbeatSettings() });

  const onlineWindowMin = heartbeatSettings?.online_window_minutes ?? 2;

  const form = useForm<DeviceForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      device_type: "pi",
      status: "active",
      activation_pin: "123456",
      station_id: "",
      process_id: "",
      ip_address: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: DeviceForm) =>
      sdk.admin.createDevice({
        device_code: payload.device_code,
        name: payload.name,
        device_type: payload.device_type,
        station_id: payload.station_id || undefined,
        process_id: payload.process_id || undefined,
        ip_address: payload.ip_address || undefined,
        status: payload.status,
        activation_pin: payload.activation_pin,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      setNewSecret(data.secret_key ?? null);
      setOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: DeviceForm) =>
      sdk.admin.updateDevice(editing!.id!, {
        device_code: payload.device_code,
        name: payload.name,
        device_type: payload.device_type,
        station_id: payload.station_id || null,
        process_id: payload.process_id || null,
        ip_address: payload.ip_address || null,
        status: payload.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "disabled" | "maintenance" }) => sdk.admin.setDeviceStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      setStatusTarget(null);
    },
  });

  const secretMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.regenerateDeviceSecret(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      setNewSecret(data.secret_key);
      setSecretTarget(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });

  const stationMap = useMemo(() => stations.reduce<Record<string, string>>((acc, row) => ({ ...acc, [row.id]: row.name }), {}), [stations]);
  const processMap = useMemo(() => processes.reduce<Record<string, string>>((acc, row) => ({ ...acc, [row.id]: row.name }), {}), [processes]);

  const columns = useMemo<ColumnDef<DeviceInfo>[]>(
    () => [
      { header: "Code", accessorKey: "device_code" },
      { header: "Name", accessorKey: "name" },
      {
        header: "Station",
        cell: ({ row }) => row.original.assigned_station?.name ?? stationMap[row.original.station_id || ""] ?? "-",
      },
      {
        header: "Process",
        cell: ({ row }) => row.original.assigned_process?.name ?? processMap[row.original.process_id || ""] ?? "-",
      },
      { header: "Type", accessorKey: "device_type" },
      { header: "IP", accessorKey: "ip_address", cell: ({ row }) => row.original.ip_address || "-" },
      {
        header: "Status",
        cell: ({ row }) => {
          const hb = row.original.last_heartbeat_at;
          const seen = hb ? Date.now() - new Date(hb).getTime() : Number.MAX_SAFE_INTEGER;
          const online = seen <= onlineWindowMin * 60 * 1000 && row.original.status === "active";
          return (
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-green-600" : "bg-slate-400"}`} aria-label={online ? "online" : "offline"} />
              <StatusBadge status={row.original.status || "disabled"} />
            </div>
          );
        },
      },
      { header: "Last Seen", cell: ({ row }) => toDateText(row.original.last_heartbeat_at) },
      {
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(row.original);
                form.reset({
                  device_code: row.original.device_code || "",
                  name: row.original.name || "",
                  device_type: row.original.device_type || "pi",
                  station_id: row.original.station_id || "",
                  process_id: row.original.process_id || "",
                  ip_address: row.original.ip_address || "",
                  status: row.original.status || "active",
                  activation_pin: "000000",
                });
                setOpen(true);
              }}
            >
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setStatusTarget({ device: row.original, status: "maintenance" })}>
              Maintenance
            </Button>
            <Button variant="outline" size="sm" onClick={() => setStatusTarget({ device: row.original, status: row.original.status === "disabled" ? "active" : "disabled" })}>
              {row.original.status === "disabled" ? "Enable" : "Disable"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSecretTarget(row.original)}>
              <RotateCcw className="h-3.5 w-3.5" />
              Secret
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (!row.original.id) return;
                setDeleteTarget(row.original);
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [deleteMutation, form, onlineWindowMin, processMap, stationMap]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devices"
        description="Manage registered edge devices and trust identities."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              form.reset({
                device_code: "",
                name: "",
                device_type: "pi",
                station_id: "",
                process_id: "",
                ip_address: "",
                status: "active",
                activation_pin: "123456",
              });
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Device
          </Button>
        }
      />

      {newSecret ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 text-sm">
            <p className="font-semibold">Latest secret key</p>
            <p className="font-mono text-xs text-muted-foreground">{newSecret}</p>
          </CardContent>
        </Card>
      ) : null}

      <DataTable data={devices} columns={columns} filterPlaceholder="Search device code, station, IP..." />

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Device" : "Create Device"}
        submitText={editing ? "Update" : "Create"}
        onSubmit={form.handleSubmit((values) => (editing ? updateMutation.mutate(values) : createMutation.mutate(values)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Device Code</Label>
            <Input {...form.register("device_code")} placeholder="PI5-ASM-01" />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...form.register("name")} placeholder="ASM Scanner 01" />
          </div>

          <div className="space-y-2">
            <Label>Device Type</Label>
            <Select value={form.watch("device_type")} onValueChange={(v) => form.setValue("device_type", v as DeviceForm["device_type"])}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pi">pi</SelectItem>
                <SelectItem value="pc">pc</SelectItem>
                <SelectItem value="tablet">tablet</SelectItem>
                <SelectItem value="kiosk">kiosk</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>IP Address</Label>
            <Input {...form.register("ip_address")} placeholder="192.168.10.35" />
          </div>

          <div className="space-y-2">
            <Label>Station</Label>
            <Select value={form.watch("station_id") || NONE} onValueChange={(v) => form.setValue("station_id", v === NONE ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select station" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Unassigned</SelectItem>
                {stations.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.station_code} - {row.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Process</Label>
            <Select value={form.watch("process_id") || NONE} onValueChange={(v) => form.setValue("process_id", v === NONE ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select process" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Unassigned</SelectItem>
                {processes.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.process_code} - {row.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as DeviceForm["status"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="maintenance">maintenance</SelectItem>
                <SelectItem value="disabled">disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Activation PIN</Label>
            <Input {...form.register("activation_pin")} disabled={Boolean(editing)} />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title="Confirm status change"
        description={
          statusTarget
            ? `Set ${statusTarget.device.device_code} to ${statusTarget.status.toUpperCase()} status?`
            : ""
        }
        confirmText="Apply"
        onCancel={() => setStatusTarget(null)}
        onConfirm={() => {
          if (!statusTarget?.device.id) return;
          statusMutation.mutate({ id: statusTarget.device.id, status: statusTarget.status });
        }}
      />

      <ConfirmDialog
        open={Boolean(secretTarget)}
        title="Regenerate device secret"
        description="Existing signatures will be invalid until station is re-activated with new secret."
        confirmText="Regenerate"
        destructive
        onCancel={() => setSecretTarget(null)}
        onConfirm={() => {
          if (!secretTarget?.id) return;
          secretMutation.mutate(secretTarget.id);
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete device"
        description={deleteTarget ? `Delete device ${deleteTarget.device_code}?` : ""}
        confirmText="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget?.id) return;
          deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      {(createMutation.error || updateMutation.error || statusMutation.error || secretMutation.error || deleteMutation.error) ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-red-700">
            <ShieldAlert className="h-4 w-4" />
            Operation failed. Please verify payload and try again.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
