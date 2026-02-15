import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../context/AuthContext";
import { LabelTemplate } from "@traceability/sdk";
import { DataTable } from "../components/ui/DataTable";
import { Modal } from "../components/ui/Modal";
import { ApiErrorBanner } from "../components/ui/ApiErrorBanner";
import { formatApiError } from "../lib/errors";
import { formatDateTime } from "../lib/datetime";
import { Plus, Trash2, Pencil, Code } from "lucide-react";

const EMPTY = { name: "", revision_id: "", template_body: "{}", description: "" };

export default function LabelTemplatesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<LabelTemplate | null>(null);
  const [form, setForm] = useState(EMPTY);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: () => sdk.admin.getLabelTemplates(),
  });

  const createTemplate = useMutation({
    mutationFn: async () => sdk.admin.createLabelTemplate(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setIsModalOpen(false);
      setEditing(null);
      setForm(EMPTY);
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async () => sdk.admin.updateLabelTemplate(editing!.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setIsModalOpen(false);
      setEditing(null);
      setForm(EMPTY);
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteLabelTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setIsModalOpen(true);
  };

  const openEdit = (t: LabelTemplate) => {
    setEditing(t);
    setForm({
      name: t.name,
      revision_id: t.revision_id || "",
      template_body: t.template_body,
      description: t.description || "",
    });
    setIsModalOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateTemplate.mutate();
    else createTemplate.mutate();
  };

  const columns = [
    { header: "Name", accessorKey: "name" as any },
    { header: "Revision", accessorKey: "revision_id" as any, cell: (t: LabelTemplate) => t.revision_id || "GLOBAL" },
    { header: "Updated", accessorKey: "updated_at" as any, cell: (t: LabelTemplate) => formatDateTime(t.updated_at) },
    {
      header: "Actions",
      cell: (t: LabelTemplate) => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(t)} className="p-1 hover:bg-gray-100 rounded text-[#1134A6]">
            <Pencil size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Delete template?")) deleteTemplate.mutate(t.id);
            }}
            className="p-1 hover:bg-gray-100 rounded text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const errorMessage = createTemplate.isError
    ? formatApiError(createTemplate.error)
    : updateTemplate.isError
      ? formatApiError(updateTemplate.error)
      : deleteTemplate.isError
        ? formatApiError(deleteTemplate.error)
        : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Label Templates</h1>
          <p className="text-sm text-gray-500">JSON template editor and template registry.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#1134A6] text-white rounded hover:bg-[#0D2A84] transition">
          <Plus size={18} />
          <span>New Template</span>
        </button>
      </div>

      <ApiErrorBanner message={errorMessage} />

      <DataTable data={templates as any} columns={columns} isLoading={isLoading} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? "Edit Template" : "New Label Template"}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input required className="w-full px-3 py-2 border rounded-md" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Revision ID (optional)</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.revision_id} onChange={(e) => setForm({ ...form, revision_id: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template JSON</label>
            <div className="relative">
              <textarea required rows={10} className="w-full px-3 py-2 border rounded-md font-mono text-sm" value={form.template_body} onChange={(e) => setForm({ ...form, template_body: e.target.value })} />
              <Code className="absolute top-2 right-2 text-gray-400" size={16} />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="mr-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
              Cancel
            </button>
            <button type="submit" disabled={createTemplate.isPending || updateTemplate.isPending} className="px-4 py-2 bg-[#1134A6] text-white rounded-md hover:bg-[#0D2A84] disabled:opacity-50">
              {createTemplate.isPending || updateTemplate.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
