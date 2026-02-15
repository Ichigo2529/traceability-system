import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { InventoryDoRecord, PartNumberMaster, SupplierPackParserInfo, SupplierPackRecord, SupplierPartProfile } from "@traceability/sdk";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { sdk } from "../../context/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { Button } from "../../components/ui/button";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

const schema = z.object({
  vendor_id: z.string().min(1),
  do_number: z.string().optional(),
  parser_key: z.string().default("GENERIC"),
  pack_barcode_raw: z.string().min(1),
  part_number: z.string().optional(),
  vendor_part_number: z.string().optional(),
  vendor_lot: z.string().optional(),
  pack_qty_total: z.coerce.number().int().positive(),
  production_date: z.string().optional(),
});
type InboundPackForm = z.infer<typeof schema>;

export function InboundPacksPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => sdk.admin.getVendors(),
  });
  const { data: dos = [] } = useQuery({
    queryKey: ["inventory-do"],
    queryFn: () => sdk.admin.getInventoryDoRecords(),
  });
  const { data: packs = [] } = useQuery({
    queryKey: ["vendor-packs"],
    queryFn: () => sdk.admin.getVendorPacks(),
  });
  const { data: partNumbers = [] } = useQuery({
    queryKey: ["part-numbers"],
    queryFn: () => sdk.admin.getPartNumbers(),
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["vendor-part-profiles"],
    queryFn: () => sdk.admin.getVendorPartProfiles(),
  });
  const { data: parsers = [] } = useQuery({
    queryKey: ["vendor-pack-parsers"],
    queryFn: () => sdk.admin.getVendorPackParsers(),
  });

  const form = useForm<InboundPackForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      vendor_id: "",
      do_number: "",
      parser_key: "GENERIC",
      pack_barcode_raw: "",
      part_number: "",
      vendor_part_number: "",
      vendor_lot: "",
      pack_qty_total: 1,
      production_date: "",
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async (values: InboundPackForm) => {
      await sdk.admin.receiveVendorPack({
        vendor_id: values.vendor_id,
        do_number: values.do_number || undefined,
        parser_key: values.parser_key || "GENERIC",
        pack_barcode_raw: values.pack_barcode_raw,
        part_number: values.part_number || undefined,
        vendor_part_number: values.vendor_part_number || undefined,
        vendor_lot: values.vendor_lot || undefined,
        pack_qty_total: values.pack_qty_total,
        production_date: values.production_date || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-packs"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-do"] });
      setOpen(false);
      form.reset({
        vendor_id: "",
        do_number: "",
        parser_key: "GENERIC",
        pack_barcode_raw: "",
        part_number: "",
        vendor_part_number: "",
        vendor_lot: "",
        pack_qty_total: 1,
        production_date: "",
      });
    },
  });

  const selectedVendorId = form.watch("vendor_id");
  const selectedPartNumber = form.watch("part_number");
  const selectedProfile = useMemo(
    () =>
      profiles.find(
        (p: SupplierPartProfile) =>
          (p.vendor_id ?? p.supplier_id) === selectedVendorId &&
          p.part_number === selectedPartNumber &&
          p.is_active
      ),
    [profiles, selectedPartNumber, selectedVendorId]
  );

  const vendorProfiles = useMemo(
    () =>
      profiles.filter(
        (p: SupplierPartProfile) =>
          (p.vendor_id ?? p.supplier_id) === selectedVendorId &&
          p.part_number === selectedPartNumber &&
          p.is_active
      ),
    [profiles, selectedPartNumber, selectedVendorId]
  );

  const doColumns = useMemo<ColumnDef<InventoryDoRecord>[]>(
    () => [
      { header: "DO Number", accessorKey: "do_number" },
      { header: "Vendor", cell: ({ row }) => row.original.vendor_name || row.original.supplier_name || "-" },
      { header: "Part Number", accessorKey: "part_number" },
      { header: "Qty Received", accessorKey: "qty_received" },
      { header: "Qty Issued", accessorKey: "qty_issued" },
    ],
    []
  );

  const packColumns = useMemo<ColumnDef<SupplierPackRecord>[]>(
    () => [
      { header: "Vendor", cell: ({ row }) => row.original.vendor_name || row.original.supplier_name || "-" },
      { header: "DO", accessorKey: "do_number" },
      { header: "Part Number", accessorKey: "part_number" },
      { header: "Lot", cell: ({ row }) => row.original.vendor_lot || row.original.supplier_lot || "-" },
      { header: "Pack Qty", accessorKey: "pack_qty_total" },
      { header: "Remaining", accessorKey: "pack_qty_remaining" },
      { header: "Raw 2D", accessorKey: "pack_barcode_raw" },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbound Packs"
        description="Receive vendor 2D packs and keep lot-level traceability."
        actions={
          <Button
            onClick={() => {
              form.reset({
                vendor_id: vendors[0]?.id || "",
                do_number: "",
                parser_key: "GENERIC",
                pack_barcode_raw: "",
                part_number: "",
                vendor_part_number: "",
                vendor_lot: "",
                pack_qty_total: 1,
                production_date: "",
              });
              setOpen(true);
            }}
            disabled={receiveMutation.isPending}
          >
            Receive Pack
          </Button>
        }
      />

      <ApiErrorBanner message={receiveMutation.error ? formatApiError(receiveMutation.error) : undefined} />

      <div className="rounded-lg border bg-white p-4">
        <h3 className="mb-2 font-semibold">Vendors ({vendors.length})</h3>
        <div className="text-sm text-gray-600">{vendors.map((s) => `${s.code}:${s.name}`).join(" | ") || "-"}</div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">Delivery Orders</h3>
        <DataTable data={dos} columns={doColumns} filterPlaceholder="Search DO..." />
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">Vendor Packs</h3>
        <DataTable data={packs} columns={packColumns} filterPlaceholder="Search pack..." />
      </div>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Receive Vendor Pack"
        description="Scan vendor 2D barcode and record lot/package information."
        onSubmit={form.handleSubmit((values) => receiveMutation.mutate(values))}
        submitting={receiveMutation.isPending}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Vendor</Label>
            <Select value={form.watch("vendor_id")} onValueChange={(v) => form.setValue("vendor_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>DO Number</Label>
            <Input {...form.register("do_number")} placeholder="D0001" />
          </div>
          <div className="space-y-2">
            <Label>Parser Key</Label>
            <Select value={form.watch("parser_key")} onValueChange={(v) => form.setValue("parser_key", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select parser" />
              </SelectTrigger>
              <SelectContent>
                {parsers.map((p: SupplierPackParserInfo) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Part Number</Label>
            <Select
              value={form.watch("part_number") || "NONE"}
              onValueChange={(v) => {
                form.setValue("part_number", v === "NONE" ? "" : v);
                const nextProfile = profiles.find(
                  (p: SupplierPartProfile) =>
                    (p.vendor_id ?? p.supplier_id) === form.getValues("vendor_id") &&
                    p.part_number === (v === "NONE" ? "" : v) &&
                    p.is_active
                );
                if (nextProfile) {
                  form.setValue("parser_key", nextProfile.parser_key || "GENERIC");
                  form.setValue("vendor_part_number", nextProfile.vendor_part_number || nextProfile.supplier_part_number || "");
                  if (nextProfile.default_pack_qty) form.setValue("pack_qty_total", nextProfile.default_pack_qty);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select part number" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Manual input</SelectItem>
                {partNumbers.map((pn: PartNumberMaster) => (
                  <SelectItem key={pn.id} value={pn.part_number}>
                    {pn.part_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Vendor Part Number</Label>
            {vendorProfiles.length ? (
              <Select
                value={form.watch("vendor_part_number") || "NONE"}
                onValueChange={(v) => {
                  const next = v === "NONE" ? "" : v;
                  form.setValue("vendor_part_number", next);
                  const matched = vendorProfiles.find((p: SupplierPartProfile) => (p.vendor_part_number || p.supplier_part_number) === next);
                  if (matched) {
                    form.setValue("parser_key", matched.parser_key || "GENERIC");
                    if (matched.default_pack_qty) form.setValue("pack_qty_total", matched.default_pack_qty);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor part number" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Not specified</SelectItem>
                  {vendorProfiles.map((profile: SupplierPartProfile) => (
                    <SelectItem key={profile.id} value={profile.vendor_part_number || profile.supplier_part_number || ""}>
                      {profile.vendor_part_number || profile.supplier_part_number || "(empty mapping)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input {...form.register("vendor_part_number")} />
            )}
          </div>
          <div className="space-y-2">
            <Label>Vendor Lot</Label>
            <Input {...form.register("vendor_lot")} />
          </div>
          <div className="space-y-2">
            <Label>Pack Quantity</Label>
            <Input type="number" {...form.register("pack_qty_total")} />
          </div>
          <div className="space-y-2">
            <Label>Production Date</Label>
            <Input type="date" {...form.register("production_date")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Pack 2D Barcode Raw</Label>
            <Input {...form.register("pack_barcode_raw")} />
          </div>
          {selectedProfile ? (
            <div className="md:col-span-2 rounded border bg-slate-50 p-2 text-xs text-slate-600">
              Active profile: parser `{selectedProfile.parser_key}` {selectedProfile.default_pack_qty ? `| default pack ${selectedProfile.default_pack_qty}` : ""}
            </div>
          ) : null}
        </div>
      </FormDialog>
    </div>
  );
}
