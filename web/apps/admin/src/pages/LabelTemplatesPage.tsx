import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../context/AuthContext";
import { LabelTemplate } from "@traceability/sdk";
import { DataTable } from "../components/shared/DataTable";
import { FormDialog } from "../components/shared/FormDialog";
import { formatApiError } from "../lib/errors";
import { formatDateTime } from "../lib/datetime";
import { PageLayout, Section } from "@traceability/ui";
import { 
    Button,
    Input, 
    Label,
    TextArea,
    Form,
    FormItem,
    ObjectStatus
} from "@ui5/webcomponents-react";
import { ColumnDef } from "@tanstack/react-table";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/tags.js";

const EMPTY = { name: "", revision_id: "", template_body: "{}", description: "" };

export default function LabelTemplatesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<LabelTemplate | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | undefined>();

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
    },
    onError: (err) => setError(formatApiError(err))
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteLabelTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
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
              <Button icon="edit" design="Transparent" onClick={() => openEdit(row.original)} tooltip="Edit" />
              <Button 
                icon="delete" 
                design="Transparent" 
                onClick={() => {
                   deleteTemplate.mutate(row.original.id);
                }} 
                tooltip="Delete"
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
      subtitle="Manage ZPL label templates for printing"
      icon="tags"
    >
      <Section variant="card">
        <DataTable 
            data={templates} 
            columns={columns} 
            filterPlaceholder="Search templates..."
            actions={
                <Button icon="add" design="Emphasized" onClick={openCreate}>
                    New Template
                </Button>
            }
        />

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
      </Section>
    </PageLayout>
  );
}
