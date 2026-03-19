import { useRef, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { formatApiError } from "../../lib/errors";
import { PageLayout } from "@traceability/ui";
import { useToast } from "../../hooks/useToast";
import { Button } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileSpreadsheet, Plus, History, Pencil } from "lucide-react";
import { PartNumberMaster } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import {
  InventoryDo,
  getInventoryDos,
  createInventoryDo,
  updateInventoryDo,
  deleteInventoryDo,
  importInventoryDoExcel,
  DoImportResult,
  getDoIssueHistory,
  DoIssueHistoryRow,
} from "../../lib/inventory-api";

const SELECT_NONE = "__none__";

const schema = z.object({
  do_number: z.string().min(1, "Required"),
  supplier_id: z.string().optional(),
  part_number: z.string().optional(),
  description: z.string().optional(),
  lot_number: z.string().optional(),
  gr_number: z.string().optional(),
  total_qty: z.coerce.number().int().min(0).optional(),
  qty_received: z.coerce.number().int().min(0).optional(),
  reject_qty: z.coerce.number().int().min(0).optional(),
  received_date: z.string().optional(),
});
type DoForm = z.infer<typeof schema>;

const DEFAULT_VALUES: DoForm = {
  do_number: "",
  supplier_id: "",
  part_number: "",
  description: "",
  lot_number: "",
  gr_number: "",
  total_qty: undefined,
  qty_received: undefined,
  reject_qty: 0,
  received_date: "",
};

function netQty(row: InventoryDo) {
  return (row.qty_received ?? 0) - (row.reject_qty ?? 0);
}

function ImportResultDialog({
  open,
  result,
  onClose,
}: {
  open: boolean;
  result: DoImportResult | null;
  onClose: () => void;
}) {
  if (!result) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[min(600px,90vw)]">
        <DialogHeader>
          <DialogTitle>Excel Import Result</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex flex-col items-center rounded-lg bg-green-50 dark:bg-green-900/20 min-w-[80px] p-3">
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">{result.inserted}</span>
              <span className="text-xs text-green-600 dark:text-green-400">Inserted</span>
            </div>
            <div className="flex flex-col items-center rounded-lg bg-blue-50 dark:bg-blue-900/20 min-w-[80px] p-3">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{result.updated}</span>
              <span className="text-xs text-blue-600 dark:text-blue-400">Updated</span>
            </div>
            {result.failed > 0 && (
              <div className="flex flex-col items-center rounded-lg bg-destructive/10 min-w-[80px] p-3">
                <span className="text-2xl font-bold text-destructive">{result.failed}</span>
                <span className="text-xs text-destructive">Failed</span>
              </div>
            )}
          </div>
          {result.errors.length > 0 && (
            <div>
              <Label className="font-semibold block mb-2">Row Errors ({result.errors.length})</Label>
              <div className="max-h-[200px] overflow-y-auto border rounded-md">
                {result.errors.map((e, i) => (
                  <div key={i} className="flex gap-3 px-3 py-2 text-sm border-b last:border-b-0">
                    <span className="font-semibold text-destructive min-w-[50px]">Row {e.row_no}</span>
                    <span>{e.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DoIssueHistoryDialog({
  open,
  doRow,
  onClose,
}: {
  open: boolean;
  doRow: InventoryDo | null;
  onClose: () => void;
}) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["do-issue-history", doRow?.id],
    queryFn: () => getDoIssueHistory(doRow!.id),
    enabled: !!doRow?.id && open,
  });

  const columns = useMemo<ColumnDef<DoIssueHistoryRow>[]>(
    () => [
      { header: "MR No.", accessorKey: "request_no", size: 140 },
      { header: "Part Number", accessorKey: "part_number", size: 140 },
      {
        header: "Issue Date",
        accessorKey: "issued_at",
        size: 160,
        cell: ({ row }) => (row.original.issued_at ? new Date(row.original.issued_at).toLocaleString() : "-"),
      },
      {
        header: "Qty",
        accessorKey: "issued_qty",
        size: 100,
        cell: ({ row }) => <span className="text-right block font-bold">{row.original.issued_qty}</span>,
      },
      { header: "Remarks", accessorKey: "remarks" },
    ],
    []
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[min(800px,90vw)]">
        <DialogHeader>
          <DialogTitle>Issue History — {doRow?.do_number ?? ""}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <DataTable data={history} columns={columns} loading={isLoading} />
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InventoryDoPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryDo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryDo | null>(null);
  const [historyTarget, setHistoryTarget] = useState<InventoryDo | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<DoImportResult | null>(null);
  const [importResultOpen, setImportResultOpen] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["inventory-do-page"],
    queryFn: () => getInventoryDos(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => sdk.admin.getVendors(),
  });

  const { data: partNumbers = [] } = useQuery({
    queryKey: ["part-numbers"],
    queryFn: () => sdk.admin.getPartNumbers(),
  });

  const form = useForm<DoForm>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["inventory-do-page"] });

  const createMut = useMutation({
    mutationFn: (p: DoForm) =>
      createInventoryDo({
        do_number: p.do_number,
        supplier_id: p.supplier_id || undefined,
        part_number: p.part_number || undefined,
        description: p.description || undefined,
        lot_number: p.lot_number || undefined,
        gr_number: p.gr_number || undefined,
        total_qty: p.total_qty,
        qty_received: p.qty_received,
        reject_qty: p.reject_qty,
        received_date: p.received_date || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      form.reset(DEFAULT_VALUES);
      showToast("DO record created");
    },
  });

  const updateMut = useMutation({
    mutationFn: (p: DoForm) =>
      updateInventoryDo(editing!.id, {
        do_number: p.do_number,
        supplier_id: p.supplier_id || undefined,
        part_number: p.part_number || undefined,
        description: p.description || undefined,
        lot_number: p.lot_number || undefined,
        gr_number: p.gr_number || undefined,
        total_qty: p.total_qty,
        qty_received: p.qty_received,
        reject_qty: p.reject_qty,
        received_date: p.received_date || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setEditing(null);
      showToast("DO record updated");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteInventoryDo(id),
    onSuccess: () => {
      invalidate();
      showToast("DO record deleted");
    },
  });

  const importMut = useMutation({
    mutationFn: (file: File) => importInventoryDoExcel(file),
    onSuccess: (result) => {
      invalidate();
      setImportResult(result);
      setImportResultOpen(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err) => {
      showToast(`Import failed: ${formatApiError(err)}`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  function openCreate() {
    setEditing(null);
    form.reset(DEFAULT_VALUES);
    createMut.reset();
    updateMut.reset();
    setOpen(true);
  }

  function openEdit(row: InventoryDo) {
    setEditing(row);
    form.reset({
      do_number: row.do_number,
      supplier_id: row.supplier_id ?? "",
      part_number: row.part_number ?? "",
      description: row.description ?? "",
      lot_number: row.lot_number ?? "",
      gr_number: row.gr_number ?? "",
      total_qty: row.total_qty ?? undefined,
      qty_received: row.qty_received,
      reject_qty: row.reject_qty ?? 0,
      received_date: row.received_date ?? "",
    });
    createMut.reset();
    updateMut.reset();
    setOpen(true);
  }

  const columns = useMemo<ColumnDef<InventoryDo>[]>(
    () => [
      { header: "DO No.", accessorKey: "do_number", size: 140 },
      {
        header: "Supplier",
        size: 150,
        cell: ({ row }) => row.original.supplier_name || row.original.supplier || "-",
      },
      {
        header: "Part No.",
        accessorKey: "part_number",
        size: 130,
        cell: ({ row }) => row.original.part_number || "-",
      },
      { header: "Description", cell: ({ row }) => row.original.description || "-" },
      { header: "Lot No.", accessorKey: "lot_number", size: 120, cell: ({ row }) => row.original.lot_number || "-" },
      { header: "GR No.", accessorKey: "gr_number", size: 110, cell: ({ row }) => row.original.gr_number || "-" },
      {
        header: "Rcvd Qty",
        accessorKey: "qty_received",
        size: 85,
        cell: ({ row }) => <span className="block text-right">{row.original.qty_received}</span>,
      },
      {
        header: "Issued",
        accessorKey: "qty_issued",
        size: 75,
        cell: ({ row }) => <span className="block text-right">{row.original.qty_issued}</span>,
      },
      {
        header: "Reject",
        accessorKey: "reject_qty",
        size: 75,
        cell: ({ row }) => {
          const rq = row.original.reject_qty ?? 0;
          return <span className={`block text-right ${rq > 0 ? "text-destructive" : ""}`}>{rq}</span>;
        },
      },
      {
        header: "Net",
        size: 75,
        cell: ({ row }) => <span className="block text-right font-semibold">{netQty(row.original)}</span>,
      },
      {
        header: "Received Date",
        accessorKey: "received_date",
        size: 120,
        cell: ({ row }) => row.original.received_date ?? "-",
      },
      {
        header: "Actions",
        size: 100,
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              title="Issue History"
              aria-label="View Issue History"
              onClick={() => setHistoryTarget(row.original)}
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Edit"
              aria-label="Edit DO"
              onClick={() => openEdit(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <DeleteIconButton title="Delete DO" aria-label="Delete DO" onClick={() => setDeleteTarget(row.original)} />
          </div>
        ),
      },
    ],
    []
  );

  return (
    <PageLayout
      title="Delivery Orders"
      subtitle={
        <div className="flex items-center gap-2">
          <span>Manage incoming Delivery Orders (DO) — must be entered before material issuing</span>
        </div>
      }
      icon="document"
      iconColor="blue"
    >
      <div className="page-container">
        <DataTable
          data={rows}
          columns={columns}
          loading={isLoading}
          filterPlaceholder="Search DO number, part number, supplier, lot..."
          actions={
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importMut.mutate(file);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={importMut.isPending}
                onClick={() => fileInputRef.current?.click()}
                title="Import from Excel (.xlsx) — columns: DO. No., Part No., Description, Vendor, Lot No., Receive Date, Quantity, GR"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {importMut.isPending ? "Importing..." : "Import Excel"}
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add DO
              </Button>
            </div>
          }
        />
      </div>

      <FormDialog
        open={open}
        title={editing ? `Edit DO — ${editing.do_number}` : "Create Delivery Order"}
        submitText={editing ? "Update" : "Create"}
        submitting={createMut.isPending || updateMut.isPending}
        width="680px"
        onClose={() => {
          setOpen(false);
          setEditing(null);
          createMut.reset();
          updateMut.reset();
        }}
        onSubmit={form.handleSubmit((p) => (editing ? updateMut.mutate(p) : createMut.mutate(p)))}
      >
        {(createMut.isError || updateMut.isError) && (
          <Alert variant="destructive" className="mx-4">
            <AlertDescription>{formatApiError(createMut.error ?? updateMut.error)}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>DO Number *</Label>
            <Input
              {...form.register("do_number")}
              placeholder="e.g. MB25051900"
              className={form.formState.errors.do_number ? "border-destructive" : ""}
            />
            {form.formState.errors.do_number && (
              <p className="text-sm text-destructive">{form.formState.errors.do_number.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Supplier (Vendor)</Label>
            <Controller
              name="supplier_id"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value || SELECT_NONE}
                  onValueChange={(v) => field.onChange(v === SELECT_NONE ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="-- None --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>-- None --</SelectItem>
                    {(suppliers as { id: string; code: string; name: string }[]).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code} — {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Part Number</Label>
            <Controller
              name="part_number"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value || SELECT_NONE}
                  onValueChange={(v) => field.onChange(v === SELECT_NONE ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="-- Select or type --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>-- Select or type --</SelectItem>
                    {(partNumbers as PartNumberMaster[]).map((pn) => (
                      <SelectItem key={pn.id} value={pn.part_number}>
                        {pn.part_number}
                        {(pn as { description?: string }).description
                          ? ` — ${(pn as { description?: string }).description}`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Lot Number</Label>
            <Input {...form.register("lot_number")} placeholder="e.g. 112" />
          </div>
          <div className="space-y-2">
            <Label>GR Number</Label>
            <Input {...form.register("gr_number")} placeholder="e.g. 5001434805" />
          </div>
          <div className="space-y-2">
            <Label>Received Date</Label>
            <Controller
              name="received_date"
              control={form.control}
              render={({ field }) => (
                <Input type="date" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)} />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Total Qty</Label>
            <Input type="number" {...form.register("total_qty", { valueAsNumber: true })} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Qty Received</Label>
            <Input type="number" {...form.register("qty_received", { valueAsNumber: true })} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Reject Qty</Label>
            <Input type="number" {...form.register("reject_qty", { valueAsNumber: true })} placeholder="0" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Description</Label>
            <Input {...form.register("description")} placeholder="e.g. Marlin Magnet" />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete DO record"
        description={
          deleteTarget
            ? `Permanently delete DO "${deleteTarget.do_number}"${deleteTarget.part_number ? ` / ${deleteTarget.part_number}` : ""}? This cannot be undone.`
            : ""
        }
        confirmText="Delete"
        destructive
        submitting={deleteMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMut.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
      />

      <DoIssueHistoryDialog
        open={Boolean(historyTarget)}
        doRow={historyTarget}
        onClose={() => setHistoryTarget(null)}
      />

      <ImportResultDialog open={importResultOpen} result={importResult} onClose={() => setImportResultOpen(false)} />
    </PageLayout>
  );
}
