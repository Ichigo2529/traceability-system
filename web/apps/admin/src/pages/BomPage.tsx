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
import { 
    Button, 
    Label, 
    Select, 
    Option, 
    FlexBox, 
    FlexBoxAlignItems, 
    FlexBoxDirection,
    FlexBoxJustifyContent,
    ObjectStatus
} from "@ui5/webcomponents-react";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { ColumnDef } from "@tanstack/react-table";
import "@ui5/webcomponents-icons/dist/list.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/add.js";

export default function BomPage() {
  const queryClient = useQueryClient();
  const [modelId, setModelId] = useState<string>("");
  const [revisionId, setRevisionId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<BomRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BomRow | null>(null);
  const { showToast, ToastComponent } = useToast();

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
        header: "Model",
        cell: () => <Label>{selectedModel?.name || "-"}</Label>,
      },
      {
        header: "Part Number FG",
        cell: () => <Label>{selectedModel?.part_number || "-"}</Label>,
      },
      {
        header: "Component",
        cell: ({ row }) => (
            <FlexBox direction={FlexBoxDirection.Column}>
                <Label style={{ fontWeight: "bold" }}>{row.original.component_name || row.original.component_unit_type}</Label>
                <Label style={{ fontSize: "0.75rem" }}>{row.original.component_unit_type}</Label>
            </FlexBox>
        ),
      },
      {
          header: "Part Number RM",
          accessorKey: "component_part_number",
          cell: ({ getValue }) => getValue() || "-"
      },
      {
          header: "Location",
          accessorKey: "rm_location",
           cell: ({ getValue }) => getValue() || "-"
      },
      {
          header: "Use pcs / 1 VCM",
          accessorKey: "qty_per_assy",
      },
      {
        header: "Actions",
        cell: ({ row }) => (
           !isReadOnly ? (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              icon="edit"
              design="Transparent"
              className="button-hover-scale"
              onClick={() => {
                setEditingRow(row.original);
                setDialogOpen(true);
              }}
              tooltip="Edit BOM Row"
              aria-label="Edit BOM Row"
            />
            <Button
              icon="delete"
              design="Transparent"
              className="button-hover-scale"
              onClick={() => setDeleteTarget(row.original)}
              tooltip="Delete BOM Row"
              aria-label="Delete BOM Row"
            />
          </div>
           ) : null
        ),
      },
    ],
    [deleteBom, isReadOnly, selectedModel]
  );

  return (
    <PageLayout
      title="BOM Configuration"
      subtitle={
        <FlexBox alignItems={FlexBoxAlignItems.Center}>
          <span className="indicator-live" />
          <span>Maintain Bill of Materials for specific model revisions</span>
        </FlexBox>
      }
      icon="list"
      iconColor="indigo"
    >
      <div className="page-container">
       <ApiErrorBanner message={error ? formatApiError(error) : undefined} />
      
      <FlexBox 
          alignItems={FlexBoxAlignItems.End} 
          justifyContent={FlexBoxJustifyContent.Start}
          wrap="Wrap"
          style={{ gap: "1rem", marginBottom: "1rem", padding: "1rem", backgroundColor: "var(--sapObjectHeader_Background)", borderRadius: "var(--sapElement_BorderCornerRadius)" }}
      >
           <FlexBox direction={FlexBoxDirection.Column} style={{ minWidth: "200px" }}>
              <Label>Model</Label>
              <Select
                  onChange={(e) => setModelId(e.target.value)}
                  value={modelId}
                  style={{ width: "100%" }}
              >
                  {models.map((m) => (
                  <Option key={m.id} value={m.id}>
                      {m.code} - {m.name}
                  </Option>
                  ))}
              </Select>
           </FlexBox>
           
           <FlexBox direction={FlexBoxDirection.Column} style={{ minWidth: "200px" }}>
              <Label>Revision</Label>
              <Select
                  onChange={(e) => setRevisionId(e.target.value)}
                  value={revisionId}
                  disabled={!revisions.length}
                  style={{ width: "100%" }}
              >
                  {revisions.map((r) => (
                  <Option key={r.id} value={r.id}>
                      {r.revision_code} ({r.status})
                  </Option>
                  ))}
              </Select>
           </FlexBox>

           {selectedRevision && (
               <FlexBox direction={FlexBoxDirection.Column}>
                   <Label>Status</Label>
                   <ObjectStatus state={selectedRevision.status === RevisionStatus.ACTIVE ? "Positive" : "Information"}>{selectedRevision.status}</ObjectStatus>
               </FlexBox>
           )}
      </FlexBox>

      <DataTable 
          data={bom} 
          columns={columns} 
          loading={bomLoading || modelsLoading || revisionsLoading || typesLoading || partNumbersLoading}
          filterPlaceholder="Search BOM..." 
          actions={
               !isReadOnly && modelId && revisionId ? (
                  <Button
                      icon="add"
                      design="Emphasized"
                      onClick={() => {
                      setEditingRow(null);
                      setDialogOpen(true);
                      }}
                  >
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
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete BOM row"
        description={deleteTarget ? `Are you sure you want to delete BOM row "${deleteTarget.component_name || deleteTarget.component_unit_type}"? This action cannot be undone.` : ""}
        confirmText="Delete"
        destructive
        submitting={deleteBom.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteBom.mutate(deleteTarget.id);
          }
        }}
      />
      </div>
      <ToastComponent />
    </PageLayout>
  );
}
