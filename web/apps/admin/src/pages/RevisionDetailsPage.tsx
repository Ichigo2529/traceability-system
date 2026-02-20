import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef } from "@tanstack/react-table";
import { sdk } from "../context/AuthContext";
import { RevisionStatus, Variant, BomRow, RoutingStep, LabelBinding, LabelTemplate } from "@traceability/sdk";
import { ApiErrorBanner } from "../components/ui/ApiErrorBanner";
import { formatApiError } from "../lib/errors";
import { DataTable } from "../components/shared/DataTable";
import {
  Bar,
  Button,
  Dialog,
  FlexBox,
  FlexBoxAlignItems,
  FlexBoxDirection,
  Label,
  Input,
  Select,
  Option,
  TabContainer,
  Tab,
  ObjectStatus,
  CheckBox,
  BusyIndicator,
  MessageStrip,
} from "@ui5/webcomponents-react";
import { PageLayout } from "@traceability/ui";
import { BomRowDialog, BomRowForm } from "../components/shared/BomRowDialog";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import "@ui5/webcomponents-icons/dist/nav-back.js";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/action.js";
import "@ui5/webcomponents-icons/dist/shipping-status.js";
import "@ui5/webcomponents-icons/dist/list.js";
import "@ui5/webcomponents-icons/dist/chain-link.js";

const variantSchema = z.object({
  code: z.string().min(1),
  description: z.string().optional(),
  is_default: z.boolean().default(false),
});
type VariantForm = z.infer<typeof variantSchema>;

const routingSchema = z.object({
  step_code: z.string().min(1),
  sequence: z.coerce.number().int().positive(),
  mandatory: z.boolean().default(true),
  description: z.string().optional(),
  component_type: z.string().optional(),
});
type RoutingForm = z.infer<typeof routingSchema>;

const bindingSchema = z.object({
  unit_type: z.string().min(1),
  process_point: z.string().min(1),
  label_template_id: z.string().min(1),
});
type BindingForm = z.infer<typeof bindingSchema>;

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

  const variantForm = useForm<VariantForm>({
    resolver: zodResolver(variantSchema),
    defaultValues: { code: "", description: "", is_default: false },
  });
  const routingForm = useForm<RoutingForm>({
    resolver: zodResolver(routingSchema),
    defaultValues: { step_code: "", sequence: 1, mandatory: true, description: "", component_type: "" },
  });
  const bindingForm = useForm<BindingForm>({
    resolver: zodResolver(bindingSchema),
    defaultValues: { unit_type: "FOF_TRAY_20", process_point: "POST_FVMI_LABEL", label_template_id: "" },
  });

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
        rm_location: values.rm_location || undefined,
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
        rm_location: values.rm_location || undefined,
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
          <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.25rem" }}>
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
                variantForm.reset({ code: v.code, description: v.description || "", is_default: Boolean(v.is_default) });
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
          </FlexBox>
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
          <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.25rem" }}>
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
          </FlexBox>
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
          <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.25rem" }}>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setEditingRouting(r);
                routingForm.reset({
                  step_code: r.step_code,
                  sequence: r.sequence,
                  mandatory: r.mandatory,
                  description: r.description || "",
                  component_type: r.component_type || "",
                });
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
          </FlexBox>
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
          <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.25rem" }}>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setEditingBinding(b);
                bindingForm.reset({
                  unit_type: b.unit_type,
                  process_point: b.process_point,
                  label_template_id: b.label_template_id,
                });
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
          </FlexBox>
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
      <div style={{ paddingRight: "2rem", paddingBottom: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Toolbar row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Button icon="nav-back" design="Default" onClick={() => navigate(`/admin/models/${modelId}`)}>
            Back to Revisions
          </Button>
          {isReadOnly && (
            <ObjectStatus state="Positive" style={{ fontSize: "0.875rem" }}>
              Read-only (ACTIVE)
            </ObjectStatus>
          )}
        </div>

        <ApiErrorBanner message={errorMessage} />

        <TabContainer onTabSelect={handleTabChange} contentBackgroundDesign="Transparent" style={{ marginTop: "0.25rem" }}>

          {/* ── Variants ─────────────────────────────────────────────────────── */}
          <Tab text="Variants" icon="action" selected={tab === "variants"} data-key="variants">
            <DataTable
              data={variants as Variant[]}
              columns={variantColumns}
              filterPlaceholder="Search variants…"
              actions={
                !isReadOnly ? (
                  <Button
                    icon="add"
                    design="Emphasized"
                    onClick={() => {
                      setEditingVariant(null);
                      variantForm.reset({ code: "", description: "", is_default: variants.length === 0 });
                      setVariantDialogOpen(true);
                    }}
                  >
                    Add Variant
                  </Button>
                ) : undefined
              }
            />
          </Tab>

          {/* ── BOM ──────────────────────────────────────────────────────────── */}
          <Tab text="BOM" icon="shipping-status" selected={tab === "bom"} data-key="bom">
            <DataTable
              data={bom as BomRow[]}
              columns={bomColumns}
              filterPlaceholder="Search BOM…"
              actions={
                !isReadOnly ? (
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
                ) : undefined
              }
            />
          </Tab>

          {/* ── Routing ──────────────────────────────────────────────────────── */}
          <Tab text="Routing" icon="list" selected={tab === "routing"} data-key="routing">
            <DataTable
              data={routing as RoutingStep[]}
              columns={routingColumns}
              filterPlaceholder="Search steps…"
              actions={
                !isReadOnly ? (
                  <Button
                    icon="add"
                    design="Emphasized"
                    onClick={() => {
                      setEditingRouting(null);
                      routingForm.reset({
                        step_code: "",
                        sequence: routing.length + 1,
                        mandatory: true,
                        description: "",
                        component_type: "",
                      });
                      setRoutingDialogOpen(true);
                    }}
                  >
                    Add Step
                  </Button>
                ) : undefined
              }
            />
          </Tab>

          {/* ── Bindings ─────────────────────────────────────────────────────── */}
          <Tab text="Bindings" icon="chain-link" selected={tab === "bindings"} data-key="bindings">
            <DataTable
              data={bindings as LabelBinding[]}
              columns={bindingColumns}
              filterPlaceholder="Search bindings…"
              actions={
                !isReadOnly ? (
                  <Button
                    icon="add"
                    design="Emphasized"
                    onClick={() => {
                      setEditingBinding(null);
                      bindingForm.reset({
                        unit_type: "FOF_TRAY_20",
                        process_point: "POST_FVMI_LABEL",
                        label_template_id: templates[0]?.id || "",
                      });
                      setBindingDialogOpen(true);
                    }}
                  >
                    Add Binding
                  </Button>
                ) : undefined
              }
            />
          </Tab>

        </TabContainer>
      </div>

      {/* ── BOM Dialog ──────────────────────────────────────────────────────── */}
      <BomRowDialog
        open={bomDialogOpen}
        row={editingBomRow}
        submitting={createBom.isPending || editBom.isPending}
        componentTypeOptions={componentTypes.map((ct) => ({ code: ct.code, name: ct.name }))}
        partNumberOptions={partNumbers.map((pn) => pn.part_number)}
        onClose={() => {
          setBomDialogOpen(false);
          setEditingBomRow(null);
        }}
        onSubmit={(values) => {
          if (editingBomRow) editBom.mutate(values);
          else createBom.mutate(values);
        }}
      />

      {/* ── Variant Dialog ───────────────────────────────────────────────────── */}
      <Dialog
        headerText={editingVariant ? "Edit Variant" : "Create Variant"}
        open={variantDialogOpen}
        onClose={() => {
          setVariantDialogOpen(false);
          setEditingVariant(null);
        }}
        footer={
          <Bar
            endContent={
              <>
                <Button onClick={() => setVariantDialogOpen(false)}>Cancel</Button>
                <Button
                  design="Emphasized"
                  onClick={() =>
                    variantForm.handleSubmit((values) => {
                      if (editingVariant) editVariant.mutate(values);
                      else createVariant.mutate(values);
                    })()
                  }
                  disabled={createVariant.isPending || editVariant.isPending}
                >
                  {createVariant.isPending || editVariant.isPending
                    ? "Submitting…"
                    : editingVariant ? "Save Changes" : "Create Variant"}
                </Button>
              </>
            }
          />
        }
      >
        <FlexBox direction={FlexBoxDirection.Column} style={{ padding: "1rem", gap: "1rem", width: "320px" }}>
          <FlexBox direction={FlexBoxDirection.Column}>
            <Label required>Variant Code</Label>
            <Input {...variantForm.register("code")} placeholder="WITH_SHROUD" />
          </FlexBox>
          <FlexBox direction={FlexBoxDirection.Column}>
            <Label>Description</Label>
            <Input {...variantForm.register("description")} />
          </FlexBox>
          <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
            <CheckBox
              checked={variantForm.watch("is_default")}
              onChange={(e) => variantForm.setValue("is_default", e.target.checked)}
            />
            <Label>Set as default variant</Label>
          </FlexBox>
        </FlexBox>
      </Dialog>

      {/* ── Routing Dialog ───────────────────────────────────────────────────── */}
      <Dialog
        headerText={editingRouting ? "Edit Routing Step" : "Create Routing Step"}
        open={routingDialogOpen}
        onClose={() => {
          setRoutingDialogOpen(false);
          setEditingRouting(null);
        }}
        footer={
          <Bar
            endContent={
              <>
                <Button onClick={() => setRoutingDialogOpen(false)}>Cancel</Button>
                <Button
                  design="Emphasized"
                  onClick={() =>
                    routingForm.handleSubmit((values) => {
                      if (editingRouting) editRouting.mutate(values);
                      else createRouting.mutate(values);
                    })()
                  }
                  disabled={createRouting.isPending || editRouting.isPending}
                >
                  {createRouting.isPending || editRouting.isPending
                    ? "Submitting…"
                    : editingRouting ? "Save Changes" : "Create Step"}
                </Button>
              </>
            }
          />
        }
      >
        <FlexBox direction={FlexBoxDirection.Column} style={{ padding: "1rem", gap: "1rem", width: "400px" }}>
          <FlexBox style={{ gap: "1rem" }}>
            <FlexBox direction={FlexBoxDirection.Column} style={{ flex: 1 }}>
              <Label required>Step Code</Label>
              <Input {...routingForm.register("step_code")} placeholder="PRESS_FIT" />
            </FlexBox>
            <FlexBox direction={FlexBoxDirection.Column} style={{ width: "100px" }}>
              <Label required>Sequence</Label>
              <Input type="Number" {...routingForm.register("sequence")} />
            </FlexBox>
          </FlexBox>
          <FlexBox direction={FlexBoxDirection.Column}>
            <Label>Component Type</Label>
            <Input {...routingForm.register("component_type")} placeholder="PIN430_JIG" />
          </FlexBox>
          <FlexBox direction={FlexBoxDirection.Column}>
            <Label>Description</Label>
            <Input {...routingForm.register("description")} />
          </FlexBox>
          <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
            <CheckBox
              checked={routingForm.watch("mandatory")}
              onChange={(e) => routingForm.setValue("mandatory", e.target.checked)}
            />
            <Label>Mandatory step</Label>
          </FlexBox>
        </FlexBox>
      </Dialog>

      {/* ── Binding Dialog ───────────────────────────────────────────────────── */}
      <Dialog
        headerText={editingBinding ? "Edit Label Binding" : "Create Label Binding"}
        open={bindingDialogOpen}
        onClose={() => {
          setBindingDialogOpen(false);
          setEditingBinding(null);
        }}
        footer={
          <Bar
            endContent={
              <>
                <Button onClick={() => setBindingDialogOpen(false)}>Cancel</Button>
                <Button
                  design="Emphasized"
                  onClick={() =>
                    bindingForm.handleSubmit((values) => {
                      if (editingBinding) editBinding.mutate(values);
                      else createBinding.mutate(values);
                    })()
                  }
                  disabled={createBinding.isPending || editBinding.isPending}
                >
                  {createBinding.isPending || editBinding.isPending
                    ? "Submitting…"
                    : editingBinding ? "Save Changes" : "Create Binding"}
                </Button>
              </>
            }
          />
        }
      >
        <FlexBox direction={FlexBoxDirection.Column} style={{ padding: "1rem", gap: "1rem", width: "400px" }}>
          <FlexBox style={{ gap: "1rem" }}>
            <FlexBox direction={FlexBoxDirection.Column} style={{ flex: 1 }}>
              <Label required>Unit Type</Label>
              <Input {...bindingForm.register("unit_type")} placeholder="FOF_TRAY_20" />
            </FlexBox>
            <FlexBox direction={FlexBoxDirection.Column} style={{ flex: 1 }}>
              <Label required>Process Point</Label>
              <Input {...bindingForm.register("process_point")} placeholder="POST_FVMI" />
            </FlexBox>
          </FlexBox>
          <FlexBox direction={FlexBoxDirection.Column}>
            <Label required>Label Template</Label>
            <Select
              value={bindingForm.watch("label_template_id")}
              onChange={(e) =>
                bindingForm.setValue("label_template_id", (e.target.selectedOption as any).value)
              }
            >
              {templates.map((t: LabelTemplate) => (
                <Option
                  key={t.id}
                  value={t.id}
                  selected={bindingForm.watch("label_template_id") === t.id}
                >
                  {t.name}
                </Option>
              ))}
            </Select>
          </FlexBox>
        </FlexBox>
      </Dialog>

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
