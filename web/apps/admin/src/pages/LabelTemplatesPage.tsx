import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../context/AuthContext";
import { LabelTemplate } from "@traceability/sdk";
import { DataTable } from "../components/shared/DataTable";
import { FormDialog } from "../components/shared/FormDialog";
import { formatApiError } from "../lib/errors";
import { formatDateTime } from "../lib/datetime";
import { PageLayout } from "@traceability/ui";
import { useToast } from "../hooks/useToast";
import { 
    Button,
    Input, 
    Label,
    TextArea,
    Form,
    FormItem,
    ObjectStatus,
    FlexBox,
    FlexBoxAlignItems
} from "@ui5/webcomponents-react";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { ColumnDef } from "@tanstack/react-table";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/measure.js";

const EMPTY = { name: "", revision_id: "", template_body: "{}", description: "" };

export default function LabelTemplatesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<LabelTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LabelTemplate | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | undefined>();
  const { showToast, ToastComponent } = useToast();

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: () => sdk.admin.getLabelTemplates(),
  });

  const createTemplate = useMutation({
    mutationFn: async () => sdk.admin.createLabelTemplate(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setIsModalOpen(false);
      setEditing(null);
      setForm(EMPTY);
      setError(undefined);
      showToast("Template created successfully");
    },
    onError: (err) => setError(formatApiError(err))
  });

  const updateTemplate = useMutation({
    mutationFn: async () => sdk.admin.updateLabelTemplate(editing!.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setIsModalOpen(false);
      setEditing(null);
      setForm(EMPTY);
      setError(undefined);
      showToast("Template updated successfully");
    },
    onError: (err) => setError(formatApiError(err))
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteLabelTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setDeleteTarget(null);
      showToast("Template deleted");
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setError(undefined);
    setIsModalOpen(true);
  };

  const openEdit = (t: LabelTemplate) => {
    setEditing(t);
    setForm({
      name: t.name,
      revision_id: t.revision_id || "",
      template_body: t.template_body,
      description: t.description || "",
    });
    setError(undefined);
    setIsModalOpen(true);
  };

  const submit = () => {
    if (editing) updateTemplate.mutate();
    else createTemplate.mutate();
  };

  const columns = useMemo<ColumnDef<LabelTemplate>[]>(
    () => [
        { 
            header: "Name", 
            accessorKey: "name", 
            cell: ({ row }) => <span style={{ fontWeight: "bold" }}>{row.original.name}</span> 
        },
        { 
            header: "Revision", 
            accessorKey: "revision_id", 
            cell: ({ row }) => row.original.revision_id ? <span style={{ fontFamily: "monospace" }}>{row.original.revision_id}</span> : <span style={{ fontStyle: "italic", color: "gray" }}>GLOBAL</span> 
        },
        { 
            header: "Updated", 
            accessorKey: "updated_at", 
            cell: ({ row }) => formatDateTime(row.original.updated_at) 
        },
        {
          header: "Actions",
          cell: ({ row }) => (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Button 
                icon="edit" 
                design="Transparent" 
                className="button-hover-scale" 
                onClick={() => openEdit(row.original)} 
                tooltip="Edit Template" 
                aria-label="Edit Template"
              />
              <Button 
                icon="delete" 
                design="Transparent" 
                className="button-hover-scale"
                onClick={() => setDeleteTarget(row.original)} 
                tooltip="Delete Template"
                aria-label="Delete Template"
              />
            </div>
          ),
        },
      ],
      [deleteTemplate]
  );

  const isSubmitting = createTemplate.isPending || updateTemplate.isPending;

  return (
    <PageLayout
      title="Label Templates"
      subtitle={
        <FlexBox alignItems={FlexBoxAlignItems.Center}>
          <span className="indicator-live" />
          <span>Manage raw ZPL and JSON template bodies</span>
        </FlexBox>
      }
      icon="measure"
      iconColor="indigo"
    >
      <div className="page-container">
          <DataTable 
              data={templates} 
              columns={columns} 
              filterPlaceholder="Search templates..."
              actions={
                  <Button icon="add" design="Emphasized" className="button-hover-scale" onClick={openCreate}>
                      New Template
                  </Button>
              }
          />
      </div>

      <FormDialog 
          open={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={submit}
          title={editing ? "Edit Template" : "New Label Template"}
          submitText={isSubmitting ? "Saving..." : "Save"}
          submitting={isSubmitting}
      >
           {error && (
              <ObjectStatus state="Negative" inverted style={{ marginBottom: "1rem", display: "block" }}>
                  {error}
              </ObjectStatus>
          )}
          <Form layout="S1 M1 L1 XL1">
              <FormItem labelContent={<Label required>Name</Label>}>
                  <Input 
                      value={form.name}
                      onInput={(e) => setForm({...form, name: e.target.value})}
                  />
              </FormItem>
              <FormItem labelContent={<Label>Revision ID (optional)</Label>}>
                  <Input 
                      value={form.revision_id}
                      onInput={(e) => setForm({...form, revision_id: e.target.value})}
                      placeholder="Leave empty for GLOBAL"
                  />
              </FormItem>
              <FormItem labelContent={<Label>Description</Label>}>
                   <Input 
                      value={form.description}
                      onInput={(e) => setForm({...form, description: e.target.value})}
                  />
              </FormItem>
              <FormItem labelContent={<Label required>Template JSON</Label>}>
                  <TextArea
                      value={form.template_body}
                      onInput={(e) => setForm({...form, template_body: e.target.value})}
                      rows={10}
                      style={{ fontFamily: "monospace", width: "100%" }}
                  />
              </FormItem>
          </Form>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete label template"
        description={deleteTarget ? `Are you sure you want to delete template "${deleteTarget.name}"? This action cannot be undone.` : ""}
        confirmText="Delete"
        destructive
        submitting={deleteTemplate.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteTemplate.mutate(deleteTarget.id);
          }
        }}
      />
      <ToastComponent />
    </PageLayout>
  );
}
