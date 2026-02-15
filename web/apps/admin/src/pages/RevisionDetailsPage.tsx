import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { sdk } from "../context/AuthContext";
import { RevisionStatus, Variant, BomRow, RoutingStep, LabelBinding, LabelTemplate } from "@traceability/sdk";
import { ApiErrorBanner } from "../components/ui/ApiErrorBanner";
import { formatApiError } from "../lib/errors";
import { ArrowLeft, Boxes, GitBranch, ListTree, Plus, Shuffle, Trash2 } from "lucide-react";
import { BomRowDialog, BomRowForm } from "../components/shared/BomRowDialog";
import { FormDialog } from "../components/shared/FormDialog";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { UnderlineTabs } from "../components/shared/UnderlineTabs";

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

  if (isLoading) return <div>Loading...</div>;
  if (!revision) return <div>Revision not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/admin/models/${modelId}`)} className="p-2 rounded hover:bg-gray-100">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Revision {revision.revision_code}</h1>
            <p className="text-sm text-gray-500">Status: {revision.status}</p>
          </div>
        </div>
        {isReadOnly && <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">Read-only (ACTIVE)</span>}
      </div>

      <ApiErrorBanner message={errorMessage} />

      <UnderlineTabs
        value={tab}
        onChange={setTab}
        items={[
          { key: "variants", label: "Variants", icon: Shuffle },
          { key: "bom", label: "BOM", icon: Boxes },
          { key: "routing", label: "Routing", icon: ListTree },
          { key: "bindings", label: "Bindings", icon: GitBranch },
        ]}
      />

      <div className="bg-white border rounded-lg p-4">
        {tab === "variants" && (
          <Section
            title="Variants"
            onAdd={
              !isReadOnly
                ? () => {
                    setEditingVariant(null);
                    variantForm.reset({ code: "", description: "", is_default: variants.length === 0 });
                    setVariantDialogOpen(true);
                  }
                : undefined
            }
          >
            <SimpleTable
              rows={(variants as Variant[]).map((v) => ({
                id: v.id,
                col1: v.code,
                col2: v.is_default ? "DEFAULT" : "",
                onEdit: !isReadOnly
                  ? () => {
                      setEditingVariant(v);
                      variantForm.reset({ code: v.code, description: v.description || "", is_default: Boolean(v.is_default) });
                      setVariantDialogOpen(true);
                    }
                  : undefined,
                onDelete: !isReadOnly ? () => deleteVariant.mutate(v.id) : undefined,
                onExtra: !isReadOnly ? () => setDefaultVariant.mutate(v.id) : undefined,
                extraLabel: "Set Default",
              }))}
              headers={["Code", "Default"]}
            />
          </Section>
        )}

        {tab === "bom" && (
          <Section
            title="BOM"
            onAdd={
              !isReadOnly
                ? () => {
                    setEditingBomRow(null);
                    setBomDialogOpen(true);
                  }
                : undefined
            }
          >
            <SimpleTable
              rows={(bom as BomRow[]).map((b) => ({
                id: b.id,
                col1: b.component_name || b.component_unit_type,
                col2: `${b.component_part_number || "-"} | loc ${b.rm_location || "-"} | qty ${b.qty_per_assy} ${b.required ? "(required)" : "(optional)"}`,
                onEdit: !isReadOnly ? () => {
                  setEditingBomRow(b);
                  setBomDialogOpen(true);
                } : undefined,
                onDelete: !isReadOnly ? () => deleteBom.mutate(b.id) : undefined,
              }))}
              headers={["Component", "RM PN / Location / Qty"]}
            />
          </Section>
        )}

        {tab === "routing" && (
          <Section
            title="Routing"
            onAdd={
              !isReadOnly
                ? () => {
                    setEditingRouting(null);
                    routingForm.reset({
                      step_code: "",
                      sequence: routing.length + 1,
                      mandatory: true,
                      description: "",
                      component_type: "",
                    });
                    setRoutingDialogOpen(true);
                  }
                : undefined
            }
          >
            <SimpleTable
              rows={(routing as RoutingStep[]).map((r) => ({
                id: r.id,
                col1: `${r.sequence} - ${r.step_code}`,
                col2: r.mandatory ? "Mandatory" : "Optional",
                onEdit: !isReadOnly
                  ? () => {
                      setEditingRouting(r);
                      routingForm.reset({
                        step_code: r.step_code,
                        sequence: r.sequence,
                        mandatory: r.mandatory,
                        description: r.description || "",
                        component_type: r.component_type || "",
                      });
                      setRoutingDialogOpen(true);
                    }
                  : undefined,
                onDelete: !isReadOnly ? () => deleteRouting.mutate(r.id) : undefined,
              }))}
              headers={["Step", "Mandatory"]}
            />
          </Section>
        )}

        {tab === "bindings" && (
          <Section
            title="Label Bindings"
            onAdd={
              !isReadOnly
                ? () => {
                    setEditingBinding(null);
                    bindingForm.reset({
                      unit_type: "FOF_TRAY_20",
                      process_point: "POST_FVMI_LABEL",
                      label_template_id: templates[0]?.id || "",
                    });
                    setBindingDialogOpen(true);
                  }
                : undefined
            }
          >
            <SimpleTable
              rows={(bindings as LabelBinding[]).map((b) => ({
                id: b.id,
                col1: `${b.unit_type} @ ${b.process_point}`,
                col2: templates.find((t: LabelTemplate) => t.id === b.label_template_id)?.name || b.label_template_id,
                onEdit: !isReadOnly
                  ? () => {
                      setEditingBinding(b);
                      bindingForm.reset({
                        unit_type: b.unit_type,
                        process_point: b.process_point,
                        label_template_id: b.label_template_id,
                      });
                      setBindingDialogOpen(true);
                    }
                  : undefined,
                onDelete: !isReadOnly ? () => deleteBinding.mutate(b.id) : undefined,
              }))}
              headers={["Binding Key", "Template"]}
            />
          </Section>
        )}
      </div>
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
      <FormDialog
        open={variantDialogOpen}
        onClose={() => {
          setVariantDialogOpen(false);
          setEditingVariant(null);
        }}
        title={editingVariant ? "Edit Variant" : "Create Variant"}
        onSubmit={variantForm.handleSubmit((values) => {
          if (editingVariant) editVariant.mutate(values);
          else createVariant.mutate(values);
        })}
        submitting={createVariant.isPending || editVariant.isPending}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Variant Code</Label>
            <Input {...variantForm.register("code")} placeholder="WITH_SHROUD" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...variantForm.register("description")} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={variantForm.watch("is_default")}
              onCheckedChange={(v) => variantForm.setValue("is_default", Boolean(v))}
            />
            Set as default variant
          </label>
        </div>
      </FormDialog>
      <FormDialog
        open={routingDialogOpen}
        onClose={() => {
          setRoutingDialogOpen(false);
          setEditingRouting(null);
        }}
        title={editingRouting ? "Edit Routing Step" : "Create Routing Step"}
        onSubmit={routingForm.handleSubmit((values) => {
          if (editingRouting) editRouting.mutate(values);
          else createRouting.mutate(values);
        })}
        submitting={createRouting.isPending || editRouting.isPending}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Step Code</Label>
            <Input {...routingForm.register("step_code")} placeholder="PRESS_FIT_PIN430_DONE" />
          </div>
          <div className="space-y-2">
            <Label>Sequence</Label>
            <Input type="number" {...routingForm.register("sequence")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Component Type</Label>
            <Input {...routingForm.register("component_type")} placeholder="PIN430_JIG" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea {...routingForm.register("description")} />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={routingForm.watch("mandatory")}
                onCheckedChange={(v) => routingForm.setValue("mandatory", Boolean(v))}
              />
              Mandatory step
            </label>
          </div>
        </div>
      </FormDialog>
      <FormDialog
        open={bindingDialogOpen}
        onClose={() => {
          setBindingDialogOpen(false);
          setEditingBinding(null);
        }}
        title={editingBinding ? "Edit Label Binding" : "Create Label Binding"}
        onSubmit={bindingForm.handleSubmit((values) => {
          if (editingBinding) editBinding.mutate(values);
          else createBinding.mutate(values);
        })}
        submitting={createBinding.isPending || editBinding.isPending}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Unit Type</Label>
            <Input {...bindingForm.register("unit_type")} placeholder="FOF_TRAY_20" />
          </div>
          <div className="space-y-2">
            <Label>Process Point</Label>
            <Input {...bindingForm.register("process_point")} placeholder="POST_FVMI_LABEL" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Label Template</Label>
            <Select
              value={bindingForm.watch("label_template_id")}
              onValueChange={(v) => bindingForm.setValue("label_template_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t: LabelTemplate) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}

function Section({ title, onAdd, children }: { title: string; onAdd?: () => void; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {onAdd && (
          <button onClick={onAdd} className="text-sm inline-flex items-center gap-1 px-3 py-1 rounded border hover:bg-gray-50">
            <Plus size={14} /> Add
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: [string, string];
  rows: Array<{
    id: string;
    col1: string;
    col2: string;
    onEdit?: () => void;
    onDelete?: () => void;
    onExtra?: () => void;
    extraLabel?: string;
  }>;
}) {
  if (!rows.length) return <div className="text-sm text-gray-500">No data</div>;

  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 text-gray-600">
        <tr>
          <th className="px-3 py-2 text-left">{headers[0]}</th>
          <th className="px-3 py-2 text-left">{headers[1]}</th>
          <th className="px-3 py-2 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t">
            <td className="px-3 py-2">{r.col1}</td>
            <td className="px-3 py-2">{r.col2}</td>
            <td className="px-3 py-2 text-right space-x-2">
              {r.onExtra && (
                <button onClick={r.onExtra} className="text-xs px-2 py-1 rounded border hover:bg-gray-50">
                  {r.extraLabel || "Action"}
                </button>
              )}
              {r.onEdit && (
                <button onClick={r.onEdit} className="text-xs px-2 py-1 rounded border hover:bg-gray-50">
                  Edit
                </button>
              )}
              {r.onDelete && (
                <button onClick={r.onDelete} className="text-red-600 hover:text-red-800 inline-flex items-center">
                  <Trash2 size={14} />
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
