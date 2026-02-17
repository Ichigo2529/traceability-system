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
import { 
    Page, 
    Bar, 
    Title, 
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
    Table,
    TableRow,
    TableCell,
    TableHeaderRow,
    TableHeaderCell,
    ObjectStatus,
    CheckBox
} from "@ui5/webcomponents-react";
import { BomRowDialog, BomRowForm } from "../components/shared/BomRowDialog";
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

  const handleTabChange = (e: any) => {
    setTab(e.detail.tab.dataset.key);
  };

  return (
    <Page
      backgroundDesign="List"
      header={
        <Bar
          startContent={
            <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
              <Button icon="nav-back" design="Transparent" onClick={() => navigate(`/admin/models/${modelId}`)} />
              <FlexBox direction="Column">
                <Title level="H2">Revision {revision.revision_code}</Title>
                <span style={{ fontSize: "0.875rem", color: "var(--sapContent_LabelColor)" }}>
                  Status: {revision.status}
                </span>
              </FlexBox>
            </FlexBox>
          }
          endContent={
            isReadOnly && <ObjectStatus state="Critical">Read-only (ACTIVE)</ObjectStatus>
          }
        />
      }
      style={{ height: "100%" }}
    >
      <div style={{ padding: "1rem", width: "100%", boxSizing: "border-box" }}>
        <ApiErrorBanner message={errorMessage} />

        <TabContainer onTabSelect={handleTabChange} contentBackgroundDesign="Translucent">
          <Tab text="Variants" icon="action" selected={tab === "variants"} data-key="variants">
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
                  onDelete: !isReadOnly ? () => { if(confirm("Delete this variant?")) deleteVariant.mutate(v.id); } : undefined,
                  onExtra: !isReadOnly ? () => setDefaultVariant.mutate(v.id) : undefined,
                  extraLabel: "Set Default",
                }))}
                headers={["Code", "Default"]}
              />
            </Section>
          </Tab>

          <Tab text="BOM" icon="shipping-status" selected={tab === "bom"} data-key="bom">
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
                  onDelete: !isReadOnly ? () => { if(confirm("Delete this row?")) deleteBom.mutate(b.id); } : undefined,
                }))}
                headers={["Component", "RM PN / Location / Qty"]}
              />
            </Section>
          </Tab>

          <Tab text="Routing" icon="list" selected={tab === "routing"} data-key="routing">
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
                  onDelete: !isReadOnly ? () => { if(confirm("Delete this routing step?")) deleteRouting.mutate(r.id); } : undefined,
                }))}
                headers={["Step", "Mandatory"]}
              />
            </Section>
          </Tab>

          <Tab text="Bindings" icon="chain-link" selected={tab === "bindings"} data-key="bindings">
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
                  onDelete: !isReadOnly ? () => { if(confirm("Delete this binding?")) deleteBinding.mutate(b.id); } : undefined,
                }))}
                headers={["Binding Key", "Template"]}
              />
            </Section>
          </Tab>
        </TabContainer>
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
                            onClick={() => variantForm.handleSubmit((values) => {
                                if (editingVariant) editVariant.mutate(values);
                                else createVariant.mutate(values);
                            })()}
                            disabled={createVariant.isPending || editVariant.isPending}
                        >
                            {createVariant.isPending || editVariant.isPending ? "Submitting..." : (editingVariant ? "Save Changes" : "Create Variant")}
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
                            onClick={() => routingForm.handleSubmit((values) => {
                                if (editingRouting) editRouting.mutate(values);
                                else createRouting.mutate(values);
                            })()}
                            disabled={createRouting.isPending || editRouting.isPending}
                        >
                            {createRouting.isPending || editRouting.isPending ? "Submitting..." : (editingRouting ? "Save Changes" : "Create Step")}
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
                            onClick={() => bindingForm.handleSubmit((values) => {
                                if (editingBinding) editBinding.mutate(values);
                                else createBinding.mutate(values);
                            })()}
                            disabled={createBinding.isPending || editBinding.isPending}
                        >
                            {createBinding.isPending || editBinding.isPending ? "Submitting..." : (editingBinding ? "Save Changes" : "Create Binding")}
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
              onChange={(e) => bindingForm.setValue("label_template_id", (e.target.selectedOption as any).value)}
            >
              {templates.map((t: LabelTemplate) => (
                <Option key={t.id} value={t.id} selected={bindingForm.watch("label_template_id") === t.id}>
                  {t.name}
                </Option>
              ))}
            </Select>
          </FlexBox>
        </FlexBox>
      </Dialog>
    </Page>
  );
}

function Section({ title, onAdd, children }: { title: string; onAdd?: () => void; children: React.ReactNode }) {
  return (
    <div style={{ padding: "1rem", borderBottom: "1px solid var(--sapGroup_ContentBorderColor)" }}>
      <FlexBox alignItems={FlexBoxAlignItems.Center} justifyContent="SpaceBetween" style={{ marginBottom: "1rem" }}>
        <Title level="H3">{title}</Title>
        {onAdd && (
          <Button onClick={onAdd} icon="add" design="Transparent">
            Add
          </Button>
        )}
      </FlexBox>
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
  if (!rows.length) return <Label style={{ fontStyle: "italic", padding: "1rem", display: "block" }}>No data available</Label>;

  return (
    <Table
        headerRow={
            <TableHeaderRow>
                <TableHeaderCell><Label style={{ fontWeight: "bold" }}>{headers[0]}</Label></TableHeaderCell>
                <TableHeaderCell><Label style={{ fontWeight: "bold" }}>{headers[1]}</Label></TableHeaderCell>
                <TableHeaderCell style={{ textAlign: "right" }}><Label style={{ fontWeight: "bold" }}>Actions</Label></TableHeaderCell>
            </TableHeaderRow>
        }
    >
        {rows.map((r) => (
            <TableRow key={r.id}>
                <TableCell><Label style={{ fontWeight: "bold" }}>{r.col1}</Label></TableCell>
                <TableCell><Label>{r.col2}</Label></TableCell>
                <TableCell style={{ textAlign: "right" }}>
                    <FlexBox justifyContent="End" style={{ gap: "0.25rem" }}>
                        {r.onExtra && (
                            <Button onClick={r.onExtra} design="Transparent" style={{ fontSize: "0.75rem" }}>
                                {r.extraLabel || "Action"}
                            </Button>
                        )}
                        {r.onEdit && (
                            <Button onClick={r.onEdit} icon="edit" design="Transparent" />
                        )}
                        {r.onDelete && (
                            <Button onClick={r.onDelete} icon="delete" design="Transparent" style={{ color: "var(--sapNegativeColor)" }} />
                        )}
                    </FlexBox>
                </TableCell>
            </TableRow>
        ))}
    </Table>
  );
}
