import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../context/AuthContext";
import { DeviceInfo, Machine } from "@traceability/sdk";
import { DataTable } from "../components/shared/DataTable";
import { ApiErrorBanner } from "../components/ui/ApiErrorBanner";
import { formatApiError } from "../lib/errors";
import { formatDateTime } from "../lib/datetime";
import { 
    Page, 
    Bar, 
    Title, 
    Button, 
    Dialog, 
    Form, 
    FormItem, 
    Select, 
    Option,
    Label,
    FlexBox,
    FlexBoxAlignItems,
    Icon,
    ObjectStatus
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/laptop.js";
import "@ui5/webcomponents-icons/dist/server.js";


export default function DevicesPage() {
  const queryClient = useQueryClient();
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState("");

  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: () => sdk.admin.getDevices(),
  });

  const { data: machines = [] } = useQuery({
    queryKey: ["machines"],
    queryFn: () => sdk.admin.getMachines(),
  });

  const assignMachine = useMutation({
    mutationFn: async () => {
      if (!selectedDevice?.id) return;
      await sdk.admin.assignDeviceMachine(selectedDevice.id, selectedMachineId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      setSelectedDevice(null);
      setSelectedMachineId("");
    },
  });

  const openAssignModal = (device: DeviceInfo) => {
    setSelectedDevice(device);
    setSelectedMachineId(device.machine_id || "");
  };

  const rows = (devices as DeviceInfo[]).map((d) => ({ ...d, id: d.id! }));

  const columns = [
    {
      header: "Fingerprint",
      accessorKey: "fingerprint" as any,
      cell: ({ row }: { row: any }) => (
        <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
          <Icon name="laptop" />
          <FlexBox direction="Column">
            <span style={{ fontWeight: "bold" }}>{row.original.fingerprint}</span>
            <span style={{ fontSize: "0.75rem", color: "var(--sapContent_LabelColor)" }}>{row.original.hostname || "-"}</span>
          </FlexBox>
        </FlexBox>
      ),
    },
    {
      header: "Last Seen",
      accessorKey: "last_seen" as any,
      cell: ({ row }: { row: any }) => <span>{formatDateTime(row.original.last_seen)}</span>,
    },
    {
      header: "Assigned Machine",
      accessorKey: "assigned_machine" as any,
      cell: ({ row }: { row: any }) =>
        row.original.assigned_machine ? (
          <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
            <Icon name="server" />
            <span style={{ fontWeight: 600 }}>{row.original.assigned_machine.name}</span>
          </FlexBox>
        ) : (
          <ObjectStatus state="Critical">Unassigned</ObjectStatus>
        ),
    },
    {
      header: "Action",
      cell: ({ row }: { row: any }) => (
        <Button onClick={(e) => { e.stopPropagation(); openAssignModal(row.original); }} design="Transparent">
          {row.original.assigned_machine ? "Reassign" : "Assign Machine"}
        </Button>
      ),
    },
  ];


  return (
    <Page
      backgroundDesign="List"
      header={
        <Bar
          startContent={<Title level="H2">Device Management</Title>}
        />
      }
      style={{ height: "100%" }}
    >
      <div style={{ padding: "1rem", width: "100%", boxSizing: "border-box" }}>
        <DataTable data={rows} columns={columns} />
      </div>

      <Dialog
        headerText="Assign Machine"
        open={!!selectedDevice}
        onClose={() => setSelectedDevice(null)}
        footer={
          <Bar
            endContent={
              <>
                <Button onClick={() => setSelectedDevice(null)} design="Transparent">
                  Cancel
                </Button>
                <Button onClick={() => assignMachine.mutate()} disabled={assignMachine.isPending || !selectedMachineId} design="Emphasized">
                  {assignMachine.isPending ? "Saving..." : "Save Assignment"}
                </Button>
              </>
            }
          />
        }
      >
        <div style={{ padding: "1rem", width: "400px" }}>
            <ApiErrorBanner message={assignMachine.isError ? formatApiError(assignMachine.error) : undefined} />
            <Form layout="S12 M12 L12 XL12">
                <FormItem labelContent={<Label>Machine</Label>}>
                    <Select value={selectedMachineId} onChange={(e) => setSelectedMachineId(e.target.value)} style={{ width: "100%" }}>
                        <Option value="">-- Select Machine --</Option>
                        {machines.map((m: Machine) => (
                        <Option key={m.id} value={m.id}>
                            {m.name} ({m.line_code || "No Line"})
                        </Option>
                        ))}
                    </Select>
                </FormItem>
            </Form>
        </div>
      </Dialog>
    </Page>
  );
}
