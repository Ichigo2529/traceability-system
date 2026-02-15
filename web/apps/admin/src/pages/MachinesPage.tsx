import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../context/AuthContext";
import { Machine } from "@traceability/sdk";
import { DataTable } from "../components/ui/DataTable";
import { Modal } from "../components/ui/Modal";
import { ApiErrorBanner } from "../components/ui/ApiErrorBanner";
import { formatApiError } from "../lib/errors";
import { Server, Plus, Trash2, Pencil } from "lucide-react";

const EMPTY_FORM = { name: "", station_type: "SCANNER", line_code: "", supported_variants: "" };

export default function MachinesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data: machines = [], isLoading } = useQuery({
    queryKey: ["machines"],
    queryFn: () => sdk.admin.getMachines(),
  });

  const createMachine = useMutation({
    mutationFn: async (data: any) => sdk.admin.createMachine(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      setIsModalOpen(false);
      setFormData(EMPTY_FORM);
      setEditingId(null);
    },
  });

  const updateMachine = useMutation({
    mutationFn: async (data: any) => sdk.admin.updateMachine(editingId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      setIsModalOpen(false);
      setFormData(EMPTY_FORM);
      setEditingId(null);
    },
  });

  const deleteMachine = useMutation({
    mutationFn: async (id: string) => sdk.admin.deleteMachine(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["machines"] }),
  });

  const openCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (m: Machine) => {
    setEditingId(m.id);
    setFormData({
      name: m.name,
      station_type: m.station_type,
      line_code: m.line_code || "",
      supported_variants: (m.supported_variants || []).join(","),
    });
    setIsModalOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      station_type: formData.station_type,
      line_code: formData.line_code || null,
      supported_variants: formData.supported_variants
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    if (editingId) updateMachine.mutate(payload);
    else createMachine.mutate(payload);
  };

  const columns = [
    {
      header: "Name",
      accessorKey: "name" as any,
      cell: (machine: Machine) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#D8E2FA] flex items-center justify-center text-[#1134A6]">
            <Server size={16} />
          </div>
          <span className="font-medium text-gray-900">{machine.name}</span>
        </div>
      ),
    },
    { header: "Station Type", accessorKey: "station_type" as any },
    {
      header: "Line Code",
      accessorKey: "line_code" as any,
      cell: (machine: Machine) => (machine.line_code ? <span className="font-mono text-sm">{machine.line_code}</span> : <span className="text-gray-400">-</span>),
    },
    {
      header: "Supported Variants",
      accessorKey: "supported_variants" as any,
      cell: (machine: Machine) => (machine.supported_variants?.length ? machine.supported_variants.join(", ") : "-"),
    },
    {
      header: "Action",
      cell: (machine: Machine) => (
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); openEdit(machine); }} className="text-[#1134A6] hover:text-[#0A1F66] p-1" title="Edit Machine">
            <Pencil size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Deactivate this machine?")) deleteMachine.mutate(machine.id);
            }}
            className="text-red-600 hover:text-red-800 p-1"
            title="Deactivate Machine"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const mutationError = createMachine.isError
    ? formatApiError(createMachine.error)
    : updateMachine.isError
      ? formatApiError(updateMachine.error)
      : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Machines</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#1134A6] text-white rounded hover:bg-[#0D2A84] transition">
          <Plus size={18} />
          <span>Add Machine</span>
        </button>
      </div>

      <DataTable data={machines as any} columns={columns} isLoading={isLoading} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Machine" : "Create Machine"}>
        <form onSubmit={submit} className="space-y-4">
          <ApiErrorBanner message={mutationError} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Machine Name</label>
            <input type="text" required className="w-full px-3 py-2 border rounded-md" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Station Type</label>
            <select className="w-full px-3 py-2 border rounded-md" value={formData.station_type} onChange={(e) => setFormData({ ...formData, station_type: e.target.value })}>
              <option value="SCANNER">SCANNER</option>
              <option value="PRINTER">PRINTER</option>
              <option value="TESTER">TESTER</option>
              <option value="ASSEMBLY">ASSEMBLY</option>
              <option value="PACKING">PACKING</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Line Code</label>
            <input type="text" className="w-full px-3 py-2 border rounded-md" value={formData.line_code} onChange={(e) => setFormData({ ...formData, line_code: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supported Variants (comma separated)</label>
            <input type="text" className="w-full px-3 py-2 border rounded-md" value={formData.supported_variants} onChange={(e) => setFormData({ ...formData, supported_variants: e.target.value })} placeholder="WITH_SHROUD, NO_SHROUD" />
          </div>

          <div className="flex justify-end pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="mr-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
              Cancel
            </button>
            <button type="submit" disabled={createMachine.isPending || updateMachine.isPending} className="px-4 py-2 bg-[#1134A6] text-white rounded-md hover:bg-[#0D2A84] disabled:opacity-50">
              {createMachine.isPending || updateMachine.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
