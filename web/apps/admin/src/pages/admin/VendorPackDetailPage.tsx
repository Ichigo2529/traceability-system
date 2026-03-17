import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { formatApiError } from "../../lib/errors";
import { PageLayout } from "@traceability/ui";
import { useToast } from "../../hooks/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";
import { PartNumberMaster } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import {
  VendorPackDetail,
  getVendorPackDetails,
  createVendorPackDetail,
  updateVendorPackDetail,
  deleteVendorPackDetail,
} from "../../lib/inventory-api";

// ── Form schema ───────────────────────────────────────────

const schema = z.object({
  supplier_id: z.string().min(1, "Supplier is required"),
  part_number: z.string().min(1, "Part number is required"),
  component_name: z.string().optional(),
  supplier_part_number: z.string().optional(),
  default_pack_qty: z.coerce.number().int().positive("Must be positive").optional(),
  vendor_detail: z.string().optional(),
  qr_sample: z.string().optional(),
  parser_key: z.string().optional(),
});
type PackForm = z.infer<typeof schema>;

const DEFAULT_VALUES: PackForm = {
  supplier_id: "",
  part_number: "",
  component_name: "",
  supplier_part_number: "",
  default_pack_qty: undefined,
  vendor_detail: "",
  qr_sample: "",
  parser_key: "GENERIC",
};

// ── QR Copy button ────────────────────────────────────────

function QrCopyCell({ value }: { value: string | null | undefined }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="opacity-40">—</span>;
  return (
    <div className="flex items-center gap-2 max-w-[260px]">
      <span
        className="text-xs font-mono overflow-hidden text-ellipsis whitespace-nowrap flex-1 text-muted-foreground"
        title={value}
      >
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        title="Copy QR raw"
        aria-label="Copy QR raw"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <span className="text-green-600">✓</span> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────

export function VendorPackDetailPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VendorPackDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VendorPackDetail | null>(null);

  // ── Queries ──────────────────────────────────────────────

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["vendor-pack-detail-page"],
    queryFn: () => getVendorPackDetails(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => sdk.admin.getVendors(),
  });

  const { data: partNumbers = [] } = useQuery({
    queryKey: ["part-numbers"],
    queryFn: () => sdk.admin.getPartNumbers(),
  });

  const { data: parsers = [] } = useQuery({
    queryKey: ["vendor-pack-parsers"],
    queryFn: () => sdk.admin.getVendorPackParsers(),
  });

  // ── Form ─────────────────────────────────────────────────

  const form = useForm<PackForm>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["vendor-pack-detail-page"] });

  // ── Mutations ─────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (p: PackForm) =>
      createVendorPackDetail({
        supplier_id: p.supplier_id,
        part_number: p.part_number,
        component_name: p.component_name || undefined,
        supplier_part_number: p.supplier_part_number || undefined,
        default_pack_qty: p.default_pack_qty,
        vendor_detail: p.vendor_detail || undefined,
        qr_sample: p.qr_sample || undefined,
        parser_key: p.parser_key || "GENERIC",
      }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      form.reset(DEFAULT_VALUES);
      showToast("Vendor pack detail created");
    },
  });

  const updateMut = useMutation({
    mutationFn: (p: PackForm) =>
      updateVendorPackDetail(editing!.id, {
        supplier_id: p.supplier_id,
        part_number: p.part_number,
        component_name: p.component_name || undefined,
        supplier_part_number: p.supplier_part_number || undefined,
        default_pack_qty: p.default_pack_qty,
        vendor_detail: p.vendor_detail || undefined,
        qr_sample: p.qr_sample || undefined,
        parser_key: p.parser_key || "GENERIC",
      }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setEditing(null);
      showToast("Vendor pack detail updated");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteVendorPackDetail(id),
    onSuccess: () => {
      invalidate();
      showToast("Vendor pack detail deactivated");
    },
  });

  // ── Helpers ───────────────────────────────────────────────

  function openCreate() {
    setEditing(null);
    form.reset({
      ...DEFAULT_VALUES,
      supplier_id: (suppliers as any[])[0]?.id ?? "",
      parser_key: (parsers as any[])[0]?.key ?? "GENERIC",
    });
    createMut.reset();
    updateMut.reset();
    setOpen(true);
  }

  function openEdit(row: VendorPackDetail) {
    setEditing(row);
    form.reset({
      supplier_id: row.supplier_id,
      part_number: row.part_number,
      component_name: row.component_name ?? "",
      supplier_part_number: row.supplier_part_number ?? "",
      default_pack_qty: row.default_pack_qty ?? undefined,
      vendor_detail:
        typeof row.vendor_detail === "string"
          ? row.vendor_detail
          : row.vendor_detail
            ? JSON.stringify(row.vendor_detail)
            : "",
      qr_sample: row.qr_sample ?? "",
      parser_key: row.parser_key ?? "GENERIC",
    });
    createMut.reset();
    updateMut.reset();
    setOpen(true);
  }

  // ── Columns ───────────────────────────────────────────────

  const columns = useMemo<ColumnDef<VendorPackDetail>[]>(
    () => [
      {
        id: "component_name",
        header: "Component",
        accessorKey: "component_name",
        size: 150,
        cell: ({ row }) => row.original.component_name || "-",
      },
      { id: "part_number", header: "Part No.", accessorKey: "part_number", size: 130 },
      {
        id: "supplier",
        header: "Supplier",
        size: 140,
        cell: ({ row }) =>
          row.original.supplier_name
            ? `${row.original.supplier_code ?? ""} — ${row.original.supplier_name}`
            : row.original.supplier_id,
      },
      {
        id: "vendor_pn",
        header: "Vendor PN",
        size: 130,
        cell: ({ row }) => row.original.supplier_part_number || "-",
      },
      {
        header: "Pack Size",
        accessorKey: "default_pack_qty",
        size: 90,
        cell: ({ row }) => <span className="block text-right">{row.original.default_pack_qty ?? "-"}</span>,
      },
      {
        header: "Vendor Detail",
        cell: ({ row }) => {
          const d = row.original.vendor_detail;
          if (!d) return <span className="opacity-40">—</span>;
          const str = typeof d === "string" ? d : JSON.stringify(d);
          return (
            <span
              className="block max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap text-[0.8125rem]"
              title={str}
            >
              {str}
            </span>
          );
        },
      },
      {
        header: "QR Sample",
        size: 280,
        cell: ({ row }) => <QrCopyCell value={row.original.qr_sample} />,
      },
      {
        header: "Status",
        size: 90,
        cell: ({ row }) => <StatusBadge status={row.original.is_active ? "active" : "disabled"} />,
      },
      {
        id: "actions",
        header: "Actions",
        size: 100,
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Edit"
              aria-label="Edit vendor pack"
              onClick={() => openEdit(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Deactivate"
              aria-label="Deactivate vendor pack"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [suppliers]
  );

  // ── Render ────────────────────────────────────────────────

  return (
    <PageLayout
      title="Vendor Pack Detail"
      subtitle={
        <div className="flex items-center gap-2">
          <span className="indicator-live" />
          <span>Component / Part No. / Supplier / Pack Size / QR barcode profiles</span>
        </div>
      }
      icon="customer-and-contacts"
      iconColor="teal"
    >
      <div className="page-container">
        <DataTable
          data={rows}
          columns={columns}
          loading={isLoading}
          filterPlaceholder="Search component, part number, supplier..."
          actions={
            <Button className="button-hover-scale" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Profile
            </Button>
          }
        />
      </div>

      {/* ── Create / Edit Dialog ─────────────────────── */}
      <FormDialog
        open={open}
        title={editing ? `Edit Vendor Pack — ${editing.part_number}` : "Create Vendor Pack Detail"}
        submitText={editing ? "Update" : "Create"}
        submitting={createMut.isPending || updateMut.isPending}
        width="700px"
        onClose={() => {
          setOpen(false);
          setEditing(null);
          createMut.reset();
          updateMut.reset();
        }}
        onSubmit={form.handleSubmit((p) => (editing ? updateMut.mutate(p) : createMut.mutate(p)))}
      >
        {(createMut.isError || updateMut.isError) && (
          <Alert variant="destructive" className="mx-4 mb-4">
            <AlertDescription>{formatApiError(createMut.error ?? updateMut.error)}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Supplier *</Label>
            <Controller
              name="supplier_id"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value || ""} onValueChange={field.onChange}>
                  <SelectTrigger className={form.formState.errors.supplier_id ? "border-destructive" : ""}>
                    <SelectValue placeholder="-- Select --" />
                  </SelectTrigger>
                  <SelectContent>
                    {(suppliers as any[]).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code} — {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid gap-2">
            <Label>Part Number *</Label>
            <Controller
              name="part_number"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value || ""} onValueChange={field.onChange}>
                  <SelectTrigger className={form.formState.errors.part_number ? "border-destructive" : ""}>
                    <SelectValue placeholder="-- Select --" />
                  </SelectTrigger>
                  <SelectContent>
                    {(partNumbers as PartNumberMaster[]).map((pn) => (
                      <SelectItem key={pn.id} value={pn.part_number}>
                        {pn.part_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid gap-2">
            <Label>Component Name</Label>
            <Input
              value={form.watch("component_name") ?? ""}
              onChange={(e) => form.setValue("component_name", e.target.value)}
              placeholder="e.g. Marlin Magnet"
            />
          </div>
          <div className="grid gap-2">
            <Label>Vendor Part Number</Label>
            <Input
              value={form.watch("supplier_part_number") ?? ""}
              onChange={(e) => form.setValue("supplier_part_number", e.target.value)}
              placeholder="e.g. K4500659651"
            />
          </div>
          <div className="grid gap-2">
            <Label>Pack Size</Label>
            <Input
              type="number"
              value={form.watch("default_pack_qty")?.toString() ?? ""}
              onChange={(e) => form.setValue("default_pack_qty", e.target.value ? Number(e.target.value) : undefined)}
              placeholder="e.g. 640"
            />
          </div>
          <div className="grid gap-2">
            <Label>Parser Key</Label>
            <Controller
              name="parser_key"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value || "GENERIC"} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {((parsers as any[]).length > 0 ? parsers : [{ key: "GENERIC" }]).map((p: any) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Vendor Detail</Label>
            <Input
              value={form.watch("vendor_detail") ?? ""}
              onChange={(e) => form.setValue("vendor_detail", e.target.value)}
              placeholder="Address / description / notes"
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>QR Sample (Raw Barcode)</Label>
            <div className="flex items-center gap-2 w-full">
              <Input
                value={form.watch("qr_sample") ?? ""}
                onChange={(e) => form.setValue("qr_sample", e.target.value)}
                placeholder="*K...*3S...*P...*EA*Q...*V...*PD..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Copy QR raw"
                aria-label="Copy QR raw"
                onClick={async () => {
                  const v = form.getValues("qr_sample");
                  if (v) await navigator.clipboard.writeText(v);
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </FormDialog>

      {/* ── Deactivate Confirm ───────────────────────── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Deactivate vendor pack profile"
        description={
          deleteTarget
            ? `Deactivate profile for "${deleteTarget.component_name || deleteTarget.part_number}" / ${deleteTarget.supplier_name ?? deleteTarget.supplier_id}?`
            : ""
        }
        confirmText="Deactivate"
        destructive
        submitting={deleteMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMut.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />
    </PageLayout>
  );
}
