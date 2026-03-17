import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BomRow, RevisionStatus } from "@traceability/sdk";
import { sdk } from "../context/AuthContext";
import { ApiErrorBanner } from "../components/ui/ApiErrorBanner";
import { formatApiError } from "../lib/errors";
import { BomRowDialog, BomRowForm } from "../components/shared/BomRowDialog";
import { PageLayout } from "@traceability/ui";
import { useToast } from "../hooks/useToast";
import { DataTable } from "../components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "../components/shared/StatusBadge";

export default function BomPage() {
  const queryClient = useQueryClient();
  const [modelId, setModelId] = useState<string>("");
  const [revisionId, setRevisionId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<BomRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BomRow | null>(null);
  const { showToast } = useToast();

  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ["models"],
    queryFn: () => sdk.admin.getModels(),
  });

  const { data: revisions = [], isLoading: revisionsLoading } = useQuery({
    queryKey: ["revisions", modelId],
    queryFn: () => sdk.admin.getRevisions(modelId),
    enabled: !!modelId,
  });

  const { data: bom = [], isLoading: bomLoading } = useQuery({
    queryKey: ["bom", modelId, revisionId],
    queryFn: () => sdk.admin.getBom(modelId, revisionId),
    enabled: !!modelId && !!revisionId,
  });

  const { data: componentTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ["component-types"],
    queryFn: () => sdk.admin.getComponentTypes(),
  });

  const { data: partNumbers = [], isLoading: partNumbersLoading } = useQuery({
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

  const selectedRevision = useMemo(() => revisions.find((r) => r.id === revisionId), [revisions, revisionId]);
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
      showToast("BOM row added successfully");
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
      showToast("BOM row updated successfully");
    },
  });

  const deleteBom = useMutation({
    mutationFn: async (id: string) => sdk.admin.deleteBomRow(modelId, revisionId, id),
    onSuccess: () => {
      refresh();
      setDeleteTarget(null);
      showToast("BOM row deleted");
    },
  });

  const error = createBom.error || editBom.error || deleteBom.error;

  const columns = useMemo<ColumnDef<BomRow>[]>(
    () => [
      {
        id: "model",
        header: "Model",
        cell: () => <Label className="font-normal">{selectedModel?.name || "-"}</Label>,
      },
      {
        id: "part_number",
        header: "Part Number FG",
        cell: () => <Label className="font-normal">{selectedModel?.part_number || "-"}</Label>,
      },
      {
        id: "component",
        header: "Component",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-bold">{row.original.component_name || row.original.component_unit_type}</span>
            <span className="text-xs">{row.original.component_unit_type}</span>
          </div>
        ),
      },
      {
        id: "component_part_number",
        header: "Part Number RM",
        accessorKey: "component_part_number",
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        id: "rm_location",
        header: "Location",
        accessorKey: "rm_location",
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        id: "qty_per_assy",
        header: "Use pcs / 1 VCM",
        accessorKey: "qty_per_assy",
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) =>
          !isReadOnly ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="button-hover-scale"
                onClick={() => {
                  setEditingRow(row.original);
                  setDialogOpen(true);
                }}
                title="Edit BOM Row"
                aria-label="Edit BOM Row"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="button-hover-scale"
                onClick={() => setDeleteTarget(row.original)}
                title="Delete BOM Row"
                aria-label="Delete BOM Row"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : null,
      },
    ],
    [isReadOnly, selectedModel]
  );

  return (
    <PageLayout
      title="BOM Configuration"
      subtitle={
        <div className="flex items-center gap-2">
          <span>Maintain Bill of Materials for specific model revisions</span>
        </div>
      }
      icon="list"
      iconColor="indigo"
    >
      <div className="page-container">
        <ApiErrorBanner message={error ? formatApiError(error) : undefined} />

        <div className="flex flex-wrap items-end gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex flex-col min-w-[200px]">
            <Label className="mb-1">Model</Label>
            <Select value={modelId} onValueChange={setModelId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.code} - {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col min-w-[200px]">
            <Label className="mb-1">Revision</Label>
            <Select value={revisionId} onValueChange={setRevisionId} disabled={!revisions.length}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select revision" />
              </SelectTrigger>
              <SelectContent>
                {revisions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.revision_code} ({r.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRevision && (
            <div className="flex flex-col">
              <Label className="mb-1">Status</Label>
              <StatusBadge status={selectedRevision.status === RevisionStatus.ACTIVE ? "active" : "draft"} />
            </div>
          )}
        </div>

        <DataTable
          data={bom}
          columns={columns}
          loading={bomLoading || modelsLoading || revisionsLoading || typesLoading || partNumbersLoading}
          filterPlaceholder="Search BOM..."
          actions={
            !isReadOnly && modelId && revisionId ? (
              <Button
                onClick={() => {
                  setEditingRow(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add BOM Row
              </Button>
            ) : undefined
          }
        />

        <BomRowDialog
          open={dialogOpen}
          row={editingRow}
          submitting={createBom.isPending || editBom.isPending}
          componentTypeOptions={componentTypes.map((ct) => ({ code: ct.code, name: ct.name }))}
          partNumberOptions={partNumbers.map((pn) => ({
            part_number: pn.part_number,
            component_type_id: pn.component_type_id,
            component_type_code: pn.component_type_code,
            default_pack_size: pn.default_pack_size,
            rm_location: pn.rm_location,
          }))}
          onClose={() => {
            setDialogOpen(false);
            setEditingRow(null);
          }}
          onSubmit={(values) => {
            if (editingRow) editBom.mutate(values);
            else createBom.mutate(values);
          }}
        />
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="Delete BOM row"
          description={
            deleteTarget
              ? `Are you sure you want to delete BOM row "${deleteTarget.component_name || deleteTarget.component_unit_type}"? This action cannot be undone.`
              : ""
          }
          confirmText="Delete"
          destructive
          submitting={deleteBom.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (deleteTarget) deleteBom.mutate(deleteTarget.id);
          }}
        />
      </div>
    </PageLayout>
  );
}
