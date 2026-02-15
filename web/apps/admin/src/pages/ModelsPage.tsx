import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../context/AuthContext";
import { Model } from "@traceability/sdk";
import { DataTable } from "../components/ui/DataTable";
import { Modal } from "../components/ui/Modal";
import { ApiErrorBanner } from "../components/ui/ApiErrorBanner";
import { formatApiError } from "../lib/errors";
import { Box, Plus, Trash2, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ModelsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", code: "", description: "" });

  const { data: models = [], isLoading } = useQuery({
    queryKey: ["models"],
    queryFn: () => sdk.admin.getModels(),
  });

  const createModel = useMutation({
    mutationFn: async (data: { name: string; code: string; description?: string }) => sdk.admin.createModel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      setIsModalOpen(false);
      setFormData({ name: "", code: "", description: "" });
    },
  });

  const deleteModel = useMutation({
    mutationFn: async (id: string) => sdk.admin.deleteModel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["models"] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createModel.mutate(formData);
  };

  const columns = [
    {
      header: "Model",
      accessorKey: "name" as any,
      cell: (model: Model) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#D8E2FA] flex items-center justify-center text-[#1134A6]">
            <Box size={16} />
          </div>
          <div>
            <div className="font-medium text-gray-900">{model.name}</div>
            <div className="text-xs text-gray-500">{model.code}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Active Revision",
      accessorKey: "active_revision_code" as any,
      cell: (model: Model) => model.active_revision_code || "-",
    },
    {
      header: "Actions",
      cell: (model: Model) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/models/${model.id}`);
            }}
            className="flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded hover:bg-slate-200 transition"
          >
            <Settings size={14} />
            Configure
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Delete this model?")) deleteModel.mutate(model.id);
            }}
            className="text-red-600 hover:text-red-800 p-1"
            title="Delete Model"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Models</h1>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#1134A6] text-white rounded hover:bg-[#0D2A84] transition">
          <Plus size={18} />
          <span>New Model</span>
        </button>
      </div>

      <DataTable data={models as any} columns={columns} isLoading={isLoading} onRowClick={(model) => navigate(`/models/${model.id}`)} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Model">
        <form onSubmit={handleSubmit} className="space-y-4">
          <ApiErrorBanner message={createModel.isError ? formatApiError(createModel.error) : undefined} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" required className="w-full px-3 py-2 border rounded-md" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
            <input type="text" required className="w-full px-3 py-2 border rounded-md" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="w-full px-3 py-2 border rounded-md" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
          </div>

          <div className="flex justify-end pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="mr-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
              Cancel
            </button>
            <button type="submit" disabled={createModel.isPending} className="px-4 py-2 bg-[#1134A6] text-white rounded-md hover:bg-[#0D2A84] disabled:opacity-50">
              {createModel.isPending ? "Creating..." : "Create Model"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
