import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { sdk } from "../../context/AuthContext";
import { Model, ModelRevision, RevisionStatus } from "@traceability/sdk";
import { DataTable } from "./DataTable";
import { ConfirmDialog } from "./ConfirmDialog";
import { ApiErrorBanner } from "../ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import {
  Bar,
  Button,
  Page,
  Title,
  Form,
  FormItem,
  ObjectStatus,
  Icon,
  FlexBox,
  FlexBoxAlignItems,
  Label,
  Input,
  Select,
  Option,
  TabContainer,
  Tab,
  Dialog,
  FlexBoxDirection,
  CheckBox,
} from "@ui5/webcomponents-react";

import "@ui5/webcomponents-icons/dist/nav-back.js";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/chain-link.js";
import "@ui5/webcomponents-icons/dist/activate.js";
import "@ui5/webcomponents-icons/dist/information.js";

const schema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  part_number: z.string().optional(),
  pack_size: z.coerce.number().min(1).optional(),
  active: z.boolean().default(true),
  description: z.string().optional(),
});
type ModelForm = z.infer<typeof schema>;

interface ModelDetailPanelProps {
  model: Model | null; // null means 'Create New'
  onClose: () => void;
  onSaved: () => void; // refresh master list
}

export function ModelDetailPanel({ model, onClose, onSaved }: ModelDetailPanelProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("revisions");
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [newRevisionCode, setNewRevisionCode] = useState("");
  const [cloneFromRevisionId, setCloneFromRevisionId] = useState("");
  const [activateTarget, setActivateTarget] = useState<ModelRevision | null>(null);

  // General Info Form
  const form = useForm<ModelForm>({
    resolver: zodResolver(schema),
    defaultValues: { active: true, pack_size: 1, code: "", name: "", part_number: "", description: "" },
  });

  useEffect(() => {
    if (model) {
      form.reset({
        code: model.code,
        name: model.name,
        part_number: model.part_number || "",
        pack_size: model.pack_size || 1,
        active: model.active ?? true,
        description: model.description || "",
      });
      setActiveTab("revisions"); // default to revisions when viewing a model
    } else {
      form.reset({ code: "", name: "", part_number: "", active: true, pack_size: 1, description: "" });
      setActiveTab("general");
    }
  }, [model, form]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (v: ModelForm) => sdk.admin.createModel(v),
    onSuccess: () => {
      onSaved();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (v: ModelForm) => sdk.admin.updateModel(model!.id, v),
    onSuccess: () => {
      onSaved();
    },
  });

  // Revisions Query
  const { data: revisions = [], isLoading: revisionsLoading } = useQuery({
    queryKey: ["models", model?.id, "revisions"],
    queryFn: () => sdk.admin.getRevisions(model!.id),
    enabled: !!model?.id,
  });

  const createRevision = useMutation({
    mutationFn: async () =>
      sdk.admin.createRevision(model!.id, {
        revision_code: newRevisionCode,
        clone_from_revision_id: cloneFromRevisionId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models", model!.id, "revisions"] });
      setIsDraftModalOpen(false);
      setNewRevisionCode("");
      setCloneFromRevisionId("");
    },
  });

  const activateRevision = useMutation({
    mutationFn: async (revisionId: string) => sdk.admin.activateRevision(model!.id, revisionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models", model!.id, "revisions"] });
      onSaved(); // refresh master list since active revision might have changed
      setActivateTarget(null);
    },
  });

  const revisionColumns = useMemo(() => [
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
      size: 120,
      cell: ({ row }: { row: any }) => {
        const rev = row.original as ModelRevision;
        let state: any = "None";
        if (rev.status === RevisionStatus.ACTIVE) state = "Positive";
        else if (rev.status === RevisionStatus.DRAFT) state = "Critical";
        return <ObjectStatus state={state}>{rev.status}</ObjectStatus>;
      },
    },
    {
      header: "Actions",
      size: 120,
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
                tooltip="Activate Revision"
              />
            )}
            {rev.status === RevisionStatus.ACTIVE && (
              <ObjectStatus state="Positive">Live</ObjectStatus>
            )}
          </FlexBox>
        );
      },
    },
  ], [activateRevision.isPending]);

  return (
    <Page
      slot="midColumn"
      header={<Bar startContent={<Title>{model ? `Overview: ${model.code}` : "Create Model"}</Title>} />}
      footer={
        <Bar
          design="Footer"
          endContent={
            <FlexBox style={{ gap: "0.5rem" }}>
              {activeTab === "general" && (
                <Button 
                  design="Emphasized" 
                  onClick={() => form.handleSubmit((v) => (model ? updateMutation.mutate(v) : createMutation.mutate(v)))()}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Config"}
                </Button>
              )}
              <Button design="Transparent" onClick={onClose}>Close</Button>
            </FlexBox>
          }
        />
      }
      style={{ height: "100%", borderRadius: "0 16px 16px 0", borderLeft: "1px solid var(--sapList_BorderColor)", overflow: "hidden" }}
    >
      {model ? (
        <TabContainer
          onTabSelect={(e) => setActiveTab(e.detail.tab.dataset.id!)}
        >
          <Tab text="Revisions" data-id="revisions" selected={activeTab === "revisions"}>
             <div style={{ padding: "1rem", overflowY: "auto", height: "100%" }}>
              <ApiErrorBanner message={activateRevision.isError ? formatApiError(activateRevision.error) : undefined} />
              <DataTable
                data={revisions as any}
                columns={revisionColumns}
                loading={revisionsLoading}
                hideEmptyState={false}
                onRowClick={(rev: any) => navigate(`/admin/models/${model.id}/revisions/${rev.id}`)}
                actions={
                  <Button icon="add" design="Emphasized" onClick={() => setIsDraftModalOpen(true)}>
                    New Draft
                  </Button>
                }
              />
            </div>
          </Tab>
          <Tab text="General Info" data-id="general" selected={activeTab === "general"}>
             <div style={{ padding: "1.5rem", overflowY: "auto", height: "100%" }}>
               <ApiErrorBanner message={updateMutation.isError ? formatApiError(updateMutation.error) : undefined} />
               <Form layout="S1 M1 L1 XL1" labelSpan="S12 M12 L12 XL12">
                <FormItem labelContent={<Label required>Model Code</Label>}>
                  <Input {...form.register("code")} style={{ width: "100%" }} />
                </FormItem>
                <FormItem labelContent={<Label required>Model Name</Label>}>
                  <Input {...form.register("name")} style={{ width: "100%" }} />
                </FormItem>
                <FormItem labelContent={<Label>Part Number</Label>}>
                  <Input {...form.register("part_number")} style={{ width: "100%" }} />
                </FormItem>
                <FormItem labelContent={<Label>Pack Size</Label>}>
                  <Input type="Number" {...form.register("pack_size")} style={{ width: "100%" }} />
                </FormItem>
                <FormItem labelContent={<Label>Description</Label>}>
                  <Input {...form.register("description")} style={{ width: "100%" }} />
                </FormItem>
                <FormItem labelContent={<Label>Status</Label>}>
                  <CheckBox text="Active" checked={form.watch("active")} onChange={(e) => form.setValue("active", e.target.checked)} />
                </FormItem>
              </Form>
             </div>
          </Tab>
        </TabContainer>
      ) : (
        <div style={{ padding: "1.5rem" }}>
           <ApiErrorBanner message={createMutation.isError ? formatApiError(createMutation.error) : undefined} />
           <Form layout="S1 M1 L1 XL1" labelSpan="S12 M12 L12 XL12">
            <FormItem labelContent={<Label required>Model Code</Label>}>
              <Input {...form.register("code")} style={{ width: "100%" }} />
            </FormItem>
            <FormItem labelContent={<Label required>Model Name</Label>}>
              <Input {...form.register("name")} style={{ width: "100%" }} />
            </FormItem>
            <FormItem labelContent={<Label>Part Number</Label>}>
              <Input {...form.register("part_number")} style={{ width: "100%" }} />
            </FormItem>
            <FormItem labelContent={<Label>Pack Size</Label>}>
              <Input type="Number" {...form.register("pack_size")} style={{ width: "100%" }} />
            </FormItem>
            <FormItem labelContent={<Label>Description</Label>}>
              <Input {...form.register("description")} style={{ width: "100%" }} />
            </FormItem>
            <FormItem labelContent={<Label>Status</Label>}>
              <CheckBox text="Active" checked={form.watch("active")} onChange={(e) => form.setValue("active", e.target.checked)} />
            </FormItem>
          </Form>
        </div>
      )}

      {/* Draft Modal */}
      <Dialog
        headerText="Create Revision Draft"
        open={isDraftModalOpen}
        onClose={() => setIsDraftModalOpen(false)}
        footer={
          <Bar
            endContent={
              <>
                <Button onClick={() => setIsDraftModalOpen(false)}>Cancel</Button>
                <Button design="Emphasized" onClick={() => createRevision.mutate()} disabled={createRevision.isPending || !newRevisionCode}>
                  {createRevision.isPending ? "Creating..." : "Create"}
                </Button>
              </>
            }
          />
        }
      >
        <FlexBox direction={FlexBoxDirection.Column} style={{ padding: "1.25rem", gap: "1rem", width: "340px" }}>
          <ApiErrorBanner message={createRevision.isError ? formatApiError(createRevision.error) : undefined} />
          <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.375rem" }}>
            <Label required style={{ fontWeight: 600 }}>Revision Code</Label>
            <Input value={newRevisionCode} onInput={(e) => setNewRevisionCode(e.target.value)} placeholder="e.g. R01" />
          </FlexBox>
          <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.375rem" }}>
            <Label style={{ fontWeight: 600 }}>Clone From (Optional)</Label>
            <Select value={cloneFromRevisionId} onChange={(e) => setCloneFromRevisionId(e.target.value)}>
              <Option value="">-- Empty Draft --</Option>
              {(revisions as ModelRevision[]).map((r) => (
                <Option key={r.id} value={r.id}>{r.revision_code} ({r.status})</Option>
              ))}
            </Select>
          </FlexBox>
        </FlexBox>
      </Dialog>

      <ConfirmDialog
        open={Boolean(activateTarget)}
        title="Activate Revision"
        description={activateTarget ? `Activate revision "${activateTarget.revision_code}"? This will replace the current active revision in production.` : ""}
        confirmText="Activate"
        onCancel={() => setActivateTarget(null)}
        onConfirm={() => { if (activateTarget) activateRevision.mutate(activateTarget.id); }}
      />
    </Page>
  );
}
