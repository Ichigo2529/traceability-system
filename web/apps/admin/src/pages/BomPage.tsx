import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BomRow, Model, ModelRevision, RevisionStatus } from "@traceability/sdk";
import { Plus, Trash2 } from "lucide-react";
import { sdk } from "../context/AuthContext";
import { ApiErrorBanner } from "../components/ui/ApiErrorBanner";
import { formatApiError } from "../lib/errors";
import { BomRowDialog, BomRowForm } from "../components/shared/BomRowDialog";

export default function BomPage() {
  const queryClient = useQueryClient();
  const [modelId, setModelId] = useState<string>("");
  const [revisionId, setRevisionId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<BomRow | null>(null);

  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => sdk.admin.getModels(),
  });

  const { data: revisions = [] } = useQuery({
    queryKey: ["revisions", modelId],
    queryFn: () => sdk.admin.getRevisions(modelId),
    enabled: !!modelId,
  });

  const { data: bom = [] } = useQuery({
    queryKey: ["bom", modelId, revisionId],
    queryFn: () => sdk.admin.getBom(modelId, revisionId),
    enabled: !!modelId && !!revisionId,
  });

  const { data: componentTypes = [] } = useQuery({
    queryKey: ["component-types"],
    queryFn: () => sdk.admin.getComponentTypes(),
  });

  const { data: partNumbers = [] } = useQuery({
    queryKey: ["part-numbers"],
    queryFn: () => sdk.admin.getPartNumbers(),
  });

  useEffect(() => {
    if (!modelId && models.length) {
      setModelId(models[0].id);
    }
  }, [modelId, models]);

  useEffect(() => {
    if (!revisions.length) {
      setRevisionId("");
      return;
    }
    if (!revisionId || !revisions.some((r) => r.id === revisionId)) {
      setRevisionId(revisions[0].id);
    }
  }, [revisionId, revisions]);

  const selectedRevision = useMemo(
    () => revisions.find((r) => r.id === revisionId),
    [revisions, revisionId]
  );
  const selectedModel = useMemo(() => models.find((m) => m.id === modelId), [modelId, models]);
  const isReadOnly = selectedRevision?.status !== RevisionStatus.DRAFT;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["bom", modelId, revisionId] });
  };

  const createBom = useMutation({
    mutationFn: async (values: BomRowForm) => {
      await sdk.admin.createBomRow(modelId, revisionId, {
        component_name: values.component_name,
        component_unit_type: values.component_unit_type,
        component_part_number: values.component_part_number || undefined,
        rm_location: values.rm_location || undefined,
        qty_per_assy: values.qty_per_assy,
        required: values.required,
      });
    },
    onSuccess: () => {
      refresh();
      setDialogOpen(false);
      setEditingRow(null);
    },
  });

  const editBom = useMutation({
    mutationFn: async (values: BomRowForm) => {
      if (!editingRow) return;
      await sdk.admin.updateBomRow(modelId, revisionId, editingRow.id, {
        component_name: values.component_name,
        component_unit_type: values.component_unit_type,
        component_part_number: values.component_part_number || undefined,
        rm_location: values.rm_location || undefined,
        qty_per_assy: values.qty_per_assy,
        required: values.required,
      });
    },
    onSuccess: () => {
      refresh();
      setDialogOpen(false);
      setEditingRow(null);
    },
  });

  const deleteBom = useMutation({
    mutationFn: async (id: string) => sdk.admin.deleteBomRow(modelId, revisionId, id),
    onSuccess: refresh,
  });

  const error = createBom.error || editBom.error || deleteBom.error;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">BOM Management</h1>
          <p className="text-sm text-gray-500">Manage BOM rows by model revision</p>
        </div>
        {selectedRevision && (
          <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
            Revision Status: {selectedRevision.status}
          </span>
        )}
      </div>

      <ApiErrorBanner message={error ? formatApiError(error) : undefined} />

      <div className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Model</label>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            {(models as Model[]).map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} - {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Revision</label>
          <select
            value={revisionId}
            onChange={(e) => setRevisionId(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            disabled={!revisions.length}
          >
            {(revisions as ModelRevision[]).map((r) => (
              <option key={r.id} value={r.id}>
                {r.revision_code} ({r.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">BOM Rows</h2>
          {!isReadOnly && modelId && revisionId && (
            <button
              onClick={() => {
                setEditingRow(null);
                setDialogOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded border px-3 py-1 text-sm hover:bg-gray-50"
            >
              <Plus size={14} />
              Add BOM
            </button>
          )}
        </div>

        {!modelId || !revisionId ? (
          <div className="text-sm text-gray-500">Select model and revision</div>
        ) : !(bom as BomRow[]).length ? (
          <div className="text-sm text-gray-500">No BOM rows</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">Model</th>
                <th className="px-3 py-2 text-left">Part Number FG</th>
                <th className="px-3 py-2 text-left">Component</th>
                <th className="px-3 py-2 text-left">Part Number RM</th>
                <th className="px-3 py-2 text-left">Location</th>
                <th className="px-3 py-2 text-right">Use pcs / 1 VCM</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(bom as BomRow[]).map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">{selectedModel?.name || "-"}</td>
                  <td className="px-3 py-2 font-semibold text-[#1134A6]">{selectedModel?.part_number || "-"}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.component_name || row.component_unit_type}</div>
                    <div className="text-xs text-gray-500">{row.component_unit_type}</div>
                  </td>
                  <td className="px-3 py-2 font-semibold text-[#1134A6]">{row.component_part_number || "-"}</td>
                  <td className="px-3 py-2">{row.rm_location || "-"}</td>
                  <td className="px-3 py-2 text-right font-semibold">{row.qty_per_assy}</td>
                  <td className="space-x-2 px-3 py-2 text-right">
                    {!isReadOnly && (
                      <>
                        <button
                          onClick={() => {
                            setEditingRow(row);
                            setDialogOpen(true);
                          }}
                          className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteBom.mutate(row.id)}
                          className="inline-flex items-center text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <BomRowDialog
        open={dialogOpen}
        row={editingRow}
        submitting={createBom.isPending || editBom.isPending}
        componentTypeOptions={componentTypes.map((ct) => ({ code: ct.code, name: ct.name }))}
        partNumberOptions={partNumbers.map((pn) => pn.part_number)}
        onClose={() => {
          setDialogOpen(false);
          setEditingRow(null);
        }}
        onSubmit={(values) => {
          if (editingRow) editBom.mutate(values);
          else createBom.mutate(values);
        }}
      />
    </div>
  );
}
