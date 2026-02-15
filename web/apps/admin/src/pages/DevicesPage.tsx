import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../context/AuthContext";
import { DeviceInfo, Machine } from "@traceability/sdk";
import { DataTable } from "../components/ui/DataTable";
import { Modal } from "../components/ui/Modal";
import { ApiErrorBanner } from "../components/ui/ApiErrorBanner";
import { formatApiError } from "../lib/errors";
import { formatDateTime } from "../lib/datetime";
import { Smartphone, Server } from "lucide-react";

export default function DevicesPage() {
  const queryClient = useQueryClient();
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState("");

  const { data: devices = [], isLoading: isLoadingDevices } = useQuery({
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
      cell: (device: DeviceInfo) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <Smartphone size={16} />
          </div>
          <div>
            <div className="font-medium text-gray-900 font-mono text-xs">{device.fingerprint}</div>
            <div className="text-xs text-gray-500">{device.hostname || "-"}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Last Seen",
      accessorKey: "last_seen" as any,
      cell: (device: DeviceInfo) => <span className="text-sm">{formatDateTime(device.last_seen)}</span>,
    },
    {
      header: "Assigned Machine",
      accessorKey: "assigned_machine" as any,
      cell: (device: DeviceInfo) =>
        device.assigned_machine ? (
          <div className="flex items-center gap-2 text-[#0D2A84] bg-[#E8EEFC] px-2 py-1 rounded-md w-fit">
            <Server size={14} />
            <span className="text-sm font-medium">{device.assigned_machine.name}</span>
          </div>
        ) : (
          <span className="text-gray-400 italic text-sm">Unassigned</span>
        ),
    },
    {
      header: "Action",
      cell: (device: DeviceInfo) => (
        <button onClick={(e) => { e.stopPropagation(); openAssignModal(device); }} className="text-xs bg-slate-800 text-white px-3 py-1 rounded hover:bg-slate-700 transition">
          {device.assigned_machine ? "Reassign" : "Assign Machine"}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Device Management</h1>

      <DataTable data={rows} columns={columns} isLoading={isLoadingDevices} />

      <Modal isOpen={!!selectedDevice} onClose={() => setSelectedDevice(null)} title={`Assign Machine`}> 
        <div className="space-y-4">
          <ApiErrorBanner message={assignMachine.isError ? formatApiError(assignMachine.error) : undefined} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Machine</label>
            <select className="w-full px-3 py-2 border rounded-md" value={selectedMachineId} onChange={(e) => setSelectedMachineId(e.target.value)}>
              <option value="">-- Select Machine --</option>
              {machines.map((m: Machine) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.line_code || "No Line"})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end pt-4">
            <button onClick={() => setSelectedDevice(null)} className="mr-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
              Cancel
            </button>
            <button onClick={() => assignMachine.mutate()} disabled={assignMachine.isPending || !selectedMachineId} className="px-4 py-2 bg-[#1134A6] text-white rounded-md hover:bg-[#0D2A84] disabled:opacity-50">
              {assignMachine.isPending ? "Saving..." : "Save Assignment"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
