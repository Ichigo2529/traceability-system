import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../context/AuthContext";
import { ModelRevision, RevisionStatus } from "@traceability/sdk";
import { DataTable } from "../components/shared/DataTable";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { ApiErrorBanner } from "../components/ui/ApiErrorBanner";
import { formatApiError } from "../lib/errors";
import { formatDateTime } from "../lib/datetime";
import { PageLayout } from "@traceability/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Plus, Link2, Play } from "lucide-react";

export default function ModelDetailsPage() {
  const { id: modelId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [layout, setLayout] = useState<"OneColumn" | "TwoColumnsStartExpanded">("OneColumn");
  const [newRevisionCode, setNewRevisionCode] = useState("");
  const [cloneFromRevisionId, setCloneFromRevisionId] = useState("");
  const [activateTarget, setActivateTarget] = useState<ModelRevision | null>(null);

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
      setLayout("OneColumn");
      setNewRevisionCode("");
      setCloneFromRevisionId("");
    },
  });

  const activateRevision = useMutation({
    mutationFn: async (revisionId: string) => sdk.admin.activateRevision(modelId!, revisionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models", modelId, "revisions"] });
      setActivateTarget(null);
    },
  });

  const columns = [
    {
      header: "Revision",
      accessorKey: "revision_code" as const,
      size: 160,
      cell: ({ row }: { row: { original: ModelRevision } }) => {
        const rev = row.original;
        const isActive = rev.status === RevisionStatus.ACTIVE;
        return (
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                isActive
                  ? "bg-gradient-to-br from-green-400 to-blue-500"
                  : "bg-gradient-to-br from-indigo-500 to-purple-600"
              }`}
            >
              <Link2 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold">{rev.revision_code}</span>
          </div>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "status" as const,
      size: 140,
      cell: ({ row }: { row: { original: ModelRevision } }) => {
        const rev = row.original;
        const cls =
          rev.status === RevisionStatus.ACTIVE
            ? "text-green-600"
            : rev.status === RevisionStatus.DRAFT
              ? "text-amber-600"
              : "text-muted-foreground";
        return <span className={cls}>{rev.status}</span>;
      },
    },
    {
      header: "Updated",
      accessorKey: "updated_at" as const,
      cell: ({ row }: { row: { original: ModelRevision } }) => formatDateTime(row.original.updated_at),
    },
    {
      header: "Actions",
      size: 160,
      cell: ({ row }: { row: { original: ModelRevision } }) => {
        const rev = row.original;
        return (
          <div className="flex items-center gap-2">
            {rev.status !== RevisionStatus.ACTIVE && (
              <Button
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivateTarget(rev);
                }}
                disabled={activateRevision.isPending}
              >
                <Play className="h-4 w-4 mr-1" />
                Activate
              </Button>
            )}
            {rev.status === RevisionStatus.ACTIVE && <span className="text-green-600 font-medium">Live</span>}
          </div>
        );
      },
    },
  ];

  if (!modelId) {
    return (
      <PageLayout title="Error" subtitle="Invalid URL" icon="warning" iconColor="red">
        <Alert variant="destructive">
          <AlertDescription>Invalid model ID in the URL. Please go back and select a model.</AlertDescription>
        </Alert>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Model Revisions"
      fullHeight={true}
      subtitle={
        <div className="flex items-center gap-2">
          <span>Create drafts, configure BOM & routing, then activate when ready for production</span>
        </div>
      }
      icon="chain-link"
      iconColor="blue"
    >
      <div className={`flex h-full ${layout === "TwoColumnsStartExpanded" ? "gap-0" : ""}`}>
        <div className="page-container flex flex-col h-full flex-1 min-w-0">
          <div className="pr-8 pb-4">
            <Alert className="rounded-lg">
              <AlertDescription>
                Only the <strong>ACTIVE</strong> revision is used in production. Active revisions are read-only — clone
                to a new draft to make changes.
              </AlertDescription>
            </Alert>
          </div>

          <ApiErrorBanner message={activateRevision.isError ? formatApiError(activateRevision.error) : undefined} />

          <DataTable
            data={revisions as ModelRevision[]}
            columns={columns}
            loading={isLoading}
            filterPlaceholder="Search revisions…"
            hideEmptyState={layout !== "OneColumn"}
            onRowClick={(rev: ModelRevision) => navigate(`/admin/models/${modelId}/revisions/${rev.id}`)}
            actions={
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/admin/models")}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Models
                </Button>
                <Button size="sm" onClick={() => setLayout("TwoColumnsStartExpanded")}>
                  <Plus className="h-4 w-4 mr-1" />
                  New Draft
                </Button>
              </>
            }
          />
        </div>

        {layout === "TwoColumnsStartExpanded" && (
          <div className="w-full max-w-md border-l bg-card flex flex-col rounded-r-xl overflow-hidden shrink-0">
            <div className="px-4 py-3 border-b">
              <h2 className="font-semibold text-lg">Create Revision Draft</h2>
            </div>
            <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
              <ApiErrorBanner message={createRevision.isError ? formatApiError(createRevision.error) : undefined} />
              <div className="space-y-2">
                <Label className="font-semibold">Revision Code *</Label>
                <Input
                  value={newRevisionCode}
                  onChange={(e) => setNewRevisionCode(e.target.value)}
                  placeholder="e.g. R01"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Clone From (Optional)</Label>
                <Select
                  value={cloneFromRevisionId || "__empty__"}
                  onValueChange={(v) => setCloneFromRevisionId(v === "__empty__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="-- Empty Draft --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">-- Empty Draft --</SelectItem>
                    {(revisions as ModelRevision[]).map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.revision_code} ({r.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <Button onClick={() => createRevision.mutate()} disabled={createRevision.isPending || !newRevisionCode}>
                {createRevision.isPending ? "Creating…" : "Create Draft"}
              </Button>
              <Button variant="outline" onClick={() => setLayout("OneColumn")}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Activate confirmation */}
      <ConfirmDialog
        open={Boolean(activateTarget)}
        title="Activate Revision"
        description={
          activateTarget
            ? `Activate revision "${activateTarget.revision_code}"? This will replace the current active revision and make it live in production.`
            : ""
        }
        confirmText="Activate"
        onCancel={() => setActivateTarget(null)}
        onConfirm={() => {
          if (!activateTarget) return;
          activateRevision.mutate(activateTarget.id);
        }}
      />
    </PageLayout>
  );
}
