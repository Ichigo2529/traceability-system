import { useMemo, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, Play, ChevronRight } from "lucide-react";
import { StatusBadge } from "../components/shared/StatusBadge";
import { ModelsBreadcrumb } from "../components/models/ModelsBreadcrumb";
import { useToast } from "../hooks/useToast";

export default function ModelDetailsPage() {
  const { id: modelId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isDraftDialogOpen, setIsDraftDialogOpen] = useState(false);
  const [newRevisionCode, setNewRevisionCode] = useState("");
  const [cloneFromRevisionId, setCloneFromRevisionId] = useState("");
  const [activateTarget, setActivateTarget] = useState<ModelRevision | null>(null);

  const { data: model } = useQuery({
    queryKey: ["model", modelId],
    queryFn: () => sdk.admin.getModels().then((models) => models.find((m) => m.id === modelId)),
    enabled: !!modelId,
  });

  const { data: revisions = [], isLoading } = useQuery({
    queryKey: ["models", modelId, "revisions"],
    queryFn: () => sdk.admin.getRevisions(modelId!),
    enabled: !!modelId,
  });

  const createRevision = useMutation({
    mutationFn: async () =>
      sdk.admin.createRevision(modelId!, {
        revision_code: newRevisionCode.trim(),
        clone_from_revision_id: cloneFromRevisionId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models", modelId, "revisions"] });
      queryClient.invalidateQueries({ queryKey: ["models"] });
      setIsDraftDialogOpen(false);
      setNewRevisionCode("");
      setCloneFromRevisionId("");
      showToast("Draft revision created");
    },
  });

  const activateRevision = useMutation({
    mutationFn: async (revisionId: string) => sdk.admin.activateRevision(modelId!, revisionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models", modelId, "revisions"] });
      queryClient.invalidateQueries({ queryKey: ["models"] });
      setActivateTarget(null);
      showToast("Revision activated for production");
    },
  });

  const columns = useMemo(
    () => [
      {
        id: "revision_code",
        header: "Revision",
        accessorKey: "revision_code" as const,
        size: 140,
        cell: ({ row }: { row: { original: ModelRevision } }) => {
          const rev = row.original;
          const isActive = rev.status === RevisionStatus.ACTIVE;
          return (
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${isActive ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
                aria-hidden
              />
              <span className="font-semibold truncate">{rev.revision_code}</span>
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status" as const,
        size: 120,
        cell: ({ row }: { row: { original: ModelRevision } }) => {
          const rev = row.original;
          if (rev.status === RevisionStatus.ACTIVE) return <StatusBadge status="active" />;
          if (rev.status === RevisionStatus.DRAFT) return <StatusBadge status="disabled" />;
          return <span className="text-muted-foreground text-xs">{rev.status}</span>;
        },
      },
      {
        id: "updated_at",
        header: "Updated",
        accessorKey: "updated_at" as const,
        size: 160,
        cell: ({ row }: { row: { original: ModelRevision } }) => (
          <span className="text-muted-foreground text-sm">{formatDateTime(row.original.updated_at)}</span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        size: 220,
        meta: { fixed: true },
        cell: ({ row }: { row: { original: ModelRevision } }) => {
          const rev = row.original;
          const canActivate = rev.status !== RevisionStatus.ACTIVE;
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/models/${modelId}/revisions/${rev.id}`);
                }}
              >
                Configure
                <ChevronRight className="h-3.5 w-3.5 ml-0.5" aria-hidden />
              </Button>
              {canActivate ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivateTarget(rev);
                  }}
                  disabled={activateRevision.isPending}
                >
                  <Play className="h-3.5 w-3.5 mr-1" aria-hidden />
                  Activate
                </Button>
              ) : (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500 px-1">Live</span>
              )}
            </div>
          );
        },
      },
    ],
    [modelId, navigate, activateRevision.isPending]
  );

  if (!modelId) {
    return (
      <PageLayout title="Error" subtitle="Invalid URL" icon="warning" iconColor="red">
        <Alert variant="destructive">
          <AlertDescription>Invalid model ID in the URL. Please go back and select a model.</AlertDescription>
        </Alert>
      </PageLayout>
    );
  }

  const modelLabel = model?.code ?? "…";

  return (
    <PageLayout
      title={`Revisions · ${modelLabel}`}
      subtitle={
        <div className="flex flex-col gap-2">
          <ModelsBreadcrumb
            items={[
              { label: "Models", to: "/admin/models" },
              { label: model ? `${model.code} — ${model.name}` : modelLabel },
            ]}
          />
          <span className="text-muted-foreground">Create drafts, configure BOM and routing, then activate.</span>
        </div>
      }
      icon="chain-link"
      iconColor="blue"
      showBackButton
      onBackClick={() => navigate("/admin/models")}
    >
      <div className="page-container flex flex-col gap-4">
        <Alert>
          <AlertDescription>
            Only the <strong>active</strong> revision runs in production. Active revisions are read-only; clone to a new
            draft to change BOM, routing, or variants.
          </AlertDescription>
        </Alert>

        <ApiErrorBanner
          message={
            activateRevision.isError
              ? formatApiError(activateRevision.error)
              : createRevision.isError
                ? formatApiError(createRevision.error)
                : undefined
          }
        />

        <DataTable
          data={revisions as ModelRevision[]}
          columns={columns}
          loading={isLoading}
          filterPlaceholder="Filter by revision code..."
          emptyStateTitle="No revisions yet"
          emptyStateDescription="Create a first draft to configure this model."
          emptyStateActionText="New draft"
          emptyStateOnAction={() => setIsDraftDialogOpen(true)}
          actions={
            <>
              <Button variant="outline" size="sm" type="button" onClick={() => navigate("/admin/models")}>
                <ArrowLeft className="h-4 w-4 mr-1" aria-hidden />
                All models
              </Button>
              <Button size="sm" type="button" onClick={() => setIsDraftDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" aria-hidden />
                New draft
              </Button>
            </>
          }
        />
      </div>

      <Dialog
        open={isDraftDialogOpen}
        onOpenChange={(open) => {
          setIsDraftDialogOpen(open);
          if (!open) {
            setNewRevisionCode("");
            setCloneFromRevisionId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newRevisionCode.trim() || createRevision.isPending) return;
              createRevision.mutate();
            }}
          >
            <DialogHeader>
              <DialogTitle>New revision draft</DialogTitle>
              <DialogDescription>
                Optional: clone from an existing revision to copy BOM, routing, and variants.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="revision-code-input">Revision code</Label>
                <Input
                  id="revision-code-input"
                  value={newRevisionCode}
                  onChange={(e) => setNewRevisionCode(e.target.value)}
                  placeholder="e.g. R02"
                  autoComplete="off"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Clone from</Label>
                <Select
                  value={cloneFromRevisionId || "__empty__"}
                  onValueChange={(v) => setCloneFromRevisionId(v === "__empty__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Empty draft" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">Empty draft</SelectItem>
                    {(revisions as ModelRevision[]).map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="tabular-nums">{r.revision_code}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">
                            {r.status === RevisionStatus.DRAFT
                              ? "Draft"
                              : r.status === RevisionStatus.ACTIVE
                                ? "Active"
                                : r.status}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDraftDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRevision.isPending || !newRevisionCode.trim()}>
                {createRevision.isPending ? "Creating…" : "Create draft"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(activateTarget)}
        title="Activate revision"
        description={
          activateTarget
            ? `Activate “${activateTarget.revision_code}”? This becomes the live production revision for model ${modelLabel}.`
            : ""
        }
        confirmText="Activate"
        submitting={activateRevision.isPending}
        onCancel={() => setActivateTarget(null)}
        onConfirm={() => {
          if (!activateTarget) return;
          activateRevision.mutate(activateTarget.id);
        }}
      />
    </PageLayout>
  );
}
