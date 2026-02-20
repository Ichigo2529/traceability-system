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
import {
  Button,
  Input,
  Label,
  DatePicker,
  Form,
  FormItem,
  Select,
  Option,
  FlexBox,
  FlexBoxAlignItems,
  MessageStrip,
  Text,
  Dialog,
  Bar,
} from "@ui5/webcomponents-react";
import { PartNumberMaster } from "@traceability/sdk";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/excel-attachment.js";
import "@ui5/webcomponents-icons/dist/document.js";
import "@ui5/webcomponents-icons/dist/information.js";
import { sdk } from "../../context/AuthContext";
import {
  InventoryDo,
  getInventoryDos,
  createInventoryDo,
  updateInventoryDo,
  deleteInventoryDo,
  importInventoryDoExcel,
  DoImportResult,
} from "../../lib/inventory-api";

// ── Form schema ───────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────

function netQty(row: InventoryDo) {
  return (row.qty_received ?? 0) - (row.reject_qty ?? 0);
}

// ── Import Result Dialog ──────────────────────────────────

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
    <Dialog
      open={open}
      headerText="Excel Import Result"
      onClose={onClose}
      style={{ width: "min(600px, 90vw)" }}
      footer={
        <Bar
          design="Footer"
          endContent={
            <Button design="Emphasized" onClick={onClose}>
              OK
            </Button>
          }
        />
      }
    >
      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Summary chips */}
        <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0.5rem 1rem", borderRadius: "0.5rem", background: "var(--sapPositiveBackground)", minWidth: "80px" }}>
            <Text style={{ fontWeight: "700", fontSize: "1.5rem", color: "var(--sapPositiveColor)" }}>{result.inserted}</Text>
            <Text style={{ fontSize: "0.75rem", color: "var(--sapPositiveColor)" }}>Inserted</Text>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0.5rem 1rem", borderRadius: "0.5rem", background: "var(--sapInformativeBackground)", minWidth: "80px" }}>
            <Text style={{ fontWeight: "700", fontSize: "1.5rem", color: "var(--sapInformativeColor)" }}>{result.updated}</Text>
            <Text style={{ fontSize: "0.75rem", color: "var(--sapInformativeColor)" }}>Updated</Text>
          </div>
          {result.failed > 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0.5rem 1rem", borderRadius: "0.5rem", background: "var(--sapNegativeBackground)", minWidth: "80px" }}>
              <Text style={{ fontWeight: "700", fontSize: "1.5rem", color: "var(--sapNegativeColor)" }}>{result.failed}</Text>
              <Text style={{ fontSize: "0.75rem", color: "var(--sapNegativeColor)" }}>Failed</Text>
            </div>
          )}
        </FlexBox>

        {/* Row errors */}
        {result.errors.length > 0 && (
          <div>
            <Label style={{ fontWeight: "600", marginBottom: "0.5rem", display: "block" }}>
              Row Errors ({result.errors.length})
            </Label>
            <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid var(--sapList_BorderColor)", borderRadius: "0.25rem" }}>
              {result.errors.map((e, i) => (
                <div
                  key={i}
                  style={{
                    padding: "0.35rem 0.75rem",
                    display: "flex",
                    gap: "0.75rem",
                    borderBottom: i < result.errors.length - 1 ? "1px solid var(--sapList_BorderColor)" : undefined,
                    fontSize: "0.8125rem",
                  }}
                >
                  <Text style={{ fontWeight: "600", color: "var(--sapNegativeColor)", minWidth: "50px" }}>
                    Row {e.row_no}
                  </Text>
                  <Text style={{ color: "var(--sapTextColor)" }}>{e.message}</Text>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

// ── Component ─────────────────────────────────────────────

export function InventoryDoPage() {
  const queryClient = useQueryClient();
  const { showToast, ToastComponent } = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryDo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryDo | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<DoImportResult | null>(null);
  const [importResultOpen, setImportResultOpen] = useState(false);

  // ── Queries ──────────────────────────────────────────────

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

  // ── Form ─────────────────────────────────────────────────

  const form = useForm<DoForm>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["inventory-do-page"] });

  // ── Mutations ─────────────────────────────────────────────

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

  // ── Helpers ───────────────────────────────────────────────

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

  // ── Columns ───────────────────────────────────────────────

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
      {
        header: "Description",
        cell: ({ row }) => row.original.description || "-",
      },
      {
        header: "Lot No.",
        accessorKey: "lot_number",
        size: 120,
        cell: ({ row }) => row.original.lot_number || "-",
      },
      {
        header: "GR No.",
        accessorKey: "gr_number",
        size: 110,
        cell: ({ row }) => row.original.gr_number || "-",
      },
      {
        header: "Rcvd Qty",
        accessorKey: "qty_received",
        size: 85,
        cell: ({ row }) => (
          <Text style={{ textAlign: "right", display: "block" }}>{row.original.qty_received}</Text>
        ),
      },
      {
        header: "Issued",
        accessorKey: "qty_issued",
        size: 75,
        cell: ({ row }) => (
          <Text style={{ textAlign: "right", display: "block" }}>{row.original.qty_issued}</Text>
        ),
      },
      {
        header: "Reject",
        accessorKey: "reject_qty",
        size: 75,
        cell: ({ row }) => {
          const rq = row.original.reject_qty ?? 0;
          return (
            <Text
              style={{
                textAlign: "right",
                display: "block",
                color: rq > 0 ? "var(--sapNegativeColor)" : undefined,
              }}
            >
              {rq}
            </Text>
          );
        },
      },
      {
        header: "Net",
        size: 75,
        cell: ({ row }) => {
          const net = netQty(row.original);
          return (
            <Text style={{ textAlign: "right", display: "block", fontWeight: "600" }}>
              {net}
            </Text>
          );
        },
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
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              icon="edit"
              design="Transparent"
              tooltip="Edit"
              aria-label="Edit DO"
              onClick={() => openEdit(row.original)}
            />
            <Button
              icon="delete"
              design="Transparent"
              tooltip="Delete"
              aria-label="Delete DO"
              onClick={() => setDeleteTarget(row.original)}
            />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Render ────────────────────────────────────────────────

  return (
    <PageLayout
      title="Delivery Orders"
      subtitle={
        <FlexBox alignItems={FlexBoxAlignItems.Center}>
          <span className="indicator-live" />
          <span>Manage incoming Delivery Orders (DO) — must be entered before material issuing</span>
        </FlexBox>
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
            <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importMut.mutate(file);
                }}
              />
              <Button
                icon="excel-attachment"
                design="Default"
                className="button-hover-scale"
                disabled={importMut.isPending}
                onClick={() => fileInputRef.current?.click()}
                tooltip="Import from Excel (.xlsx) — columns: DO. No., Part No., Description, Vendor, Lot No., Receive Date, Quantity, GR"
              >
                {importMut.isPending ? "Importing..." : "Import Excel"}
              </Button>
              <Button
                icon="add"
                design="Emphasized"
                className="button-hover-scale"
                onClick={openCreate}
              >
                Add DO
              </Button>
            </FlexBox>
          }
        />
      </div>

      {/* ── Create / Edit Dialog ─────────────────────── */}
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
          <MessageStrip design="Negative" hideCloseButton style={{ margin: "0 1rem" }}>
            {formatApiError(createMut.error ?? updateMut.error)}
          </MessageStrip>
        )}

        <Form layout="S2 M2 L2 XL2" labelSpan="S12 M12 L12 XL12">
          {/* Row 1: DO No + Supplier */}
          <FormItem labelContent={<Label required>DO Number</Label>}>
            <Input
              value={form.watch("do_number")}
              onInput={(e: any) => form.setValue("do_number", e.target.value)}
              valueState={form.formState.errors.do_number ? "Negative" : "None"}
              valueStateMessage={
                form.formState.errors.do_number && (
                  <div>{form.formState.errors.do_number.message}</div>
                )
              }
              placeholder="e.g. MB25051900"
            />
          </FormItem>

          <FormItem labelContent={<Label>Supplier (Vendor)</Label>}>
            <Controller
              name="supplier_id"
              control={form.control}
              render={({ field }) => (
                <Select
                  onChange={(e) =>
                    field.onChange(e.detail.selectedOption.getAttribute("data-value") ?? "")
                  }
                  style={{ width: "100%" }}
                >
                  <Option data-value="">-- None --</Option>
                  {(suppliers as any[]).map((s) => (
                    <Option key={s.id} data-value={s.id} selected={field.value === s.id}>
                      {s.code} — {s.name}
                    </Option>
                  ))}
                </Select>
              )}
            />
          </FormItem>

          {/* Row 2: Part No + Lot No */}
          <FormItem labelContent={<Label>Part Number</Label>}>
            <Controller
              name="part_number"
              control={form.control}
              render={({ field }) => (
                <Select
                  onChange={(e) =>
                    field.onChange(e.detail.selectedOption.getAttribute("data-value") ?? "")
                  }
                  style={{ width: "100%" }}
                >
                  <Option data-value="">-- Select or type --</Option>
                  {(partNumbers as PartNumberMaster[]).map((pn) => (
                    <Option
                      key={pn.id}
                      data-value={pn.part_number}
                      selected={field.value === pn.part_number}
                    >
                      {pn.part_number}
                      {(pn as any).description ? ` — ${(pn as any).description}` : ""}
                    </Option>
                  ))}
                </Select>
              )}
            />
          </FormItem>

          <FormItem labelContent={<Label>Lot Number</Label>}>
            <Input
              value={form.watch("lot_number") ?? ""}
              onInput={(e: any) => form.setValue("lot_number", e.target.value)}
              placeholder="e.g. 112"
            />
          </FormItem>

          {/* Row 3: GR No + Received Date */}
          <FormItem labelContent={<Label>GR Number</Label>}>
            <Input
              value={form.watch("gr_number") ?? ""}
              onInput={(e: any) => form.setValue("gr_number", e.target.value)}
              placeholder="e.g. 5001434805"
            />
          </FormItem>

          <FormItem labelContent={<Label>Received Date</Label>}>
            <Controller
              name="received_date"
              control={form.control}
              render={({ field }) => (
                <DatePicker
                  value={field.value ?? ""}
                  formatPattern="yyyy-MM-dd"
                  onChange={(e: any) => field.onChange(e.detail.value ?? "")}
                  style={{ width: "100%" }}
                />
              )}
            />
          </FormItem>

          {/* Row 4: Total Qty + Qty Received */}
          <FormItem labelContent={<Label>Total Qty</Label>}>
            <Input
              type="Number"
              value={form.watch("total_qty")?.toString() ?? ""}
              onInput={(e: any) => form.setValue("total_qty", Number(e.target.value))}
              placeholder="0"
            />
          </FormItem>

          <FormItem labelContent={<Label>Qty Received</Label>}>
            <Input
              type="Number"
              value={form.watch("qty_received")?.toString() ?? ""}
              onInput={(e: any) => form.setValue("qty_received", Number(e.target.value))}
              placeholder="0"
            />
          </FormItem>

          {/* Row 5: Reject Qty + Description */}
          <FormItem labelContent={<Label>Reject Qty</Label>}>
            <Input
              type="Number"
              value={form.watch("reject_qty")?.toString() ?? "0"}
              onInput={(e: any) => form.setValue("reject_qty", Number(e.target.value))}
              placeholder="0"
            />
          </FormItem>

          <FormItem labelContent={<Label>Description</Label>}>
            <Input
              value={form.watch("description") ?? ""}
              onInput={(e: any) => form.setValue("description", e.target.value)}
              placeholder="e.g. Marlin Magnet"
            />
          </FormItem>
        </Form>
      </FormDialog>

      {/* ── Delete Confirm ───────────────────────────── */}
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
          deleteMut.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />

      {/* ── Import Result ────────────────────────────── */}
      <ImportResultDialog
        open={importResultOpen}
        result={importResult}
        onClose={() => setImportResultOpen(false)}
      />

      <ToastComponent />
    </PageLayout>
  );
}
