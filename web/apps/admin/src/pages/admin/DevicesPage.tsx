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
import {
  Button,
  Label,
  Input,
  Select,
  Option,
  FlexBox,
  FlexBoxAlignItems,
  Form,
  FormItem,
  FlexBoxDirection
} from "@ui5/webcomponents-react";
import { FormDialog } from "../../components/shared/FormDialog";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/refresh.js";
import "@ui5/webcomponents-icons/dist/shield.js";
import "@ui5/webcomponents-icons/dist/wrench.js";
import "@ui5/webcomponents-icons/dist/cancel.js";
import "@ui5/webcomponents-icons/dist/accept.js";

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
  const { showToast, ToastComponent } = useToast();

  const { data: devices = [], isLoading: devicesLoading } = useQuery({ queryKey: ["devices"], queryFn: () => sdk.admin.getDevices() });
  const { data: stations = [], isLoading: stationsLoading } = useQuery({ queryKey: ["stations"], queryFn: () => sdk.admin.getStations() });
  const { data: processes = [], isLoading: processesLoading } = useQuery({ queryKey: ["processes"], queryFn: () => sdk.admin.getProcesses() });
  const { data: heartbeatSettings, isLoading: settingsLoading } = useQuery({ queryKey: ["heartbeat-settings"], queryFn: () => sdk.admin.getHeartbeatSettings() });

  const onlineWindowMin = heartbeatSettings?.online_window_minutes ?? 2;

  const { control, handleSubmit, reset, formState: { errors } } = useForm<DeviceForm>({
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
    mutationFn: ({ id, status }: { id: string; status: "active" | "disabled" | "maintenance" }) => sdk.admin.setDeviceStatus(id, status),
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
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: online ? "var(--sapPositiveColor)" : "var(--sapNeutralBorderColor)",
                  display: "inline-block"
                }}
              />
              <StatusBadge status={row.original.status || "disabled"} />
            </div>
          );
        },
      },
      { header: "Last Seen", cell: ({ row }) => toDateText(row.original.last_heartbeat_at) },
      {
        header: "Actions",
        size: 250,
        cell: ({ row }) => (
          <FlexBox style={{ gap: "0.25rem", flexWrap: "nowrap" }}>
            <Button
              icon="edit"
              design="Transparent"
              className="button-hover-scale"
              onClick={() => {
                setEditing(row.original);
                reset({
                  device_code: row.original.device_code || "",
                  name: row.original.name || "",
                  device_type: (row.original.device_type as any) || "pi",
                  station_id: row.original.station_id || "",
                  process_id: row.original.process_id || "",
                  ip_address: row.original.ip_address || "",
                  status: (row.original.status as any) || "active",
                  activation_pin: "000000",
                });
                setOpen(true);
              }}
              tooltip="Edit Device"
              aria-label="Edit Device"
            />
            <Button 
                icon="wrench" 
                design="Transparent"
                className="button-hover-scale"
                onClick={() => setStatusTarget({ device: row.original, status: "maintenance" })}
                tooltip="Set to Maintenance"
                aria-label="Set to Maintenance"
            />
            <Button 
                icon={row.original.status === "disabled" ? "accept" : "cancel"}
                design="Transparent"
                className="button-hover-scale"
                onClick={() => setStatusTarget({ device: row.original, status: row.original.status === "disabled" ? "active" : "disabled" })}
                tooltip={row.original.status === "disabled" ? "Enable Device" : "Disable Device"}
                aria-label={row.original.status === "disabled" ? "Enable Device" : "Disable Device"}
            />
            <Button 
                icon="refresh"
                design="Transparent"
                className="button-hover-scale"
                onClick={() => setSecretTarget(row.original)}
                tooltip="Regenerate Secret Key"
                aria-label="Regenerate Secret Key"
            />
            <Button
              icon="delete"
              design="Transparent"
              className="button-hover-scale"
              style={{ color: "var(--sapNegativeColor)" }}
              onClick={() => {
                if (!row.original.id) return;
                setDeleteTarget(row.original);
              }}
              tooltip="Delete Device"
              aria-label="Delete Device"
            />
          </FlexBox>
        ),
      },
    ],
    [deleteMutation, reset, onlineWindowMin, processMap, stationMap]
  );

  return (
    <PageLayout
      title="Devices & Terminals"
      subtitle={
        <FlexBox alignItems={FlexBoxAlignItems.Center}>
          <span className="indicator-live" />
          <span>Hardware terminals and scanner registration</span>
        </FlexBox>
      }
      icon="wrench"
      iconColor="indigo"
    >
      <div className="page-container">
        <ApiErrorBanner 
            message={
                createMutation.isError ? formatApiError(createMutation.error) :
                updateMutation.isError ? formatApiError(updateMutation.error) :
                statusMutation.isError ? formatApiError(statusMutation.error) :
                secretMutation.isError ? formatApiError(secretMutation.error) :
                deleteMutation.isError ? formatApiError(deleteMutation.error) :
                undefined
            } 
        />
      {newSecret && (
          <div style={{ margin: "1rem", padding: "1rem", border: "1px solid var(--sapInformationBorderColor)", background: "var(--sapInformationBackground)", borderRadius: "var(--sapElement_BorderCornerRadius)" }}>
              <FlexBox direction={FlexBoxDirection.Column}>
                  <Label style={{ fontWeight: "bold" }}>Latest secret key:</Label>
                  <code style={{ fontSize: "1.2rem", color: "var(--sapContent_MonospaceFontFamily)" }}>{newSecret}</code>
              </FlexBox>
          </div>
      )}

      <DataTable 
          data={devices} 
          columns={columns} 
          loading={devicesLoading || stationsLoading || processesLoading || settingsLoading}
          filterPlaceholder="Search device code, station, IP..." 
          actions={
              <Button
                icon="add"
                design="Emphasized"
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
                Add Device
              </Button>
          }
      />

      {/* Create/Edit Dialog */}
      <FormDialog
          open={open}
          title={editing ? "Edit Device" : "Create Device"}
          onClose={() => setOpen(false)}
          onSubmit={handleSubmit((values) => (editing ? updateMutation.mutate(values) : createMutation.mutate(values)))}
          submitting={createMutation.isPending || updateMutation.isPending}
      >
              <Form layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12">
                  <FormItem labelContent={<Label required>Device Code</Label>}>
                      <Controller
                          name="device_code"
                          control={control}
                          render={({ field }) => (
                              <Input 
                                  {...field} 
                                  value={field.value || ""} 
                                  placeholder="PI5-ASM-01" 
                                  valueState={errors.device_code ? "Negative" : "None"}
                                  valueStateMessage={errors.device_code && <div>{errors.device_code.message}</div>}
                              />
                          )}
                      />
                  </FormItem>
                  <FormItem labelContent={<Label required>Name</Label>}>
                      <Controller
                          name="name"
                          control={control}
                          render={({ field }) => (
                              <Input 
                                  {...field} 
                                  value={field.value || ""} 
                                  placeholder="ASM Scanner 01" 
                                  valueState={errors.name ? "Negative" : "None"}
                                  valueStateMessage={errors.name && <div>{errors.name.message}</div>}
                              />
                          )}
                      />
                  </FormItem>

                  <FormItem labelContent={<Label>Device Type</Label>} style={{ gridColumn: "span 2" }}>
                      <Controller
                          name="device_type"
                          control={control}
                          render={({ field }) => (
                              <Select
                                  onChange={(e) => field.onChange((e.target.selectedOption as any).dataset.value)}
                                  value={field.value}
                              >
                                  <Option value="pi" data-value="pi" selected={field.value === "pi"}>pi</Option>
                                  <Option value="pc" data-value="pc" selected={field.value === "pc"}>pc</Option>
                                  <Option value="tablet" data-value="tablet" selected={field.value === "tablet"}>tablet</Option>
                                  <Option value="kiosk" data-value="kiosk" selected={field.value === "kiosk"}>kiosk</Option>
                              </Select>
                          )}
                      />
                  </FormItem>

                  <FormItem labelContent={<Label>IP Address</Label>} style={{ gridColumn: "span 2" }}>
                      <Controller
                          name="ip_address"
                          control={control}
                          render={({ field }) => (<Input {...field} value={field.value || ""} placeholder="192.168.10.35" />)}
                      />
                  </FormItem>

                  <FormItem labelContent={<Label>Station</Label>}>
                      <Controller
                          name="station_id"
                          control={control}
                          render={({ field }) => (
                              <Select
                                  onChange={(e) => field.onChange((e.target.selectedOption as any).dataset.value === NONE ? "" : (e.target.selectedOption as any).dataset.value)}
                                  value={field.value || NONE}
                              >
                                  <Option value={NONE} data-value={NONE}>Unassigned</Option>
                                  {stations.map((row) => (
                                      <Option key={row.id} value={row.id} data-value={row.id} selected={row.id === field.value}>
                                          {row.station_code} - {row.name}
                                      </Option>
                                  ))}
                              </Select>
                          )}
                      />
                  </FormItem>

                  <FormItem labelContent={<Label>Process</Label>}>
                      <Controller
                          name="process_id"
                          control={control}
                          render={({ field }) => (
                              <Select
                                  onChange={(e) => field.onChange((e.target.selectedOption as any).dataset.value === NONE ? "" : (e.target.selectedOption as any).dataset.value)}
                                  value={field.value || NONE}
                              >
                                  <Option value={NONE} data-value={NONE}>Unassigned</Option>
                                  {processes.map((row) => (
                                      <Option key={row.id} value={row.id} data-value={row.id} selected={row.id === field.value}>
                                          {row.process_code} - {row.name}
                                      </Option>
                                  ))}
                              </Select>
                          )}
                      />
                  </FormItem>

                   <FormItem labelContent={<Label>Status</Label>}>
                      <Controller
                          name="status"
                          control={control}
                          render={({ field }) => (
                              <Select
                                  onChange={(e) => field.onChange((e.target.selectedOption as any).dataset.value)}
                                  value={field.value}
                              >
                                  <Option value="active" data-value="active" selected={field.value === "active"}>active</Option>
                                  <Option value="maintenance" data-value="maintenance" selected={field.value === "maintenance"}>maintenance</Option>
                                  <Option value="disabled" data-value="disabled" selected={field.value === "disabled"}>disabled</Option>
                              </Select>
                          )}
                      />
                  </FormItem>

                  <FormItem labelContent={<Label>Activation PIN</Label>}>
                      <Controller
                          name="activation_pin"
                          control={control}
                          render={({ field }) => (<Input {...field} value={field.value || ""} disabled={Boolean(editing)} />)}
                      />
                  </FormItem>
              </Form>
      </FormDialog>

      {/* Status Confirmation */}
      <ConfirmDialog
          open={Boolean(statusTarget)}
          title="Change Device Status"
          description={statusTarget ? `Are you sure you want to set ${statusTarget.device.device_code} to ${statusTarget.status.toUpperCase()}?` : ""}
          confirmText="Change Status"
          submitting={statusMutation.isPending}
          onCancel={() => setStatusTarget(null)}
          onConfirm={() => {
              if (statusTarget?.device.id) {
                  statusMutation.mutate({ id: statusTarget.device.id, status: statusTarget.status });
              }
          }}
      />
      
      {/* Secret Confirmation */}
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

      {/* Delete Confirmation */}
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
                    onSuccess: () => setDeleteTarget(null)
                  });
              }
          }}
      />
       </div>
      <ToastComponent />
    </PageLayout>
  );
}
