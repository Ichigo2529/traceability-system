import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DeviceInfo } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { DataTable } from "../../components/shared/DataTable";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { formatDateTime } from "../../lib/datetime";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { PageLayout } from "@traceability/ui";
import { useToast } from "../../hooks/useToast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog } from "../../components/shared/FormDialog";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { Alert } from "@/components/ui/alert";
import { Plus, Pencil, Wrench, Power, PowerOff, RefreshCw, Trash2 } from "lucide-react";

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
  const [statusTarget, setStatusTarget] = useState<{
    device: DeviceInfo;
    status: "active" | "disabled" | "maintenance";
  } | null>(null);
  const [secretTarget, setSecretTarget] = useState<DeviceInfo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeviceInfo | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const { showToast } = useToast();

  const { data: devices = [], isLoading: devicesLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: () => sdk.admin.getDevices(),
  });
  const { data: stations = [], isLoading: stationsLoading } = useQuery({
    queryKey: ["stations"],
    queryFn: () => sdk.admin.getStations(),
  });
  const { data: processes = [], isLoading: processesLoading } = useQuery({
    queryKey: ["processes"],
    queryFn: () => sdk.admin.getProcesses(),
  });
  const { data: heartbeatSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["heartbeat-settings"],
    queryFn: () => sdk.admin.getHeartbeatSettings(),
  });

  const onlineWindowMin = heartbeatSettings?.online_window_minutes ?? 2;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DeviceForm>({
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
      showToast("Device created successfully");
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
      showToast("Device updated successfully");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "disabled" | "maintenance" }) =>
      sdk.admin.setDeviceStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      setStatusTarget(null);
      showToast("Device status updated");
    },
  });

  const secretMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.regenerateDeviceSecret(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      setNewSecret(data.secret_key);
      setSecretTarget(null);
      showToast("Secret key regenerated");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      showToast("Device deleted");
    },
  });

  const stationMap = useMemo(
    () => stations.reduce<Record<string, string>>((acc, row) => ({ ...acc, [row.id]: row.name }), {}),
    [stations]
  );
  const processMap = useMemo(
    () => processes.reduce<Record<string, string>>((acc, row) => ({ ...acc, [row.id]: row.name }), {}),
    [processes]
  );

  const columns = useMemo<ColumnDef<DeviceInfo>[]>(
    () => [
      { id: "device_code", header: "Code", accessorKey: "device_code" },
      { id: "name", header: "Name", accessorKey: "name" },
      {
        id: "station",
        header: "Station",
        cell: ({ row }) => row.original.assigned_station?.name ?? stationMap[row.original.station_id || ""] ?? "-",
      },
      {
        id: "process",
        header: "Process",
        cell: ({ row }) => row.original.assigned_process?.name ?? processMap[row.original.process_id || ""] ?? "-",
      },
      { id: "device_type", header: "Type", accessorKey: "device_type" },
      { id: "ip_address", header: "IP", accessorKey: "ip_address", cell: ({ row }) => row.original.ip_address || "-" },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const hb = row.original.last_heartbeat_at;
          const seen = hb ? Date.now() - new Date(hb).getTime() : Number.MAX_SAFE_INTEGER;
          const online = seen <= onlineWindowMin * 60 * 1000 && row.original.status === "active";
          return (
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ background: online ? "var(--sapPositiveColor)" : "var(--sapNeutralBorderColor)" }}
              />
              <StatusBadge status={row.original.status || "disabled"} />
            </div>
          );
        },
      },
      { id: "last_heartbeat_at", header: "Last Seen", cell: ({ row }) => toDateText(row.original.last_heartbeat_at) },
      {
        id: "actions",
        header: "Actions",
        size: 250,
        cell: ({ row }) => (
          <div className="flex gap-1 flex-wrap">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="button-hover-scale"
              onClick={() => {
                setEditing(row.original);
                reset({
                  device_code: row.original.device_code || "",
                  name: row.original.name || "",
                  device_type: (row.original.device_type as DeviceForm["device_type"]) || "pi",
                  station_id: row.original.station_id || "",
                  process_id: row.original.process_id || "",
                  ip_address: row.original.ip_address || "",
                  status: (row.original.status as DeviceForm["status"]) || "active",
                  activation_pin: "000000",
                });
                setOpen(true);
              }}
              title="Edit Device"
              aria-label="Edit Device"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="button-hover-scale"
              onClick={() => setStatusTarget({ device: row.original, status: "maintenance" })}
              title="Set to Maintenance"
              aria-label="Set to Maintenance"
            >
              <Wrench className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="button-hover-scale"
              onClick={() =>
                setStatusTarget({
                  device: row.original,
                  status: row.original.status === "disabled" ? "active" : "disabled",
                })
              }
              title={row.original.status === "disabled" ? "Enable Device" : "Disable Device"}
              aria-label={row.original.status === "disabled" ? "Enable Device" : "Disable Device"}
            >
              {row.original.status === "disabled" ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="button-hover-scale"
              onClick={() => setSecretTarget(row.original)}
              title="Regenerate Secret Key"
              aria-label="Regenerate Secret Key"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="button-hover-scale text-destructive"
              onClick={() => row.original.id && setDeleteTarget(row.original)}
              title="Delete Device"
              aria-label="Delete Device"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [reset, onlineWindowMin, processMap, stationMap]
  );

  return (
    <PageLayout
      title="Devices & Terminals"
      subtitle={
        <div className="flex items-center gap-2">
          <span className="indicator-live" />
          <span>Hardware terminals and scanner registration</span>
        </div>
      }
      icon="wrench"
      iconColor="indigo"
    >
      <div className="page-container">
        <ApiErrorBanner
          message={
            createMutation.isError
              ? formatApiError(createMutation.error)
              : updateMutation.isError
                ? formatApiError(updateMutation.error)
                : statusMutation.isError
                  ? formatApiError(statusMutation.error)
                  : secretMutation.isError
                    ? formatApiError(secretMutation.error)
                    : deleteMutation.isError
                      ? formatApiError(deleteMutation.error)
                      : undefined
          }
        />
        {newSecret && (
          <Alert className="my-4 border-primary/50 bg-primary/5">
            <Label className="font-bold">Latest secret key:</Label>
            <code className="text-lg font-mono block mt-1">{newSecret}</code>
          </Alert>
        )}

        <DataTable
          data={devices}
          columns={columns}
          loading={devicesLoading || stationsLoading || processesLoading || settingsLoading}
          filterPlaceholder="Search device code, station, IP..."
          actions={
            <Button
              className="button-hover-scale"
              onClick={() => {
                setEditing(null);
                reset({
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
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          }
        />

        <FormDialog
          open={open}
          title={editing ? "Edit Device" : "Create Device"}
          onClose={() => setOpen(false)}
          onSubmit={handleSubmit((values) => (editing ? updateMutation.mutate(values) : createMutation.mutate(values)))}
          submitting={createMutation.isPending || updateMutation.isPending}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Device Code *</Label>
              <Controller
                name="device_code"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value || ""}
                    placeholder="PI5-ASM-01"
                    className={errors.device_code ? "border-destructive" : ""}
                  />
                )}
              />
              {errors.device_code && <p className="text-sm text-destructive">{errors.device_code.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value || ""}
                    placeholder="ASM Scanner 01"
                    className={errors.name ? "border-destructive" : ""}
                  />
                )}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Device Type</Label>
              <Controller
                name="device_type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pi">pi</SelectItem>
                      <SelectItem value="pc">pc</SelectItem>
                      <SelectItem value="tablet">tablet</SelectItem>
                      <SelectItem value="kiosk">kiosk</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>IP Address</Label>
              <Controller
                name="ip_address"
                control={control}
                render={({ field }) => <Input {...field} value={field.value || ""} placeholder="192.168.10.35" />}
              />
            </div>
            <div className="grid gap-2">
              <Label>Station</Label>
              <Controller
                name="station_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
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
                )}
              />
            </div>
            <div className="grid gap-2">
              <Label>Process</Label>
              <Controller
                name="process_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
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
                )}
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">active</SelectItem>
                      <SelectItem value="maintenance">maintenance</SelectItem>
                      <SelectItem value="disabled">disabled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid gap-2">
              <Label>Activation PIN</Label>
              <Controller
                name="activation_pin"
                control={control}
                render={({ field }) => <Input {...field} value={field.value || ""} disabled={Boolean(editing)} />}
              />
            </div>
          </div>
        </FormDialog>

        <ConfirmDialog
          open={Boolean(statusTarget)}
          title="Change Device Status"
          description={
            statusTarget
              ? `Are you sure you want to set ${statusTarget.device.device_code} to ${statusTarget.status.toUpperCase()}?`
              : ""
          }
          confirmText="Change Status"
          submitting={statusMutation.isPending}
          onCancel={() => setStatusTarget(null)}
          onConfirm={() => {
            if (statusTarget?.device.id) {
              statusMutation.mutate({ id: statusTarget.device.id, status: statusTarget.status });
            }
          }}
        />

        <ConfirmDialog
          open={Boolean(secretTarget)}
          title="Regenerate Device Secret"
          description="Existing signatures will be invalid until station is re-activated with new secret. This action cannot be undone."
          confirmText="Regenerate"
          destructive
          submitting={secretMutation.isPending}
          onCancel={() => setSecretTarget(null)}
          onConfirm={() => {
            if (secretTarget?.id) {
              secretMutation.mutate(secretTarget.id);
            }
          }}
        />

        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="Delete device"
          description={deleteTarget ? `Delete device ${deleteTarget.device_code}? This action cannot be undone.` : ""}
          confirmText="Delete"
          destructive
          submitting={deleteMutation.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (deleteTarget?.id) {
              deleteMutation.mutate(deleteTarget.id, {
                onSuccess: () => setDeleteTarget(null),
              });
            }
          }}
        />
      </div>
    </PageLayout>
  );
}
