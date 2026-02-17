import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../context/AuthContext";
import { ModelRevision, RevisionStatus } from "@traceability/sdk";
import { DataTable } from "../components/shared/DataTable";
import { ApiErrorBanner } from "../components/ui/ApiErrorBanner";
import { formatApiError } from "../lib/errors";
import { formatDateTime } from "../lib/datetime";
import { 
    Page, 
    Bar, 
    Title, 
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
    Option
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

  const { data: revisions = [] } = useQuery({
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
      cell: ({ row }: { row: any }) => (
        <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
          <Icon name="chain-link" />
          <span style={{ fontWeight: "bold" }}>{row.original.revision_code}</span>
        </FlexBox>
      ),
    },
    {
      header: "Status",
      accessorKey: "status" as any,
      cell: ({ row }: { row: any }) => {
        const rev = row.original as ModelRevision;
        let state: any = "None";
        if (rev.status === RevisionStatus.ACTIVE) state = "Positive";
        else if (rev.status === RevisionStatus.DRAFT) state = "Critical";
        return (
          <ObjectStatus state={state}>
            {rev.status}
          </ObjectStatus>
        );
      },
    },
    {
      header: "Updated",
      accessorKey: "updated_at" as any,
      cell: ({ row }: { row: any }) => formatDateTime(row.original.updated_at),
    },
    {
      header: "Actions",
      cell: ({ row }: { row: any }) => {
        const rev = row.original as ModelRevision;
        return (
            <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
            {rev.status !== RevisionStatus.ACTIVE && (
                <Button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Activate revision ${rev.revision_code}?`)) activateRevision.mutate(rev.id);
                    }}
                    disabled={activateRevision.isPending}
                    design="Positive"
                    icon="activate"
                >
                    Activate
                </Button>
            )}
            {rev.status === RevisionStatus.ACTIVE && <ObjectStatus state="Positive">Live</ObjectStatus>}
            </FlexBox>
        );
      },
    },
  ];


  if (!modelId) return <div>Invalid Model ID</div>;

  return (
    <Page
      backgroundDesign="List"
      header={
        <Bar
          startContent={
            <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
              <Button icon="nav-back" design="Transparent" onClick={() => navigate("/admin/models")} />
              <FlexBox direction="Column">
                <Title level="H2">Model Revisions</Title>
                <span style={{ fontSize: "0.875rem", color: "var(--sapContent_LabelColor)" }}>
                  Create/clone revisions and activate when readiness is PASS.
                </span>
              </FlexBox>
            </FlexBox>
          }
          endContent={
            <Button icon="add" design="Emphasized" onClick={() => setIsModalOpen(true)}>
              New Draft
            </Button>
          }
        />
      }
      style={{ height: "100%" }}
    >
      <div style={{ padding: "1rem", width: "100%", boxSizing: "border-box" }}>
        <MessageStrip design="Information" icon={<Icon name="information" />}>
           Only ACTIVE revision is used in production. Active revisions are read-only.
        </MessageStrip>

        <ApiErrorBanner message={activateRevision.isError ? formatApiError(activateRevision.error) : undefined} />

        <div style={{ marginTop: "1rem" }}>
          <DataTable 
            data={revisions as any} 
            columns={columns} 
            onRowClick={(rev: any) => navigate(`/admin/models/${modelId}/revisions/${rev.id}`)} 
          />
        </div>
      </div>

      <Dialog 
        headerText="Create Revision"
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
                    {createRevision.isPending ? "Creating..." : "Create Draft"}
                </Button>
              </>
            }
          />
        }
      >
        <FlexBox direction={FlexBoxDirection.Column} style={{ padding: "1rem", gap: "1rem", width: "320px" }}>
          <ApiErrorBanner message={createRevision.isError ? formatApiError(createRevision.error) : undefined} />
          
          <FlexBox direction={FlexBoxDirection.Column}>
            <Label required>Revision Code</Label>
            <Input 
                value={newRevisionCode} 
                onInput={(e) => setNewRevisionCode(e.target.value)} 
                placeholder="R01" 
            />
          </FlexBox>

          <FlexBox direction={FlexBoxDirection.Column}>
            <Label>Clone From (Optional)</Label>
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
    </Page>
  );

}
