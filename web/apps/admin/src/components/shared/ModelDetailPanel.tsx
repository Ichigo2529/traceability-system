import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ColumnDef } from "@tanstack/react-table";
import { sdk } from "../../context/AuthContext";
import { Model, ModelRevision, RevisionStatus } from "@traceability/sdk";
import { DataTable } from "./DataTable";
import { ConfirmDialog } from "./ConfirmDialog";
import { ApiErrorBanner } from "../ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "./StatusBadge";
import { Link2, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
  model: Model | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ModelDetailPanel({ model, onClose, onSaved }: ModelDetailPanelProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"revisions" | "general">("revisions");
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [newRevisionCode, setNewRevisionCode] = useState("");
  const [cloneFromRevisionId, setCloneFromRevisionId] = useState("");
  const [activateTarget, setActivateTarget] = useState<ModelRevision | null>(null);

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
      setActiveTab("revisions");
    } else {
      form.reset({ code: "", name: "", part_number: "", active: true, pack_size: 1, description: "" });
      setActiveTab("general");
    }
  }, [model, form]);

  const createMutation = useMutation({
    mutationFn: (v: ModelForm) => sdk.admin.createModel(v),
    onSuccess: () => onSaved(),
  });

  const updateMutation = useMutation({
    mutationFn: (v: ModelForm) => sdk.admin.updateModel(model!.id, v),
    onSuccess: () => onSaved(),
  });

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
      onSaved();
      setActivateTarget(null);
    },
  });

  const revisionColumns = useMemo<ColumnDef<ModelRevision>[]>(
    () => [
      {
        id: "revision",
        header: "Revision",
        accessorKey: "revision_code",
        size: 160,
        cell: ({ row }) => {
          const rev = row.original;
          const isActive = rev.status === RevisionStatus.ACTIVE;
          return (
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0",
                  isActive
                    ? "bg-gradient-to-br from-emerald-400 to-blue-500"
                    : "bg-gradient-to-br from-indigo-500 to-purple-600"
                )}
              >
                <Link2 className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold">{rev.revision_code}</span>
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        size: 120,
        cell: ({ row }) => {
          const rev = row.original;
          const status =
            rev.status === RevisionStatus.ACTIVE
              ? "active"
              : rev.status === RevisionStatus.DRAFT
                ? "disabled"
                : "active";
          return <StatusBadge status={status} />;
        },
      },
      {
        id: "actions",
        header: "Actions",
        size: 200,
        cell: ({ row }) => {
          const rev = row.original;
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!model?.id}
                onClick={() => model?.id && navigate(`/admin/models/${model.id}/revisions/${rev.id}`)}
              >
                Configure
                <ChevronRight className="h-3.5 w-3.5 ml-0.5" aria-hidden />
              </Button>
              {rev.status !== RevisionStatus.ACTIVE ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setActivateTarget(rev)}
                  disabled={activateRevision.isPending}
                >
                  <Play className="h-3.5 w-3.5 mr-1" aria-hidden />
                  Activate
                </Button>
              ) : (
                <StatusBadge status="active" />
              )}
            </div>
          );
        },
      },
    ],
    [activateRevision.isPending, model?.id, navigate]
  );

  const formGrid = (
    <div className="grid gap-4 max-w-md">
      <div className="grid gap-2">
        <Label htmlFor="model-code">Model Code *</Label>
        <Input id="model-code" {...form.register("code")} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="model-name">Model Name *</Label>
        <Input id="model-name" {...form.register("name")} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="model-part_number">Part Number</Label>
        <Input id="model-part_number" {...form.register("part_number")} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="model-pack_size">Pack Size</Label>
        <Input id="model-pack_size" type="number" {...form.register("pack_size")} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="model-description">Description</Label>
        <Input id="model-description" {...form.register("description")} />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="model-active"
          checked={form.watch("active")}
          onCheckedChange={(v) => form.setValue("active", !!v)}
        />
        <Label htmlFor="model-active" className="cursor-pointer">
          Active
        </Label>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full rounded-r-2xl border-l border-border overflow-hidden bg-background">
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border flex-shrink-0">
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">{model ? `Overview: ${model.code}` : "Create Model"}</h1>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {model ? (
          <>
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as "revisions" | "general")}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="border-b border-border px-4 py-3">
                <TabsList>
                  <TabsTrigger value="revisions">Revisions</TabsTrigger>
                  <TabsTrigger value="general">General Info</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="revisions" className="mt-0 min-h-0 flex-1 overflow-y-auto p-4">
                <ApiErrorBanner
                  message={activateRevision.isError ? formatApiError(activateRevision.error) : undefined}
                />
                <DataTable
                  data={revisions as ModelRevision[]}
                  columns={revisionColumns}
                  loading={revisionsLoading}
                  hideEmptyState={false}
                  actions={<Button onClick={() => setIsDraftModalOpen(true)}>New Draft</Button>}
                />
              </TabsContent>

              <TabsContent value="general" className="mt-0 min-h-0 flex-1 overflow-y-auto p-6">
                <ApiErrorBanner message={updateMutation.isError ? formatApiError(updateMutation.error) : undefined} />
                <form
                  id="model-config-form"
                  onSubmit={form.handleSubmit((v) => (model ? updateMutation.mutate(v) : createMutation.mutate(v)))}
                >
                  {formGrid}
                </form>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="p-6 overflow-y-auto">
            <ApiErrorBanner message={createMutation.isError ? formatApiError(createMutation.error) : undefined} />
            <form
              id="model-config-form"
              onSubmit={form.handleSubmit((v) => (model ? updateMutation.mutate(v) : createMutation.mutate(v)))}
            >
              {formGrid}
            </form>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 px-4 py-3 border-t border-border flex-shrink-0">
        {activeTab === "general" && (
          <Button
            type="submit"
            form="model-config-form"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? "Saving…" : "Save Config"}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      <Dialog open={isDraftModalOpen} onOpenChange={setIsDraftModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Revision Draft</DialogTitle>
            <DialogDescription>
              Create a new draft revision, optionally cloning from an existing revision.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createRevision.mutate();
            }}
          >
            <div className="flex flex-col gap-4 py-2">
              <ApiErrorBanner message={createRevision.isError ? formatApiError(createRevision.error) : undefined} />
              <div className="grid gap-2">
                <Label htmlFor="draft-revision-code">Revision Code *</Label>
                <Input
                  id="draft-revision-code"
                  value={newRevisionCode}
                  onChange={(e) => setNewRevisionCode(e.target.value)}
                  placeholder="e.g. R01"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="draft-clone-from">Clone From (Optional)</Label>
                <Select
                  value={cloneFromRevisionId || "__empty__"}
                  onValueChange={(v) => setCloneFromRevisionId(v === "__empty__" ? "" : v)}
                >
                  <SelectTrigger id="draft-clone-from">
                    <SelectValue placeholder="-- Empty Draft --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">-- Empty Draft --</SelectItem>
                    {(revisions as ModelRevision[]).map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="tabular-nums">{r.revision_code}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">
                            {r.status === RevisionStatus.DRAFT
                              ? "Draft"
                              : r.status === RevisionStatus.ACTIVE
                                ? "Active"
                                : r.status}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDraftModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRevision.isPending || !newRevisionCode}>
                {createRevision.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(activateTarget)}
        title="Activate Revision"
        description={
          activateTarget
            ? `Activate revision "${activateTarget.revision_code}"? This will replace the current active revision in production.`
            : ""
        }
        confirmText="Activate"
        onCancel={() => setActivateTarget(null)}
        onConfirm={() => {
          if (activateTarget) activateRevision.mutate(activateTarget.id);
        }}
      />
    </div>
  );
}
