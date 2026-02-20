import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { sdk } from "../context/AuthContext";
import { RevisionStatus, Variant, BomRow, RoutingStep, LabelBinding, LabelTemplate } from "@traceability/sdk";
import { ApiErrorBanner } from "../components/ui/ApiErrorBanner";
import { formatApiError } from "../lib/errors";
import { DataTable } from "../components/shared/DataTable";
import {
  Button,
  FlexBox,
  FlexBoxAlignItems,
  FlexBoxDirection,
  Label,
  TabContainer,
  Tab,
  ObjectStatus,
  BusyIndicator,
  MessageStrip,
} from "@ui5/webcomponents-react";
import { PageLayout } from "@traceability/ui";
import { BomRowDialog, BomRowForm } from "../components/shared/BomRowDialog";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { VariantDialog, VariantForm } from "../components/shared/VariantDialog";
import { RoutingDialog, RoutingForm } from "../components/shared/RoutingDialog";
import { BindingDialog, BindingForm } from "../components/shared/BindingDialog";
import "@ui5/webcomponents-icons/dist/nav-back.js";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/action.js";
import "@ui5/webcomponents-icons/dist/shipping-status.js";
import "@ui5/webcomponents-icons/dist/list.js";
import "@ui5/webcomponents-icons/dist/chain-link.js";

// Schemas and types moved to shared component files

export default function RevisionDetailsPage() {
  const { id: modelId, revisionId } = useParams<{ id: string; revisionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"variants" | "bom" | "routing" | "bindings">("variants");
  const [bomDialogOpen, setBomDialogOpen] = useState(false);
  const [editingBomRow, setEditingBomRow] = useState<BomRow | null>(null);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [routingDialogOpen, setRoutingDialogOpen] = useState(false);
  const [editingRouting, setEditingRouting] = useState<RoutingStep | null>(null);
  const [bindingDialogOpen, setBindingDialogOpen] = useState(false);
  const [editingBinding, setEditingBinding] = useState<LabelBinding | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: "variant" | "bom" | "routing" | "binding" } | null>(null);

  const { data: revision, isLoading } = useQuery({
    queryKey: ["revision", modelId, revisionId],
    queryFn: () => sdk.admin.getRevision(modelId!, revisionId!),
    enabled: !!modelId && !!revisionId,
  });

  const { data: model } = useQuery({
    queryKey: ["model", modelId],
    queryFn: () => sdk.admin.getModels().then((models) => models.find((m) => m.id === modelId)),
    enabled: !!modelId,
  });

  const { data: variants = [] } = useQuery({
    queryKey: ["variants", modelId, revisionId],
    queryFn: () => sdk.admin.getVariants(modelId!, revisionId!),
    enabled: !!modelId && !!revisionId,
  });

  const { data: bom = [] } = useQuery({
    queryKey: ["bom", modelId, revisionId],
    queryFn: () => sdk.admin.getBom(modelId!, revisionId!),
    enabled: !!modelId && !!revisionId,
  });

  const { data: routing = [] } = useQuery({
    queryKey: ["routing", modelId, revisionId],
    queryFn: () => sdk.admin.getRouting(modelId!, revisionId!),
    enabled: !!modelId && !!revisionId,
  });

  const { data: bindings = [] } = useQuery({
    queryKey: ["bindings", revisionId],
    queryFn: () => sdk.admin.getLabelBindings(revisionId!),
    enabled: !!revisionId,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: () => sdk.admin.getLabelTemplates(),
  });

  const { data: componentTypes = [] } = useQuery({
    queryKey: ["component-types"],
    queryFn: () => sdk.admin.getComponentTypes(),
  });

  const { data: partNumbers = [] } = useQuery({
    queryKey: ["part-numbers"],
    queryFn: () => sdk.admin.getPartNumbers(),
  });

  const usedPartNumbers = useMemo(() => 
    new Set(bom.map(row => row.component_part_number).filter(Boolean)),
    [bom]
  );

  const filteredPartNumbers = useMemo(() => {
    return partNumbers.filter(pn => {
      // If adding new row: hide if already used
      // If editing row: show if it's the current row's part number OR not used yet
      if (!editingBomRow) {
        return !usedPartNumbers.has(pn.part_number);
      }
      return !usedPartNumbers.has(pn.part_number) || pn.part_number === editingBomRow.component_part_number;
    });
  }, [partNumbers, usedPartNumbers, editingBomRow]);

  // State handled in dialog components

  const isReadOnly = revision?.status !== RevisionStatus.DRAFT;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["revision", modelId, revisionId] });
    queryClient.invalidateQueries({ queryKey: ["variants", modelId, revisionId] });
    queryClient.invalidateQueries({ queryKey: ["bom", modelId, revisionId] });
    queryClient.invalidateQueries({ queryKey: ["routing", modelId, revisionId] });
    queryClient.invalidateQueries({ queryKey: ["bindings", revisionId] });
  };

  const createVariant = useMutation({
    mutationFn: async (values: VariantForm) => {
      await sdk.admin.createVariant(modelId!, revisionId!, {
        code: values.code,
        description: values.description || "",
        is_default: values.is_default || variants.length === 0,
      });
    },
    onSuccess: () => {
      refresh();
      setVariantDialogOpen(false);
      setEditingVariant(null);
    },
  });

  const editVariant = useMutation({
    mutationFn: async (values: VariantForm) => {
      if (!editingVariant) return;
      await sdk.admin.updateVariant(modelId!, revisionId!, editingVariant.id, {
        code: values.code,
        description: values.description || "",
      });
    },
    onSuccess: () => {
      refresh();
      setVariantDialogOpen(false);
      setEditingVariant(null);
    },
  });

  const deleteVariant = useMutation({
    mutationFn: async (id: string) => sdk.admin.deleteVariant(modelId!, revisionId!, id),
    onSuccess: refresh,
  });

  const setDefaultVariant = useMutation({
    mutationFn: async (id: string) => sdk.admin.setDefaultVariant(modelId!, revisionId!, id),
    onSuccess: refresh,
  });

  const createBom = useMutation({
    mutationFn: async (values: BomRowForm) => {
      await sdk.admin.createBomRow(modelId!, revisionId!, {
        component_name: values.component_name,
        component_unit_type: values.component_unit_type,
        component_part_number: values.component_part_number || undefined,
        qty_per_assy: values.qty_per_assy,
        required: values.required,
      });
    },
    onSuccess: () => {
      refresh();
      setBomDialogOpen(false);
      setEditingBomRow(null);
    },
  });

  const editBom = useMutation({
    mutationFn: async (values: BomRowForm) => {
      if (!editingBomRow) return;
      await sdk.admin.updateBomRow(modelId!, revisionId!, editingBomRow.id, {
        component_name: values.component_name,
        component_unit_type: values.component_unit_type,
        component_part_number: values.component_part_number || undefined,
        qty_per_assy: values.qty_per_assy,
        required: values.required,
      });
    },
    onSuccess: () => {
      refresh();
      setBomDialogOpen(false);
      setEditingBomRow(null);
    },
  });

  const deleteBom = useMutation({
    mutationFn: async (id: string) => sdk.admin.deleteBomRow(modelId!, revisionId!, id),
    onSuccess: refresh,
  });

  const createRouting = useMutation({
    mutationFn: async (values: RoutingForm) => {
      await sdk.admin.createRoutingStep(modelId!, revisionId!, {
        step_code: values.step_code,
        sequence: values.sequence,
        mandatory: values.mandatory,
        description: values.description || undefined,
        component_type: values.component_type || undefined,
      });
    },
    onSuccess: () => {
      refresh();
      setRoutingDialogOpen(false);
      setEditingRouting(null);
    },
  });

  const editRouting = useMutation({
    mutationFn: async (values: RoutingForm) => {
      if (!editingRouting) return;
      await sdk.admin.updateRoutingStep(modelId!, revisionId!, editingRouting.id, {
        step_code: values.step_code,
        sequence: values.sequence,
        mandatory: values.mandatory,
        description: values.description || undefined,
        component_type: values.component_type || undefined,
      });
    },
    onSuccess: () => {
      refresh();
      setRoutingDialogOpen(false);
      setEditingRouting(null);
    },
  });

  const deleteRouting = useMutation({
    mutationFn: async (id: string) => sdk.admin.deleteRoutingStep(modelId!, revisionId!, id),
    onSuccess: refresh,
  });

  const createBinding = useMutation({
    mutationFn: async (values: BindingForm) => {
      await sdk.admin.createLabelBinding({
        model_revision_id: revisionId!,
        unit_type: values.unit_type,
        process_point: values.process_point,
        label_template_id: values.label_template_id,
      });
    },
    onSuccess: () => {
      refresh();
      setBindingDialogOpen(false);
      setEditingBinding(null);
    },
  });

  const editBinding = useMutation({
    mutationFn: async (values: BindingForm) => {
      if (!editingBinding) return;
      await sdk.admin.updateLabelBinding(editingBinding.id, {
        unit_type: values.unit_type,
        process_point: values.process_point,
        label_template_id: values.label_template_id,
      });
    },
    onSuccess: () => {
      refresh();
      setBindingDialogOpen(false);
      setEditingBinding(null);
    },
  });

  const deleteBinding = useMutation({
    mutationFn: async (id: string) => sdk.admin.deleteLabelBinding(id),
    onSuccess: refresh,
  });

  const errorMessage = useMemo(() => {
    const errors = [
      createVariant.error,
      editVariant.error,
      deleteVariant.error,
      setDefaultVariant.error,
      createBom.error,
      editBom.error,
      deleteBom.error,
      createRouting.error,
      editRouting.error,
      deleteRouting.error,
      createBinding.error,
      editBinding.error,
      deleteBinding.error,
    ];
    const first = errors.find(Boolean);
    return first ? formatApiError(first) : undefined;
  }, [
    createVariant.error, editVariant.error, deleteVariant.error, setDefaultVariant.error,
    createBom.error, editBom.error, deleteBom.error,
    createRouting.error, editRouting.error, deleteRouting.error,
    createBinding.error, editBinding.error, deleteBinding.error,
  ]);

  // ── Column definitions ───────────────────────────────────────────────────────

  const variantColumns = useMemo<ColumnDef<Variant>[]>(() => [
    {
      header: "Code",
      accessorKey: "code",
      cell: ({ row }) => <span style={{ fontWeight: 600 }}>{row.original.code}</span>,
    },
    {
      header: "Default",
      accessorKey: "is_default",
      size: 100,
      cell: ({ row }) =>
        row.original.is_default
          ? <ObjectStatus state="Positive">Default</ObjectStatus>
          : <span style={{ opacity: 0.35 }}>—</span>,
    },
    {
      header: "Description",
      accessorKey: "description",
      cell: ({ row }) => row.original.description || "—",
    },
    {
      header: "Actions",
      size: 220,
      cell: ({ row }) => {
        const v = row.original;
        if (isReadOnly) return null;
        return (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              onClick={(e) => { e.stopPropagation(); setDefaultVariant.mutate(v.id); }}
              design="Transparent"
              style={{ fontSize: "0.8rem" }}
            >
              Set Default
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setEditingVariant(v);
                setVariantDialogOpen(true);
              }}
              icon="edit"
              design="Transparent"
            />
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget({ id: v.id, type: "variant" });
              }}
              icon="delete"
              design="Transparent"
            />
          </div>
        );
      },
    },
  ], [isReadOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const bomColumns = useMemo<ColumnDef<BomRow>[]>(() => [
    {
      header: "Component",
      accessorKey: "component_name",
      cell: ({ row }) => (
        <span style={{ fontWeight: 600 }}>{row.original.component_name || row.original.component_unit_type}</span>
      ),
    },
    {
      header: "Part Number",
      accessorKey: "component_part_number",
      cell: ({ row }) => row.original.component_part_number || "—",
    },
    {
      header: "Location",
      accessorKey: "rm_location",
      cell: ({ row }) => row.original.rm_location || "—",
    },
    {
      header: "Qty",
      accessorKey: "qty_per_assy",
      size: 70,
    },
    {
      header: "Required",
      accessorKey: "required",
      size: 100,
      cell: ({ row }) =>
        row.original.required
          ? <ObjectStatus state="Positive">Yes</ObjectStatus>
          : <ObjectStatus state="None">No</ObjectStatus>,
    },
    {
      header: "Actions",
      size: 120,
      cell: ({ row }) => {
        const b = row.original;
        if (isReadOnly) return null;
        return (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              onClick={(e) => { e.stopPropagation(); setEditingBomRow(b); setBomDialogOpen(true); }}
              icon="edit"
              design="Transparent"
            />
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget({ id: b.id, type: "bom" });
              }}
              icon="delete"
              design="Transparent"
            />
          </div>
        );
      },
    },
  ], [isReadOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const routingColumns = useMemo<ColumnDef<RoutingStep>[]>(() => [
    {
      header: "#",
      accessorKey: "sequence",
      size: 60,
    },
    {
      header: "Step Code",
      accessorKey: "step_code",
      cell: ({ row }) => <span style={{ fontWeight: 600 }}>{row.original.step_code}</span>,
    },
    {
      header: "Mandatory",
      accessorKey: "mandatory",
      size: 110,
      cell: ({ row }) =>
        row.original.mandatory
          ? <ObjectStatus state="Positive">Yes</ObjectStatus>
          : <ObjectStatus state="None">No</ObjectStatus>,
    },
    {
      header: "Component Type",
      accessorKey: "component_type",
      cell: ({ row }) => row.original.component_type || "—",
    },
    {
      header: "Description",
      accessorKey: "description",
      cell: ({ row }) => row.original.description || "—",
    },
    {
      header: "Actions",
      size: 120,
      cell: ({ row }) => {
        const r = row.original;
        if (isReadOnly) return null;
        return (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setEditingRouting(r);
                setRoutingDialogOpen(true);
              }}
              icon="edit"
              design="Transparent"
            />
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget({ id: r.id, type: "routing" });
              }}
              icon="delete"
              design="Transparent"
            />
          </div>
        );
      },
    },
  ], [isReadOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const bindingColumns = useMemo<ColumnDef<LabelBinding>[]>(() => [
    {
      header: "Unit Type",
      accessorKey: "unit_type",
      cell: ({ row }) => <span style={{ fontWeight: 600 }}>{row.original.unit_type}</span>,
    },
    {
      header: "Process Point",
      accessorKey: "process_point",
    },
    {
      header: "Template",
      accessorKey: "label_template_id",
      cell: ({ row }) =>
        (templates as LabelTemplate[]).find((t) => t.id === row.original.label_template_id)?.name ||
        row.original.label_template_id,
    },
    {
      header: "Actions",
      size: 120,
      cell: ({ row }) => {
        const b = row.original;
        if (isReadOnly) return null;
        return (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setEditingBinding(b);
                setBindingDialogOpen(true);
              }}
              icon="edit"
              design="Transparent"
            />
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget({ id: b.id, type: "binding" });
              }}
              icon="delete"
              design="Transparent"
            />
          </div>
        );
      },
    },
  ], [isReadOnly, templates]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Early returns ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
        <FlexBox direction={FlexBoxDirection.Column} alignItems={FlexBoxAlignItems.Center} style={{ gap: "1rem" }}>
          <BusyIndicator active size="L" />
          <Label style={{ opacity: 0.65 }}>Loading revision…</Label>
        </FlexBox>
      </div>
    );
  }

  if (!revision) {
    return (
      <PageLayout title="Not Found" icon="warning" iconColor="red">
        <MessageStrip design="Negative" hideCloseButton style={{ borderRadius: "8px" }}>
          Revision not found. It may have been deleted.
        </MessageStrip>
      </PageLayout>
    );
  }

  const handleTabChange = (e: any) => {
    setTab(e.detail.tab.dataset.key);
  };

  const revCode = revision.revision_code;
  const modelName = (revision as any).model?.name || "Model";
  const modelCode = (revision as any).model?.code || "";

  return (
    <PageLayout
      title={`Revision: ${revCode}`}
      subtitle={
        <FlexBox alignItems={FlexBoxAlignItems.Center}>
          <span className="indicator-live" />
          <span>{modelName} ({modelCode}) — Revision details and BOM profile</span>
        </FlexBox>
      }
      icon="product"
      iconColor="indigo"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
            <ApiErrorBanner message={errorMessage} />
        </div>

        <div style={{ position: "relative" }}>
          {isReadOnly && (
            <div className="tab-header-status">
              <ObjectStatus state="Positive" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                Read-only (ACTIVE)
              </ObjectStatus>
            </div>
          )}
          <TabContainer 
            onTabSelect={handleTabChange} 
            contentBackgroundDesign="Transparent" 
            tabLayout="Inline"
            className="process-tabs"
            style={{ marginTop: "0.25rem" }}
          >

          {/* ── Variants ─────────────────────────────────────────────────────── */}
          <Tab text="Variants" icon="action" selected={tab === "variants"} data-key="variants">
            <div key={tab} className="page-container tab-content-container">
              <DataTable
                data={variants as Variant[]}
                columns={variantColumns}
                filterPlaceholder="Search variants…"
                hideEmptyState={true}
                actions={
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Button icon="nav-back" design="Transparent" onClick={() => navigate(`/admin/models/${modelId}`)}>
                      Back to Revisions
                    </Button>
                    {!isReadOnly && (
                      <Button
                        icon="add"
                        design="Emphasized"
                        onClick={() => {
                          setEditingVariant(null);
                          setVariantDialogOpen(true);
                        }}
                      >
                        Add Variant
                      </Button>
                    )}
                  </div>
                }
              />
            </div>
          </Tab>

          {/* ── BOM ──────────────────────────────────────────────────────────── */}
          <Tab text="BOM" icon="shipping-status" selected={tab === "bom"} data-key="bom">
            <div key={tab} className="page-container tab-content-container">
              <DataTable
                data={bom as BomRow[]}
                columns={bomColumns}
                filterPlaceholder="Search BOM…"
                hideEmptyState={true}
                actions={
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Button icon="nav-back" design="Transparent" onClick={() => navigate(`/admin/models/${modelId}`)}>
                      Back to Revisions
                    </Button>
                    {!isReadOnly && (
                      <Button
                        icon="add"
                        design="Emphasized"
                        onClick={() => {
                          setEditingBomRow(null);
                          setBomDialogOpen(true);
                        }}
                      >
                        Add Row
                      </Button>
                    )}
                  </div>
                }
              />
            </div>
          </Tab>

          {/* ── Routing ──────────────────────────────────────────────────────── */}
          <Tab text="Routing" icon="list" selected={tab === "routing"} data-key="routing">
            <div key={tab} className="page-container tab-content-container">
              <DataTable
                data={routing as RoutingStep[]}
                columns={routingColumns}
                filterPlaceholder="Search steps…"
                hideEmptyState={true}
                actions={
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Button icon="nav-back" design="Transparent" onClick={() => navigate(`/admin/models/${modelId}`)}>
                      Back to Revisions
                    </Button>
                    {!isReadOnly && (
                      <Button
                        icon="add"
                        design="Emphasized"
                        onClick={() => {
                          setEditingRouting(null);
                          setRoutingDialogOpen(true);
                        }}
                      >
                        Add Step
                      </Button>
                    )}
                  </div>
                }
              />
            </div>
          </Tab>

          {/* ── Bindings ─────────────────────────────────────────────────────── */}
          <Tab text="Bindings" icon="chain-link" selected={tab === "bindings"} data-key="bindings">
            <div key={tab} className="page-container tab-content-container">
              <DataTable
                data={bindings as LabelBinding[]}
                columns={bindingColumns}
                filterPlaceholder="Search bindings…"
                hideEmptyState={true}
                actions={
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Button icon="nav-back" design="Transparent" onClick={() => navigate(`/admin/models/${modelId}`)}>
                      Back to Revisions
                    </Button>
                    {!isReadOnly && (
                      <Button
                        icon="add"
                        design="Emphasized"
                        onClick={() => {
                          setEditingBinding(null);
                          setBindingDialogOpen(true);
                        }}
                      >
                        Add Binding
                      </Button>
                    )}
                  </div>
                }
              />
            </div>
          </Tab>

        </TabContainer>
        </div>
      </div>

      {/* ── BOM Dialog ──────────────────────────────────────────────────────── */}
      <BomRowDialog
        open={bomDialogOpen}
        row={editingBomRow}
        submitting={createBom.isPending || editBom.isPending}
        componentTypeOptions={componentTypes.map((ct) => ({ code: ct.code, name: ct.name }))}
        partNumberOptions={filteredPartNumbers}
        modelCode={model?.code}
        onClose={() => {
          setBomDialogOpen(false);
          setEditingBomRow(null);
        }}
        onSubmit={(values) => {
          const payload = {
            component_name: values.component_name,
            component_unit_type: values.component_unit_type,
            component_part_number: values.component_part_number || undefined,
            qty_per_assy: values.qty_per_assy,
            required: values.required,
          };
          if (editingBomRow) editBom.mutate(payload as any);
          else createBom.mutate(payload as any);
        }}
      />

      {/* ── Variant Dialog ───────────────────────────────────────────────────── */}
      <VariantDialog
        open={variantDialogOpen}
        variant={editingVariant}
        modelCode={model?.code}
        submitting={createVariant.isPending || editVariant.isPending}
        onClose={() => {
          setVariantDialogOpen(false);
          setEditingVariant(null);
        }}
        onSubmit={(values) => {
          if (editingVariant) editVariant.mutate({ ...values, id: editingVariant.id } as any);
          else createVariant.mutate(values as any);
        }}
      />

      {/* ── Routing Dialog ───────────────────────────────────────────────────── */}
      <RoutingDialog
        open={routingDialogOpen}
        step={editingRouting}
        nextSequence={routing.length + 1}
        modelCode={model?.code}
        submitting={createRouting.isPending || editRouting.isPending}
        onClose={() => {
          setRoutingDialogOpen(false);
          setEditingRouting(null);
        }}
        onSubmit={(values) => {
          if (editingRouting) editRouting.mutate({ ...values, id: editingRouting.id } as any);
          else createRouting.mutate(values as any);
        }}
      />

      {/* ── Binding Dialog ───────────────────────────────────────────────────── */}
      <BindingDialog
        open={bindingDialogOpen}
        binding={editingBinding}
        templates={templates}
        modelCode={model?.code}
        submitting={createBinding.isPending || editBinding.isPending}
        onClose={() => {
          setBindingDialogOpen(false);
          setEditingBinding(null);
        }}
        onSubmit={(values) => {
          if (editingBinding) editBinding.mutate({ ...values, id: editingBinding.id } as any);
          else createBinding.mutate(values as any);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.type === "bom" ? "BOM Row" : deleteTarget?.type === "routing" ? "Routing Step" : deleteTarget?.type || ""}`}
        description={`Are you sure you want to delete this ${deleteTarget?.type === "bom" ? "BOM row" : deleteTarget?.type === "routing" ? "routing step" : deleteTarget?.type || ""}? This action cannot be undone.`}
        confirmText="Delete"
        destructive
        submitting={
          deleteVariant.isPending || 
          deleteBom.isPending || 
          deleteRouting.isPending || 
          deleteBinding.isPending
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const { id, type } = deleteTarget;
          const options = { onSuccess: () => setDeleteTarget(null) };
          
          if (type === "variant") deleteVariant.mutate(id, options);
          else if (type === "bom") deleteBom.mutate(id, options);
          else if (type === "routing") deleteRouting.mutate(id, options);
          else if (type === "binding") deleteBinding.mutate(id, options);
        }}
      />
    </PageLayout>
  );
}
