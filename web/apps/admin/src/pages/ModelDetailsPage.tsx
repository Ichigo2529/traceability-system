import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../context/AuthContext";
import { ModelRevision, RevisionStatus } from "@traceability/sdk";
import { DataTable } from "../components/ui/DataTable";
import { Modal } from "../components/ui/Modal";
import { ApiErrorBanner } from "../components/ui/ApiErrorBanner";
import { formatApiError } from "../lib/errors";
import { formatDateTime } from "../lib/datetime";
import { Plus, CheckCircle, GitBranch, ArrowLeft, AlertCircle } from "lucide-react";
import { clsx } from "clsx";

export default function ModelDetailsPage() {
  const { id: modelId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRevisionCode, setNewRevisionCode] = useState("");
  const [cloneFromRevisionId, setCloneFromRevisionId] = useState("");

  const { data: revisions = [], isLoading } = useQuery({
    queryKey: ["models", modelId, "revisions"],
    queryFn: () => sdk.admin.getRevisions(modelId!),
    enabled: !!modelId,
  });

  const createRevision = useMutation({
    mutationFn: async () =>
      sdk.admin.createRevision(modelId!, {
        revision_code: newRevisionCode,
        clone_from_revision_id: cloneFromRevisionId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models", modelId, "revisions"] });
      setIsModalOpen(false);
      setNewRevisionCode("");
      setCloneFromRevisionId("");
    },
  });

  const activateRevision = useMutation({
    mutationFn: async (revisionId: string) => sdk.admin.activateRevision(modelId!, revisionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["models", modelId, "revisions"] }),
  });

  const columns = [
    {
      header: "Revision",
      accessorKey: "revision_code" as any,
      cell: (rev: ModelRevision) => (
        <div className="flex items-center gap-2">
          <div className="bg-[#E8EEFC] text-[#1134A6] p-1 rounded">
            <GitBranch size={14} />
          </div>
          <span className="font-semibold text-gray-900">{rev.revision_code}</span>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status" as any,
      cell: (rev: ModelRevision) => (
        <span
          className={clsx(
            "px-2 py-0.5 rounded-full text-xs font-medium border",
            rev.status === RevisionStatus.ACTIVE
              ? "bg-green-100 text-green-700 border-green-200"
              : rev.status === RevisionStatus.DRAFT
                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                : "bg-gray-100 text-gray-600 border-gray-200"
          )}
        >
          {rev.status}
        </span>
      ),
    },
    {
      header: "Updated",
      accessorKey: "updated_at" as any,
      cell: (rev: ModelRevision) => <span className="text-gray-500 text-sm">{formatDateTime(rev.updated_at)}</span>,
    },
    {
      header: "Actions",
      cell: (rev: ModelRevision) => (
        <div className="flex items-center gap-2">
          {rev.status !== RevisionStatus.ACTIVE && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Activate revision ${rev.revision_code}?`)) activateRevision.mutate(rev.id);
              }}
              disabled={activateRevision.isPending}
              className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded hover:bg-green-100 transition"
            >
              <CheckCircle size={12} />
              Activate
            </button>
          )}
          {rev.status === RevisionStatus.ACTIVE && <span className="text-xs text-green-700">Live</span>}
        </div>
      ),
    },
  ];

  if (!modelId) return <div>Invalid Model ID</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/admin/models")} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Model Revisions</h1>
            <p className="text-sm text-gray-500">Create/clone revisions and activate when readiness is PASS.</p>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#1134A6] text-white rounded hover:bg-[#0D2A84] transition">
          <Plus size={18} />
          <span>New Draft</span>
        </button>
      </div>

      <div className="bg-[#E8EEFC] border border-[#C3D2F7] rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="text-[#1134A6] shrink-0 mt-0.5" size={18} />
        <div>
          <h3 className="text-sm font-semibold text-[#0A1F66]">Production Control</h3>
          <p className="text-sm text-[#0D2A84] mt-1">Only ACTIVE revision is used in production. Active revisions are read-only.</p>
        </div>
      </div>

      <ApiErrorBanner message={activateRevision.isError ? formatApiError(activateRevision.error) : undefined} />

      <DataTable data={revisions as any} columns={columns} isLoading={isLoading} onRowClick={(rev) => navigate(`/admin/models/${modelId}/revisions/${rev.id}`)} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Revision">
        <div className="space-y-4">
          <ApiErrorBanner message={createRevision.isError ? formatApiError(createRevision.error) : undefined} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Revision Code</label>
            <input className="w-full px-3 py-2 border rounded-md" value={newRevisionCode} onChange={(e) => setNewRevisionCode(e.target.value)} placeholder="R01" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clone From (Optional)</label>
            <select className="w-full px-3 py-2 border rounded-md" value={cloneFromRevisionId} onChange={(e) => setCloneFromRevisionId(e.target.value)}>
              <option value="">-- Empty Draft --</option>
              {(revisions as ModelRevision[]).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.revision_code} ({r.status})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end pt-4">
            <button onClick={() => setIsModalOpen(false)} className="mr-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
              Cancel
            </button>
            <button onClick={() => createRevision.mutate()} disabled={createRevision.isPending || !newRevisionCode} className="px-4 py-2 bg-[#1134A6] text-white rounded-md hover:bg-[#0D2A84] disabled:opacity-50">
              {createRevision.isPending ? "Creating..." : "Create Draft"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
