import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { sdk } from "../context/AuthContext";
import { RevisionStatus, Variant, BomRow, RoutingStep, LabelBinding, LabelTemplate } from "@traceability/sdk";
import { ApiErrorBanner } from "../components/ui/ApiErrorBanner";
import { formatApiError } from "../lib/errors";
import { DataTable } from "../components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageLayout } from "@traceability/ui";
import { BomRowDialog, BomRowForm } from "../components/shared/BomRowDialog";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { VariantDialog, VariantForm } from "../components/shared/VariantDialog";
import { RoutingDialog, RoutingForm } from "../components/shared/RoutingDialog";
import { BindingDialog, BindingForm } from "../components/shared/BindingDialog";
import { ArrowLeft, Plus, Pencil, Trash2, Layers, Package, List, Link2 } from "lucide-react";

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
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: "variant" | "bom" | "routing" | "binding";
  } | null>(null);

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

  const { data: masterSteps = [] } = useQuery({
    queryKey: ["master-routing-steps"],
    queryFn: () => sdk.admin.getMasterRoutingSteps(),
  });

  const usedPartNumbers = useMemo(() => new Set(bom.map((row) => row.component_part_number).filter(Boolean)), [bom]);

  const filteredPartNumbers = useMemo(() => {
    return partNumbers.filter((pn) => {
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
  ]);

  // ── Column definitions ───────────────────────────────────────────────────────

  const variantColumns = useMemo<ColumnDef<Variant>[]>(
    () => [
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
          row.original.is_default ? (
            <span className="text-green-600 font-medium">Default</span>
          ) : (
            <span className="opacity-35">—</span>
          ),
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
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setDefaultVariant.mutate(v.id);
                }}
              >
                Set Default
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingVariant(v);
                  setVariantDialogOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget({ id: v.id, type: "variant" });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [isReadOnly]
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const bomColumns = useMemo<ColumnDef<BomRow>[]>(
    () => [
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
          row.original.required ? (
            <span className="text-green-600">Yes</span>
          ) : (
            <span className="text-muted-foreground">No</span>
          ),
      },
      {
        header: "Actions",
        size: 120,
        cell: ({ row }) => {
          const b = row.original;
          if (isReadOnly) return null;
          return (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingBomRow(b);
                  setBomDialogOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget({ id: b.id, type: "bom" });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [isReadOnly]
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const routingColumns = useMemo<ColumnDef<RoutingStep>[]>(
    () => [
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
          row.original.mandatory ? (
            <span className="text-green-600">Yes</span>
          ) : (
            <span className="text-muted-foreground">No</span>
          ),
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
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingRouting(r);
                  setRoutingDialogOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget({ id: r.id, type: "routing" });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [isReadOnly]
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const bindingColumns = useMemo<ColumnDef<LabelBinding>[]>(
    () => [
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
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingBinding(b);
                  setBindingDialogOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget({ id: b.id, type: "binding" });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [isReadOnly, templates]
  ); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Early returns ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
          <Label className="opacity-65">Loading revision…</Label>
        </div>
      </div>
    );
  }

  if (!revision) {
    return (
      <PageLayout title="Not Found" icon="warning" iconColor="red">
        <Alert variant="destructive" className="rounded-lg">
          <AlertDescription>Revision not found. It may have been deleted.</AlertDescription>
        </Alert>
      </PageLayout>
    );
  }

  const revCode = revision.revision_code;
  const modelName = (revision as any).model?.name || "Model";
  const modelCode = (revision as any).model?.code || "";

  const tabButtons = [
    { key: "variants" as const, label: "Variants", icon: Layers },
    { key: "bom" as const, label: "BOM", icon: Package },
    { key: "routing" as const, label: "Routing", icon: List },
    { key: "bindings" as const, label: "Bindings", icon: Link2 },
  ];

  return (
    <PageLayout
      title={`Revision: ${revCode}`}
      subtitle={
        <div className="flex items-center gap-2">
          <span>
            {modelName} ({modelCode}) — Revision details and BOM profile
          </span>
        </div>
      }
      icon="product"
      iconColor="indigo"
    >
      <div className="flex flex-col gap-4">
        <ApiErrorBanner message={errorMessage} />

        <div className="relative">
          {isReadOnly && (
            <div className="mb-2">
              <span className="text-sm font-semibold text-green-600">Read-only (ACTIVE)</span>
            </div>
          )}
          <div className="flex gap-1 border-b mb-3">
            {tabButtons.map(({ key, label, icon: Icon }) => (
              <Button key={key} variant={tab === key ? "secondary" : "ghost"} size="sm" onClick={() => setTab(key)}>
                <Icon className="h-4 w-4 mr-1" />
                {label}
              </Button>
            ))}
          </div>

          {tab === "variants" && (
            <div className="page-container tab-content-container">
              <DataTable
                data={variants as Variant[]}
                columns={variantColumns}
                filterPlaceholder="Search variants…"
                hideEmptyState={true}
                actions={
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/models/${modelId}`)}>
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back to Revisions
                    </Button>
                    {!isReadOnly && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingVariant(null);
                          setVariantDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Variant
                      </Button>
                    )}
                  </div>
                }
              />
            </div>
          )}

          {tab === "bom" && (
            <div className="page-container tab-content-container">
              <DataTable
                data={bom as BomRow[]}
                columns={bomColumns}
                filterPlaceholder="Search BOM…"
                hideEmptyState={true}
                actions={
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/models/${modelId}`)}>
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back to Revisions
                    </Button>
                    {!isReadOnly && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingBomRow(null);
                          setBomDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Row
                      </Button>
                    )}
                  </div>
                }
              />
            </div>
          )}

          {tab === "routing" && (
            <div className="page-container tab-content-container">
              <DataTable
                data={routing as RoutingStep[]}
                columns={routingColumns}
                filterPlaceholder="Search steps…"
                hideEmptyState={true}
                actions={
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/models/${modelId}`)}>
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back to Revisions
                    </Button>
                    {!isReadOnly && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingRouting(null);
                          setRoutingDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Step
                      </Button>
                    )}
                  </div>
                }
              />
            </div>
          )}

          {tab === "bindings" && (
            <div className="page-container tab-content-container">
              <DataTable
                data={bindings as LabelBinding[]}
                columns={bindingColumns}
                filterPlaceholder="Search bindings…"
                hideEmptyState={true}
                actions={
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/models/${modelId}`)}>
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back to Revisions
                    </Button>
                    {!isReadOnly && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingBinding(null);
                          setBindingDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Binding
                      </Button>
                    )}
                  </div>
                }
              />
            </div>
          )}
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
      {routingDialogOpen && (
        <RoutingDialog
          open={routingDialogOpen}
          step={editingRouting}
          nextSequence={routing.length > 0 ? Math.max(...routing.map((r) => r.sequence)) + 10 : 10}
          modelCode={modelCode}
          masterSteps={masterSteps}
          onClose={() => {
            setRoutingDialogOpen(false);
            setEditingRouting(null);
          }}
          onSubmit={(v) => {
            if (editingRouting) {
              editRouting.mutate(v);
            } else {
              createRouting.mutate(v);
            }
          }}
          submitting={createRouting.isPending || editRouting.isPending}
        />
      )}

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
          deleteVariant.isPending || deleteBom.isPending || deleteRouting.isPending || deleteBinding.isPending
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
