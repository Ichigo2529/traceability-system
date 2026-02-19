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
import {
  Button,
  Input,
  CheckBox,
  Label,
  Form,
  FormItem,
  Select,
  Option,
  FlexBox,
  FlexBoxAlignItems
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/factory.js";

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
  const { data: stations = [], isLoading: stationsLoading } = useQuery({ queryKey: ["stations"], queryFn: () => sdk.admin.getStations() });
  const { data: processes = [], isLoading: processesLoading } = useQuery({ queryKey: ["processes"], queryFn: () => sdk.admin.getProcesses() });
  const form = useForm<StationForm>({ resolver: zodResolver(schema), defaultValues: { active: true } });

  const createMutation = useMutation({
    mutationFn: (v: StationForm) => sdk.admin.createStation(toStationPayload(v)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stations"] });
      setOpen(false);
      form.reset({ station_code: "", name: "", active: true });
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
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              icon="edit"
              design="Transparent"
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
              tooltip="Edit Station"
            />
            <Button
              icon="delete"
              design="Transparent"
              onClick={() => {
                setDeleteTarget(row.original);
              }}
              tooltip="Delete Station"
            />
          </div>
        ),
      },
    ],
    [deleteMutation, form]
  );

  return (
    <PageLayout
      title="Stations"
      subtitle={
        <FlexBox alignItems={FlexBoxAlignItems.Center}>
            <span className="indicator-live" />
            <span>Factory stations bound to process and area</span>
        </FlexBox>
      }
      icon="factory"
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
            data={stations} 
            columns={columns} 
            loading={stationsLoading || processesLoading}
            filterPlaceholder="Search station..." 
            actions={
                <Button
                  icon="add"
                  design="Emphasized"
                  className="button-hover-scale"
                  onClick={() => {
                    setEditing(null);
                    form.reset({ station_code: "", name: "", active: true });
                    setOpen(true);
                  }}
                >
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
        <Form layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12">
          <FormItem labelContent={<Label>Station Code</Label>}>
            <Input {...form.register("station_code")} />
          </FormItem>
          <FormItem labelContent={<Label>Name</Label>}>
            <Input {...form.register("name")} />
          </FormItem>
          <FormItem labelContent={<Label>Line</Label>}>
            <Input {...form.register("line")} />
          </FormItem>
          <FormItem labelContent={<Label>Area</Label>}>
            <Input {...form.register("area")} />
          </FormItem>
          <FormItem labelContent={<Label>Process</Label>}>
               <Controller
                  control={form.control}
                  name="process_id"
                  render={({ field }) => (
                       <Select
                          onChange={(e) => {
                              const selected = e.detail.selectedOption as unknown as { value: string };
                              field.onChange(selected.value === NONE ? "" : selected.value);
                          }}
                          value={field.value || NONE}
                      >
                          <Option value={NONE}>Unassigned</Option>
                           {processes.map((p) => (
                              <Option key={p.id} value={p.id}>
                                {p.process_code} - {p.name}
                              </Option>
                            ))}
                      </Select>
                  )}
               />
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
    </PageLayout>
  );
}

