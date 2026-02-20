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
import {
  Button,
  Input,
  Label,
  Form,
  FormItem,
  Select,
  Option,
  FlexBox,
  FlexBoxAlignItems,
  MessageStrip,
  Text,
} from "@ui5/webcomponents-react";
import { PartNumberMaster } from "@traceability/sdk";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/copy.js";
import "@ui5/webcomponents-icons/dist/customer-and-contacts.js";
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
  if (!value) return <Text style={{ opacity: 0.4 }}>—</Text>;
  return (
    <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem", maxWidth: "260px" }}>
      <Text
        style={{
          fontSize: "0.75rem",
          fontFamily: "monospace",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          color: "var(--sapContent_LabelColor)",
        }}
        title={value}
      >
        {value}
      </Text>
      <Button
        icon="copy"
        design="Transparent"
        tooltip="Copy QR raw"
        aria-label="Copy QR raw"
        style={{ flexShrink: 0 }}
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "✓" : ""}
      </Button>
    </FlexBox>
  );
}

// ── Component ─────────────────────────────────────────────

export function VendorPackDetailPage() {
  const queryClient = useQueryClient();
  const { showToast, ToastComponent } = useToast();

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

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["vendor-pack-detail-page"] });

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
      vendor_detail: typeof row.vendor_detail === "string" ? row.vendor_detail : row.vendor_detail ? JSON.stringify(row.vendor_detail) : "",
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
        header: "Component",
        accessorKey: "component_name",
        size: 150,
        cell: ({ row }) => row.original.component_name || "-",
      },
      { header: "Part No.", accessorKey: "part_number", size: 130 },
      {
        header: "Supplier",
        size: 140,
        cell: ({ row }) =>
          row.original.supplier_name
            ? `${row.original.supplier_code ?? ""} — ${row.original.supplier_name}`
            : row.original.supplier_id,
      },
      {
        header: "Vendor PN",
        size: 130,
        cell: ({ row }) => row.original.supplier_part_number || "-",
      },
      {
        header: "Pack Size",
        accessorKey: "default_pack_qty",
        size: 90,
        cell: ({ row }) => (
          <Text style={{ textAlign: "right", display: "block" }}>
            {row.original.default_pack_qty ?? "-"}
          </Text>
        ),
      },
      {
        header: "Vendor Detail",
        cell: ({ row }) => {
          const d = row.original.vendor_detail;
          if (!d) return <Text style={{ opacity: 0.4 }}>—</Text>;
          const str = typeof d === "string" ? d : JSON.stringify(d);
          return (
            <Text
              style={{
                maxWidth: "200px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "block",
                fontSize: "0.8125rem",
              }}
              title={str}
            >
              {str}
            </Text>
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
        cell: ({ row }) => (
          <StatusBadge status={row.original.is_active ? "active" : "disabled"} />
        ),
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
              aria-label="Edit vendor pack"
              onClick={() => openEdit(row.original)}
            />
            <Button
              icon="delete"
              design="Transparent"
              tooltip="Deactivate"
              aria-label="Deactivate vendor pack"
              onClick={() => setDeleteTarget(row.original)}
            />
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
        <FlexBox alignItems={FlexBoxAlignItems.Center}>
          <span className="indicator-live" />
          <span>Component / Part No. / Supplier / Pack Size / QR barcode profiles</span>
        </FlexBox>
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
            <Button
              icon="add"
              design="Emphasized"
              className="button-hover-scale"
              onClick={openCreate}
            >
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
        onSubmit={form.handleSubmit((p) =>
          editing ? updateMut.mutate(p) : createMut.mutate(p)
        )}
      >
        {(createMut.isError || updateMut.isError) && (
          <MessageStrip design="Negative" hideCloseButton style={{ margin: "0 1rem" }}>
            {formatApiError(createMut.error ?? updateMut.error)}
          </MessageStrip>
        )}

        <Form layout="S2 M2 L2 XL2" labelSpan="S12 M12 L12 XL12">
          {/* Row 1: Supplier + Part No */}
          <FormItem labelContent={<Label required>Supplier</Label>}>
            <Controller
              name="supplier_id"
              control={form.control}
              render={({ field }) => (
                <Select
                  onChange={(e) =>
                    field.onChange(e.detail.selectedOption.getAttribute("data-value") ?? "")
                  }
                  valueState={form.formState.errors.supplier_id ? "Negative" : "None"}
                  style={{ width: "100%" }}
                >
                  <Option data-value="">-- Select --</Option>
                  {(suppliers as any[]).map((s) => (
                    <Option key={s.id} data-value={s.id} selected={field.value === s.id}>
                      {s.code} — {s.name}
                    </Option>
                  ))}
                </Select>
              )}
            />
          </FormItem>

          <FormItem labelContent={<Label required>Part Number</Label>}>
            <Controller
              name="part_number"
              control={form.control}
              render={({ field }) => (
                <Select
                  onChange={(e) =>
                    field.onChange(e.detail.selectedOption.getAttribute("data-value") ?? "")
                  }
                  valueState={form.formState.errors.part_number ? "Negative" : "None"}
                  style={{ width: "100%" }}
                >
                  <Option data-value="">-- Select --</Option>
                  {(partNumbers as PartNumberMaster[]).map((pn) => (
                    <Option
                      key={pn.id}
                      data-value={pn.part_number}
                      selected={field.value === pn.part_number}
                    >
                      {pn.part_number}
                    </Option>
                  ))}
                </Select>
              )}
            />
          </FormItem>

          {/* Row 2: Component Name + Vendor Part No */}
          <FormItem labelContent={<Label>Component Name</Label>}>
            <Input
              value={form.watch("component_name") ?? ""}
              onInput={(e: any) => form.setValue("component_name", e.target.value)}
              placeholder="e.g. Marlin Magnet"
            />
          </FormItem>

          <FormItem labelContent={<Label>Vendor Part Number</Label>}>
            <Input
              value={form.watch("supplier_part_number") ?? ""}
              onInput={(e: any) => form.setValue("supplier_part_number", e.target.value)}
              placeholder="e.g. K4500659651"
            />
          </FormItem>

          {/* Row 3: Pack Size + Parser */}
          <FormItem labelContent={<Label>Pack Size</Label>}>
            <Input
              type="Number"
              value={form.watch("default_pack_qty")?.toString() ?? ""}
              onInput={(e: any) => form.setValue("default_pack_qty", Number(e.target.value))}
              placeholder="e.g. 640"
            />
          </FormItem>

          <FormItem labelContent={<Label>Parser Key</Label>}>
            <Controller
              name="parser_key"
              control={form.control}
              render={({ field }) => (
                <Select
                  onChange={(e) =>
                    field.onChange(e.detail.selectedOption.getAttribute("data-value") ?? "GENERIC")
                  }
                  style={{ width: "100%" }}
                >
                  {((parsers as any[]).length > 0 ? parsers : [{ key: "GENERIC" }]).map(
                    (p: any) => (
                      <Option
                        key={p.key}
                        data-value={p.key}
                        selected={field.value === p.key}
                      >
                        {p.key}
                      </Option>
                    )
                  )}
                </Select>
              )}
            />
          </FormItem>

          {/* Row 4: Vendor Detail (full row) */}
          <FormItem labelContent={<Label>Vendor Detail</Label>}>
            <Input
              value={form.watch("vendor_detail") ?? ""}
              onInput={(e: any) => form.setValue("vendor_detail", e.target.value)}
              placeholder="Address / description / notes"
              style={{ width: "100%" }}
            />
          </FormItem>

          {/* Row 5: QR Sample (full row) */}
          <FormItem labelContent={<Label>QR Sample (Raw Barcode)</Label>}>
            <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem", width: "100%" }}>
              <Input
                value={form.watch("qr_sample") ?? ""}
                onInput={(e: any) => form.setValue("qr_sample", e.target.value)}
                placeholder="*K...*3S...*P...*EA*Q...*V...*PD..."
                style={{ flex: 1 }}
              />
              <Button
                icon="copy"
                design="Transparent"
                tooltip="Copy QR raw"
                aria-label="Copy QR raw"
                onClick={async () => {
                  const v = form.getValues("qr_sample");
                  if (v) await navigator.clipboard.writeText(v);
                }}
              />
            </FlexBox>
          </FormItem>
        </Form>
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

      <ToastComponent />
    </PageLayout>
  );
}
