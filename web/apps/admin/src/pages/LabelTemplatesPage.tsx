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
import { Button } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil } from "lucide-react";

const EMPTY = { name: "", revision_id: "", template_body: "{}", description: "" };

export default function LabelTemplatesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<LabelTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LabelTemplate | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | undefined>();
  const { showToast } = useToast();

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
    onError: (err) => setError(formatApiError(err)),
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
    onError: (err) => setError(formatApiError(err)),
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
        id: "name",
        header: "Name",
        accessorKey: "name",
        cell: ({ row }) => <span className="font-bold">{row.original.name}</span>,
      },
      {
        id: "revision_id",
        header: "Revision",
        accessorKey: "revision_id",
        cell: ({ row }) =>
          row.original.revision_id ? (
            <span className="font-mono">{row.original.revision_id}</span>
          ) : (
            <span className="italic text-muted-foreground">GLOBAL</span>
          ),
      },
      {
        id: "updated_at",
        header: "Updated",
        accessorKey: "updated_at",
        cell: ({ row }) => formatDateTime(row.original.updated_at),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="button-hover-scale"
              onClick={() => openEdit(row.original)}
              title="Edit Template"
              aria-label="Edit Template"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <DeleteIconButton
              className="button-hover-scale"
              onClick={() => setDeleteTarget(row.original)}
              title="Delete Template"
              aria-label="Delete Template"
            />
          </div>
        ),
      },
    ],
    []
  );

  const isSubmitting = createTemplate.isPending || updateTemplate.isPending;

  return (
    <PageLayout
      title="Label Templates"
      subtitle={
        <div className="flex items-center gap-2">
          <span>Manage raw ZPL and JSON template bodies</span>
        </div>
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
            <Button className="button-hover-scale" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
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
        <div className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-2">
            <Label htmlFor="lt-name">Name *</Label>
            <Input id="lt-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lt-revision">Revision ID (optional)</Label>
            <Input
              id="lt-revision"
              value={form.revision_id}
              onChange={(e) => setForm({ ...form, revision_id: e.target.value })}
              placeholder="Leave empty for GLOBAL"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lt-desc">Description</Label>
            <Input
              id="lt-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lt-body">Template JSON *</Label>
            <Textarea
              id="lt-body"
              value={form.template_body}
              onChange={(e) => setForm({ ...form, template_body: e.target.value })}
              rows={10}
              className="font-mono w-full"
            />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete label template"
        description={
          deleteTarget
            ? `Are you sure you want to delete template "${deleteTarget.name}"? This action cannot be undone.`
            : ""
        }
        confirmText="Delete"
        destructive
        submitting={deleteTemplate.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteTemplate.mutate(deleteTarget.id);
        }}
      />
    </PageLayout>
  );
}
