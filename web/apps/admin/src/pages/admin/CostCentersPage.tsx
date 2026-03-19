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
import {
  AdminCostCenter,
  getCostCenters,
  createCostCenter,
  updateCostCenter,
  deleteCostCenter,
  getSections,
} from "../../lib/section-api";
import { Button } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Pencil } from "lucide-react";

const GROUP_CODES = ["DL", "IDL", "DIS", "ADM"] as const;
const SELECT_NONE = "__none__";

const schema = z.object({
  group_code: z.enum(GROUP_CODES),
  cost_code: z.string().min(1, "Required"),
  short_text: z.string().min(1, "Required"),
  section_id: z.string().optional(),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
});
type CostCenterForm = z.infer<typeof schema>;

export function CostCentersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCostCenter | null>(null);
  const [disableTarget, setDisableTarget] = useState<AdminCostCenter | null>(null);
  const { showToast } = useToast();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-cost-centers"],
    queryFn: getCostCenters,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["admin-sections"],
    queryFn: getSections,
  });

  const form = useForm<CostCenterForm>({
    resolver: zodResolver(schema),
    defaultValues: { group_code: "DL", cost_code: "", short_text: "", is_default: false, is_active: true },
  });

  const createMut = useMutation({
    mutationFn: (p: CostCenterForm) => createCostCenter(p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cost-centers"] });
      setOpen(false);
      form.reset({ group_code: "DL", cost_code: "", short_text: "", is_default: false, is_active: true });
      showToast("Cost center created");
    },
  });

  const updateMut = useMutation({
    mutationFn: (p: CostCenterForm) => updateCostCenter(editing!.id, p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cost-centers"] });
      setOpen(false);
      setEditing(null);
      showToast("Cost center updated");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCostCenter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cost-centers"] });
      showToast("Cost center disabled");
    },
  });

  const columns = useMemo<ColumnDef<AdminCostCenter>[]>(
    () => [
      { id: "group", header: "Group", accessorKey: "group_code", size: 90 },
      { id: "cost_code", header: "Cost Code", accessorKey: "cost_code", size: 160 },
      { id: "short_text", header: "Short Text", accessorKey: "short_text" },
      {
        id: "section",
        header: "Section",
        cell: ({ row }) =>
          sections.find((s: { id: string; section_name: string }) => s.id === row.original.section_id)?.section_name ??
          "-",
      },
      { id: "default", header: "Default", cell: ({ row }) => (row.original.is_default ? "Yes" : "No") },
      {
        id: "status",
        header: "Status",
        size: 100,
        cell: ({ row }) => <StatusBadge status={row.original.is_active ? "active" : "disabled"} />,
      },
      {
        id: "actions",
        header: "Actions",
        size: 110,
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditing(row.original);
                form.reset({
                  group_code: row.original.group_code as CostCenterForm["group_code"],
                  cost_code: row.original.cost_code,
                  short_text: row.original.short_text,
                  section_id: row.original.section_id || undefined,
                  is_default: row.original.is_default,
                  is_active: row.original.is_active,
                });
                setOpen(true);
              }}
              title="Edit"
              aria-label="Edit cost center"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <DeleteIconButton
              onClick={() => setDisableTarget(row.original)}
              title="Disable"
              aria-label="Disable cost center"
            />
          </div>
        ),
      },
    ],
    [form, sections]
  );

  return (
    <PageLayout
      title="Cost Centers"
      subtitle={
        <div className="flex items-center gap-2">
          <span>Manage cost center codes by group</span>
        </div>
      }
      icon="money-bills"
      iconColor="green"
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
          filterPlaceholder="Search cost center code, group, or short text..."
          actions={
            <Button
              className="button-hover-scale"
              onClick={() => {
                setEditing(null);
                form.reset({ group_code: "DL", cost_code: "", short_text: "", is_default: false, is_active: true });
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Cost Center
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
        title={editing ? "Edit Cost Center" : "Create Cost Center"}
        onSubmit={form.handleSubmit((p) => (editing ? updateMut.mutate(p) : createMut.mutate(p)))}
        submitting={createMut.isPending || updateMut.isPending}
      >
        <div className="grid gap-4">
          {(createMut.isError || updateMut.isError) && (
            <Alert variant="destructive">
              <AlertDescription>{formatApiError(createMut.error ?? updateMut.error)}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-2">
            <Label>Group Code *</Label>
            <Controller
              name="group_code"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v as CostCenterForm["group_code"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUP_CODES.map((gc) => (
                      <SelectItem key={gc} value={gc}>
                        {gc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cc-cost_code">Cost Code *</Label>
            <Input
              id="cc-cost_code"
              value={form.watch("cost_code")}
              onChange={(e) => form.setValue("cost_code", e.target.value)}
              className={form.formState.errors.cost_code ? "border-destructive" : ""}
            />
            {form.formState.errors.cost_code && (
              <p className="text-sm text-destructive">{form.formState.errors.cost_code.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cc-short_text">Short Text *</Label>
            <Input
              id="cc-short_text"
              value={form.watch("short_text")}
              onChange={(e) => form.setValue("short_text", e.target.value)}
              className={form.formState.errors.short_text ? "border-destructive" : ""}
            />
            {form.formState.errors.short_text && (
              <p className="text-sm text-destructive">{form.formState.errors.short_text.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Section</Label>
            <Controller
              name="section_id"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value || SELECT_NONE}
                  onValueChange={(v) => field.onChange(v === SELECT_NONE ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>None</SelectItem>
                    {sections.map((s: { id: string; section_name: string }) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.section_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex items-center gap-2">
            <Controller
              name="is_default"
              control={form.control}
              render={({ field }) => (
                <Checkbox id="cc-default" checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
              )}
            />
            <Label htmlFor="cc-default" className="cursor-pointer">
              Default for Section
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Controller
              name="is_active"
              control={form.control}
              render={({ field }) => (
                <Checkbox id="cc-active" checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
              )}
            />
            <Label htmlFor="cc-active" className="cursor-pointer">
              Active
            </Label>
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(disableTarget)}
        title="Disable cost center"
        description={
          disableTarget ? `Disable cost center "${disableTarget.cost_code} - ${disableTarget.short_text}"?` : ""
        }
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
