import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { PageLayout } from "@traceability/ui";
import { useToast } from "../../hooks/useToast";
import { Button } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Plus, Pencil, Banknote, Star } from "lucide-react";
import {
  AdminSection,
  SectionCostCenterMapping,
  getSections,
  createSection,
  updateSection,
  deleteSection,
  getCostCenters,
  addSectionCostCenter,
  removeSectionCostCenter,
  setSectionDefaultCC,
} from "../../lib/section-api";

const schema = z.object({
  section_code: z.string().min(1, "Required"),
  section_name: z.string().min(1, "Required"),
  is_active: z.boolean().default(true),
});
type SectionForm = z.infer<typeof schema>;

export function SectionsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSection | null>(null);
  const [disableTarget, setDisableTarget] = useState<AdminSection | null>(null);
  const [mappingTarget, setMappingTarget] = useState<AdminSection | null>(null);
  const [addCCId, setAddCCId] = useState("");
  const [addCCDefault, setAddCCDefault] = useState(false);
  const { showToast } = useToast();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-sections"],
    queryFn: getSections,
  });

  const { data: allCostCenters = [] } = useQuery({
    queryKey: ["admin-cost-centers"],
    queryFn: getCostCenters,
  });

  const form = useForm<SectionForm>({
    resolver: zodResolver(schema),
    defaultValues: { section_code: "", section_name: "", is_active: true },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-sections"] });

  const createMut = useMutation({
    mutationFn: (p: SectionForm) => createSection(p),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      form.reset({ section_code: "", section_name: "", is_active: true });
      showToast("Section created");
    },
  });

  const updateMut = useMutation({
    mutationFn: (p: SectionForm) => updateSection(editing!.id, p),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setEditing(null);
      showToast("Section updated");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSection(id),
    onSuccess: () => {
      invalidate();
      showToast("Section disabled");
    },
  });

  const addMappingMut = useMutation({
    mutationFn: ({ sectionId, ccId, isDefault }: { sectionId: string; ccId: string; isDefault: boolean }) =>
      addSectionCostCenter(sectionId, { cost_center_id: ccId, is_default: isDefault }),
    onSuccess: () => {
      invalidate();
      setAddCCId("");
      setAddCCDefault(false);
      showToast("Cost center mapped");
    },
  });

  const removeMappingMut = useMutation({
    mutationFn: ({ sectionId, ccId }: { sectionId: string; ccId: string }) => removeSectionCostCenter(sectionId, ccId),
    onSuccess: () => {
      invalidate();
      showToast("Mapping removed");
    },
  });

  const setDefaultMut = useMutation({
    mutationFn: ({ sectionId, ccId }: { sectionId: string; ccId: string }) => setSectionDefaultCC(sectionId, ccId),
    onSuccess: () => {
      invalidate();
      showToast("Default cost center updated");
    },
  });

  const liveMappingTarget = mappingTarget ? (rows.find((r) => r.id === mappingTarget.id) ?? mappingTarget) : null;
  const mappedCCIds = new Set(liveMappingTarget?.cost_centers?.map((m) => m.cost_center_id) ?? []);
  const availableCCs = allCostCenters.filter((cc) => cc.is_active && !mappedCCIds.has(cc.id));

  const columns = useMemo<ColumnDef<AdminSection>[]>(
    () => [
      { id: "section_code", header: "Code", accessorKey: "section_code", size: 120 },
      { id: "section_name", header: "Name", accessorKey: "section_name" },
      {
        id: "cost_centers",
        header: "Cost Centers",
        size: 140,
        cell: ({ row }) => {
          const count = row.original.cost_centers?.length ?? 0;
          const def = row.original.cost_centers?.find((m) => m.is_default);
          return (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{count}</Badge>
              {def ? <span className="text-xs opacity-70">default: {def.cost_code}</span> : null}
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        size: 100,
        cell: ({ row }) => <StatusBadge status={row.original.is_active ? "active" : "disabled"} />,
      },
      {
        id: "actions",
        header: "Actions",
        size: 160,
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setMappingTarget(row.original);
                setAddCCId("");
                setAddCCDefault(false);
              }}
              title="Manage cost centers"
              aria-label="Manage cost centers"
            >
              <Banknote className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditing(row.original);
                form.reset({
                  section_code: row.original.section_code,
                  section_name: row.original.section_name,
                  is_active: row.original.is_active,
                });
                setOpen(true);
              }}
              title="Edit"
              aria-label="Edit section"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <DeleteIconButton
              onClick={() => setDisableTarget(row.original)}
              title="Disable"
              aria-label="Disable section"
            />
          </div>
        ),
      },
    ],
    [form]
  );

  return (
    <PageLayout
      title="Sections"
      subtitle={
        <div className="flex items-center gap-2">
          <span>Organizational sections and cost center mappings</span>
        </div>
      }
      icon="org-chart"
      iconColor="indigo"
    >
      <div className="page-container">
        <ApiErrorBanner
          message={
            createMut.error
              ? formatApiError(createMut.error)
              : updateMut.error
                ? formatApiError(updateMut.error)
                : deleteMut.error
                  ? formatApiError(deleteMut.error)
                  : undefined
          }
        />
        <DataTable
          data={rows}
          columns={columns}
          loading={isLoading}
          filterPlaceholder="Search sections..."
          actions={
            <Button
              className="button-hover-scale"
              onClick={() => {
                setEditing(null);
                form.reset({ section_code: "", section_name: "", is_active: true });
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          }
        />
      </div>

      <FormDialog
        open={open}
        onClose={() => {
          setOpen(false);
          createMut.reset();
          updateMut.reset();
        }}
        title={editing ? "Edit Section" : "Create Section"}
        onSubmit={form.handleSubmit((p) => (editing ? updateMut.mutate(p) : createMut.mutate(p)))}
        submitting={createMut.isPending || updateMut.isPending}
      >
        {(createMut.isError || updateMut.isError) && (
          <Alert variant="destructive" className="mx-4 mb-4">
            <AlertDescription>{formatApiError(createMut.error ?? updateMut.error)}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Section Code *</Label>
            <Input
              value={form.watch("section_code")}
              onChange={(e) => form.setValue("section_code", e.target.value)}
              className={form.formState.errors.section_code ? "border-destructive" : ""}
            />
            {form.formState.errors.section_code && (
              <p className="text-sm text-destructive">{form.formState.errors.section_code.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Section Name *</Label>
            <Input
              value={form.watch("section_name")}
              onChange={(e) => form.setValue("section_name", e.target.value)}
              className={form.formState.errors.section_name ? "border-destructive" : ""}
            />
            {form.formState.errors.section_name && (
              <p className="text-sm text-destructive">{form.formState.errors.section_name.message}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Controller
              name="is_active"
              control={form.control}
              render={({ field }) => (
                <Checkbox id="section-active" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="section-active" className="cursor-pointer font-normal">
              Active
            </Label>
          </div>
        </div>
      </FormDialog>

      <Dialog open={Boolean(liveMappingTarget)} onOpenChange={(v) => !v && setMappingTarget(null)}>
        <DialogContent className="sm:max-w-[640px] max-w-[90vw]">
          <DialogHeader>
            <DialogTitle>Cost Centers — {liveMappingTarget?.section_name ?? ""}</DialogTitle>
            <DialogDescription>Manage cost center mappings for this section.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            {addMappingMut.error && (
              <Alert variant="destructive">
                <AlertDescription>{formatApiError(addMappingMut.error)}</AlertDescription>
              </Alert>
            )}
            {removeMappingMut.error && (
              <Alert variant="destructive">
                <AlertDescription>{formatApiError(removeMappingMut.error)}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px] grid gap-2">
                <Label>Add Cost Center</Label>
                <Select value={addCCId || "__none__"} onValueChange={(v) => setAddCCId(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Select --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Select --</SelectItem>
                    {availableCCs.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.group_code} | {cc.cost_code} - {cc.short_text}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="add-cc-default" checked={addCCDefault} onCheckedChange={(v) => setAddCCDefault(!!v)} />
                <Label htmlFor="add-cc-default" className="cursor-pointer font-normal">
                  Set as default
                </Label>
              </div>
              <Button
                disabled={!addCCId || addMappingMut.isPending}
                onClick={() => {
                  if (!liveMappingTarget || !addCCId) return;
                  addMappingMut.mutate({ sectionId: liveMappingTarget.id, ccId: addCCId, isDefault: addCCDefault });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            {(liveMappingTarget?.cost_centers?.length ?? 0) === 0 ? (
              <p className="text-muted-foreground italic">No cost centers mapped yet.</p>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left font-semibold p-2 w-20">Group</th>
                      <th className="text-left font-semibold p-2 w-32">Code</th>
                      <th className="text-left font-semibold p-2">Short Text</th>
                      <th className="text-left font-semibold p-2 w-24">Default</th>
                      <th className="text-left font-semibold p-2 w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(liveMappingTarget?.cost_centers ?? []).map((m: SectionCostCenterMapping) => (
                      <tr key={m.cost_center_id} className="border-b last:border-0">
                        <td className="p-2">{m.group_code}</td>
                        <td className="p-2">{m.cost_code}</td>
                        <td className="p-2">{m.short_text}</td>
                        <td className="p-2">
                          {m.is_default ? (
                            <Badge variant="success">Default</Badge>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Set as default"
                              aria-label="Set as default cost center"
                              disabled={setDefaultMut.isPending}
                              onClick={() => {
                                if (!liveMappingTarget) return;
                                setDefaultMut.mutate({ sectionId: liveMappingTarget.id, ccId: m.cost_center_id });
                              }}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                        <td className="p-2">
                          <DeleteIconButton
                            title="Remove mapping"
                            aria-label="Remove cost center mapping"
                            disabled={removeMappingMut.isPending}
                            onClick={() => {
                              if (!liveMappingTarget) return;
                              removeMappingMut.mutate({ sectionId: liveMappingTarget.id, ccId: m.cost_center_id });
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingTarget(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(disableTarget)}
        title="Disable section"
        description={disableTarget ? `Disable section "${disableTarget.section_name}"?` : ""}
        confirmText="Disable"
        destructive
        submitting={deleteMut.isPending}
        onCancel={() => setDisableTarget(null)}
        onConfirm={() => {
          if (!disableTarget) return;
          deleteMut.mutate(disableTarget.id, {
            onSuccess: () => setDisableTarget(null),
          });
        }}
      />
    </PageLayout>
  );
}
