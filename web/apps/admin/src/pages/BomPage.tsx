import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { BomRow, RevisionStatus } from "@traceability/sdk";
import { sdk } from "../context/AuthContext";
import { ApiErrorBanner } from "../components/ui/ApiErrorBanner";
import { formatApiError } from "../lib/errors";
import { BomRowDialog, BomRowForm } from "../components/shared/BomRowDialog";
import { PageLayout } from "@traceability/ui";
import { useToast } from "../hooks/useToast";
import { DataTable } from "../components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, ExternalLink } from "lucide-react";
import { StatusBadge } from "../components/shared/StatusBadge";
import { ModelsBreadcrumb } from "../components/models/ModelsBreadcrumb";

const Q_MODEL = "model";
const Q_REVISION = "revision";

export default function BomPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const modelId = searchParams.get(Q_MODEL) ?? "";
  const revisionId = searchParams.get(Q_REVISION) ?? "";

  const setModelId = useCallback(
    (id: string) => {
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          if (id) {
            n.set(Q_MODEL, id);
          } else {
            n.delete(Q_MODEL);
          }
          n.delete(Q_REVISION);
          return n;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setRevisionId = useCallback(
    (id: string) => {
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          if (id) n.set(Q_REVISION, id);
          else n.delete(Q_REVISION);
          return n;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

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

  /** Drop invalid IDs from URL (no silent “pick first row” behaviour). */
  useEffect(() => {
    if (!modelsLoading && modelId && !models.some((m) => m.id === modelId)) {
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.delete(Q_MODEL);
          n.delete(Q_REVISION);
          return n;
        },
        { replace: true }
      );
    }
  }, [models, modelId, modelsLoading, setSearchParams]);

  useEffect(() => {
    if (!revisionsLoading && revisionId && modelId && !revisions.some((r) => r.id === revisionId)) {
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.delete(Q_REVISION);
          return n;
        },
        { replace: true }
      );
    }
  }, [revisions, revisionId, modelId, revisionsLoading, setSearchParams]);

  const selectedRevision = useMemo(() => revisions.find((r) => r.id === revisionId), [revisions, revisionId]);
  const selectedModel = useMemo(() => models.find((m) => m.id === modelId), [models, modelId]);
  const isReadOnly = selectedRevision ? selectedRevision.status !== RevisionStatus.DRAFT : false;
  const scopeReady = !!modelId && !!revisionId;

  const usedPartNumbers = useMemo(() => new Set(bom.map((row) => row.component_part_number).filter(Boolean)), [bom]);
  const filteredPartNumbers = useMemo(() => {
    return partNumbers.filter((pn) => {
      if (!editingRow) return !usedPartNumbers.has(pn.part_number);
      return !usedPartNumbers.has(pn.part_number) || pn.part_number === editingRow.component_part_number;
    });
  }, [partNumbers, usedPartNumbers, editingRow]);

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
      showToast("BOM row added");
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
      showToast("BOM row updated");
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
        id: "component",
        header: "Component",
        minSize: 120,
        maxSize: 280,
        meta: { flex: 1.25 },
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium truncate">
              {row.original.component_name || row.original.component_unit_type}
            </div>
            <div className="text-xs text-muted-foreground truncate">{row.original.component_unit_type}</div>
          </div>
        ),
      },
      {
        id: "component_part_number",
        header: "RM PN",
        accessorKey: "component_part_number",
        size: 100,
        minSize: 88,
        maxSize: 120,
        meta: { flex: 0.9 },
        cell: ({ getValue }) => <span className="text-muted-foreground tabular-nums">{getValue<string>() || "—"}</span>,
      },
      {
        id: "rm_location",
        header: "Loc",
        accessorKey: "rm_location",
        size: 72,
        minSize: 64,
        maxSize: 96,
        meta: { fixed: true },
        cell: ({ getValue }) => getValue<string>() || "—",
      },
      {
        id: "qty_per_assy",
        header: "Qty",
        accessorKey: "qty_per_assy",
        size: 52,
        minSize: 48,
        maxSize: 56,
        meta: { fixed: true },
        cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>()}</span>,
      },
      {
        id: "required",
        header: "Req",
        accessorKey: "required",
        size: 52,
        minSize: 48,
        maxSize: 56,
        meta: { fixed: true },
        cell: ({ row }) =>
          row.original.required ? (
            <span className="text-emerald-600 text-xs font-medium">Yes</span>
          ) : (
            <span className="text-muted-foreground text-xs">No</span>
          ),
      },
      {
        id: "actions",
        header: "Edit",
        size: 76,
        minSize: 72,
        meta: { fixed: true },
        cell: ({ row }) =>
          !isReadOnly ? (
            <div className="flex gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setEditingRow(row.original);
                  setDialogOpen(true);
                }}
                title="Edit row"
                aria-label="Edit BOM row"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <DeleteIconButton
                className="h-8 w-8"
                onClick={() => setDeleteTarget(row.original)}
                title="Delete row"
                aria-label="Delete BOM row"
              />
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
      },
    ],
    [isReadOnly]
  );

  const revisionEditorUrl =
    scopeReady && modelId && revisionId ? `/admin/models/${modelId}/revisions/${revisionId}?tab=bom` : null;

  return (
    <PageLayout
      title="BOM configuration"
      subtitle={
        <div className="flex flex-col gap-2">
          <ModelsBreadcrumb items={[{ label: "Models", to: "/admin/models" }, { label: "BOM" }]} />
          <span className="text-muted-foreground">
            Choose model and revision in the card below. URL reflects your selection (bookmarkable). Only{" "}
            <strong>draft</strong> revisions are editable here.
          </span>
        </div>
      }
      icon="list"
      iconColor="indigo"
    >
      <div className="page-container flex flex-col gap-4">
        <ApiErrorBanner message={error ? formatApiError(error) : undefined} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Scope</CardTitle>
            <CardDescription>
              Select model, then revision. Changing model clears the revision — pick again explicitly.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex flex-col gap-2 min-w-[min(100%,220px)] sm:max-w-xs flex-1">
              <Label htmlFor="bom-model">Model</Label>
              <Select
                value={modelId || undefined}
                onValueChange={(v) => setModelId(v)}
                disabled={modelsLoading || !models.length}
              >
                <SelectTrigger id="bom-model" className="w-full">
                  <SelectValue placeholder={models.length ? "Select model…" : "No models"} />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                        <span className="shrink-0 font-mono tabular-nums">{m.code}</span>
                        <span className="text-muted-foreground" aria-hidden>
                          ·
                        </span>
                        <span className="truncate">{m.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 min-w-[min(100%,220px)] sm:max-w-xs flex-1">
              <Label htmlFor="bom-revision">Revision</Label>
              <Select
                value={revisionId || undefined}
                onValueChange={(v) => setRevisionId(v)}
                disabled={!modelId || revisionsLoading || !revisions.length}
              >
                <SelectTrigger id="bom-revision" className="w-full">
                  <SelectValue
                    placeholder={!modelId ? "Select model first" : revisionsLoading ? "Loading…" : "Select revision…"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {revisions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                        <span className="shrink-0 tabular-nums">{r.revision_code}</span>
                        <span className="text-muted-foreground" aria-hidden>
                          ·
                        </span>
                        <span className="text-muted-foreground">
                          {r.status === RevisionStatus.DRAFT ? "Draft" : "Active"}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRevision && (
              <div className="flex flex-col gap-2">
                <span className="text-sm text-muted-foreground">Revision status</span>
                <StatusBadge status={selectedRevision.status === RevisionStatus.ACTIVE ? "ACTIVE" : "DRAFT"} />
              </div>
            )}

            {revisionEditorUrl && (
              <Button variant="outline" size="sm" className="sm:ml-auto" asChild>
                <Link to={revisionEditorUrl}>
                  <ExternalLink className="h-4 w-4 mr-1.5" aria-hidden />
                  Open in revision editor
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {!modelId && !modelsLoading && (
          <Alert>
            <AlertDescription>
              Start by selecting a <strong>model</strong>. BOM rows load after you also choose a{" "}
              <strong>revision</strong>.
            </AlertDescription>
          </Alert>
        )}

        {modelId && !revisionId && !revisionsLoading && revisions.length > 0 && (
          <Alert>
            <AlertDescription>
              Select a <strong>revision</strong> to view or edit its BOM.
            </AlertDescription>
          </Alert>
        )}

        {modelId && !revisionsLoading && revisions.length === 0 && (
          <Alert>
            <AlertDescription>
              No revisions for this model.{" "}
              <Link
                to={`/admin/models/${modelId}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Create a draft revision
              </Link>{" "}
              first.
            </AlertDescription>
          </Alert>
        )}

        {isReadOnly && scopeReady && (
          <Alert>
            <AlertDescription>
              This revision is <strong>active</strong> (production). BOM is read-only. Clone a new draft from{" "}
              <Link
                to={`/admin/models/${modelId}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                model revisions
              </Link>{" "}
              to edit.
            </AlertDescription>
          </Alert>
        )}

        {scopeReady && selectedModel && (
          <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
            <span className="font-medium">{selectedModel.code}</span>
            <span className="text-muted-foreground mx-2">·</span>
            <span>{selectedModel.name}</span>
            {selectedModel.part_number && (
              <>
                <span className="text-muted-foreground mx-2">·</span>
                <span className="text-muted-foreground">FG PN</span>{" "}
                <span className="font-mono tabular-nums">{selectedModel.part_number}</span>
              </>
            )}
            {selectedRevision && (
              <>
                <span className="text-muted-foreground mx-2">·</span>
                <span className="text-muted-foreground">Rev</span>{" "}
                <span className="font-semibold">{selectedRevision.revision_code}</span>
              </>
            )}
          </div>
        )}

        {scopeReady ? (
          <DataTable
            data={bom}
            columns={columns}
            loading={bomLoading || modelsLoading || revisionsLoading || typesLoading || partNumbersLoading}
            filterPlaceholder="Search components…"
            emptyStateTitle="No BOM lines"
            emptyStateDescription={
              isReadOnly
                ? "This active revision has no rows, or list is empty."
                : "Add components with “Add row”. Each line is one RM per assembly."
            }
            emptyStateActionText={!isReadOnly ? "Add row" : undefined}
            emptyStateOnAction={
              !isReadOnly
                ? () => {
                    setEditingRow(null);
                    setDialogOpen(true);
                  }
                : undefined
            }
            actions={
              !isReadOnly ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setEditingRow(null);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1.5" aria-hidden />
                  Add row
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="rounded-xl border border-dashed bg-muted/20 py-16 text-center text-sm text-muted-foreground">
            BOM table appears after you select both model and revision.
          </div>
        )}

        <BomRowDialog
          open={dialogOpen}
          row={editingRow}
          submitting={createBom.isPending || editBom.isPending}
          modelCode={selectedModel?.code}
          componentTypeOptions={componentTypes.map((ct) => ({ code: ct.code, name: ct.name }))}
          partNumberOptions={filteredPartNumbers.map((pn) => ({
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
              ? `Remove “${deleteTarget.component_name || deleteTarget.component_unit_type}” from this BOM?`
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
