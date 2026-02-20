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
import {
  Bar,
  Button,
  Dialog,
  MessageStrip,
  ObjectStatus,
  Icon,
  FlexBox,
  FlexBoxAlignItems,
  FlexBoxDirection,
  Label,
  Input,
  Select,
  Option,
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/nav-back.js";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/chain-link.js";
import "@ui5/webcomponents-icons/dist/activate.js";
import "@ui5/webcomponents-icons/dist/information.js";

export default function ModelDetailsPage() {
  const { id: modelId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      setIsModalOpen(false);
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
      accessorKey: "revision_code" as any,
      size: 160,
      cell: ({ row }: { row: any }) => {
        const rev = row.original as ModelRevision;
        const isActive = rev.status === RevisionStatus.ACTIVE;
        return (
          <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.625rem" }}>
            <div style={{
              width: "1.75rem", height: "1.75rem", borderRadius: "6px",
              background: isActive
                ? "linear-gradient(135deg,#2af598,#009efd)"
                : "linear-gradient(135deg,#667eea,#764ba2)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Icon name="chain-link" style={{ color: "white", width: "0.875rem", height: "0.875rem" }} />
            </div>
            <span style={{ fontWeight: 700 }}>{rev.revision_code}</span>
          </FlexBox>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "status" as any,
      size: 140,
      cell: ({ row }: { row: any }) => {
        const rev = row.original as ModelRevision;
        let state: any = "None";
        if (rev.status === RevisionStatus.ACTIVE) state = "Positive";
        else if (rev.status === RevisionStatus.DRAFT) state = "Critical";
        return <ObjectStatus state={state}>{rev.status}</ObjectStatus>;
      },
    },
    {
      header: "Updated",
      accessorKey: "updated_at" as any,
      cell: ({ row }: { row: any }) => formatDateTime(row.original.updated_at),
    },
    {
      header: "Actions",
      size: 160,
      cell: ({ row }: { row: any }) => {
        const rev = row.original as ModelRevision;
        return (
          <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
            {rev.status !== RevisionStatus.ACTIVE && (
              <Button
                onClick={(e) => { e.stopPropagation(); setActivateTarget(rev); }}
                disabled={activateRevision.isPending}
                design="Positive"
                icon="activate"
              >
                Activate
              </Button>
            )}
            {rev.status === RevisionStatus.ACTIVE && (
              <ObjectStatus state="Positive">Live</ObjectStatus>
            )}
          </FlexBox>
        );
      },
    },
  ];

  if (!modelId) {
    return (
      <PageLayout title="Error" subtitle="Invalid URL" icon="warning" iconColor="red">
        <MessageStrip design="Negative" hideCloseButton>
          Invalid model ID in the URL. Please go back and select a model.
        </MessageStrip>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Model Revisions"
      subtitle={
        <FlexBox alignItems={FlexBoxAlignItems.Center}>
          <span className="indicator-live" />
          <span>Create drafts, configure BOM & routing, then activate when ready for production</span>
        </FlexBox>
      }
      icon="chain-link"
      iconColor="blue"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", paddingRight: "2rem", paddingBottom: "2rem" }}>
        {/* Toolbar row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Button icon="nav-back" design="Default" onClick={() => navigate("/admin/models")}>
            Back to Models
          </Button>
          <Button icon="add" design="Emphasized" onClick={() => setIsModalOpen(true)}>
            New Draft
          </Button>
        </div>
        <MessageStrip design="Information" hideCloseButton style={{ borderRadius: "8px" }}>
          Only the <strong>ACTIVE</strong> revision is used in production. Active revisions are read-only — clone to a new draft to make changes.
        </MessageStrip>

        <ApiErrorBanner
          message={activateRevision.isError ? formatApiError(activateRevision.error) : undefined}
        />

        <DataTable
          data={revisions as any}
          columns={columns}
          loading={isLoading}
          filterPlaceholder="Search revisions…"
          onRowClick={(rev: any) => navigate(`/admin/models/${modelId}/revisions/${rev.id}`)}
        />
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

      {/* Create draft dialog */}
      <Dialog
        headerText="Create Revision Draft"
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        footer={
          <Bar
            endContent={
              <>
                <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button
                  design="Emphasized"
                  onClick={() => createRevision.mutate()}
                  disabled={createRevision.isPending || !newRevisionCode}
                >
                  {createRevision.isPending ? "Creating…" : "Create Draft"}
                </Button>
              </>
            }
          />
        }
      >
        <FlexBox direction={FlexBoxDirection.Column} style={{ padding: "1.25rem", gap: "1rem", width: "340px" }}>
          <ApiErrorBanner
            message={createRevision.isError ? formatApiError(createRevision.error) : undefined}
          />
          <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.375rem" }}>
            <Label required style={{ fontWeight: 600 }}>Revision Code</Label>
            <Input
              value={newRevisionCode}
              onInput={(e) => setNewRevisionCode(e.target.value)}
              placeholder="e.g. R01"
            />
          </FlexBox>
          <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.375rem" }}>
            <Label style={{ fontWeight: 600 }}>Clone From (Optional)</Label>
            <Select
              value={cloneFromRevisionId}
              onChange={(e) => setCloneFromRevisionId(e.target.value)}
            >
              <Option value="">-- Empty Draft --</Option>
              {(revisions as ModelRevision[]).map((r) => (
                <Option key={r.id} value={r.id}>
                  {r.revision_code} ({r.status})
                </Option>
              ))}
            </Select>
          </FlexBox>
        </FlexBox>
      </Dialog>
    </PageLayout>
  );
}
