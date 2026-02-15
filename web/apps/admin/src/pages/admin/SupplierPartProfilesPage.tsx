import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { PartNumberMaster, Supplier, SupplierPackParserInfo, SupplierPartProfile } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Checkbox } from "../../components/ui/checkbox";
import { Button } from "../../components/ui/button";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";

const schema = z.object({
  vendor_id: z.string().min(1),
  part_number: z.string().min(1),
  vendor_part_number: z.string().optional(),
  parser_key: z.string().min(1).default("GENERIC"),
  default_pack_qty: z.coerce.number().int().positive().optional(),
  is_active: z.boolean().default(true),
});
type FormValues = z.infer<typeof schema>;

export function SupplierPartProfilesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierPartProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplierPartProfile | null>(null);
  const vendorFilter = searchParams.get("vendorId") ?? "";

  const { data: rows = [] } = useQuery({
    queryKey: ["vendor-part-profiles"],
    queryFn: () => sdk.admin.getVendorPartProfiles(),
  });
  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => sdk.admin.getVendors(),
  });
  const { data: partNumbers = [] } = useQuery({
    queryKey: ["part-numbers"],
    queryFn: () => sdk.admin.getPartNumbers(),
  });
  const { data: parserKeys = [] } = useQuery({
    queryKey: ["vendor-pack-parsers"],
    queryFn: () => sdk.admin.getVendorPackParsers(),
  });

  const filteredRows = useMemo(() => {
    if (!vendorFilter) return rows;
    return rows.filter((row) => (row.vendor_id || row.supplier_id) === vendorFilter);
  }, [rows, vendorFilter]);

  const activeVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === vendorFilter) ?? null,
    [vendorFilter, vendors]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { parser_key: "GENERIC", is_active: true },
  });

  const createMutation = useMutation({
    mutationFn: (v: FormValues) => sdk.admin.createVendorPartProfile(v as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-part-profiles"] });
      setOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (v: FormValues) => sdk.admin.updateVendorPartProfile(editing!.id, v as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-part-profiles"] });
      setOpen(false);
      setEditing(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteVendorPartProfile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-part-profiles"] });
    },
  });

  const columns = useMemo<ColumnDef<SupplierPartProfile>[]>(
    () => [
      { header: "Vendor", cell: ({ row }) => row.original.vendor_code || row.original.supplier_code || row.original.vendor_id || row.original.supplier_id },
      { header: "Part Number", accessorKey: "part_number" },
      { header: "Vendor PN", cell: ({ row }) => row.original.vendor_part_number || row.original.supplier_part_number || "-" },
      { header: "Parser", accessorKey: "parser_key" },
      { header: "Default Pack", cell: ({ row }) => row.original.default_pack_qty ?? "-" },
      { header: "Status", cell: ({ row }) => <StatusBadge status={row.original.is_active ? "active" : "disabled"} /> },
      {
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(row.original);
                form.reset({
                  vendor_id: row.original.vendor_id || row.original.supplier_id,
                  part_number: row.original.part_number,
                  vendor_part_number: row.original.vendor_part_number || row.original.supplier_part_number || "",
                  parser_key: row.original.parser_key || "GENERIC",
                  default_pack_qty: row.original.default_pack_qty ?? undefined,
                  is_active: row.original.is_active,
                });
                setOpen(true);
              }}
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setDeleteTarget(row.original);
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [deleteMutation, form]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Part Profiles"
        description="Map vendor part number and parser profile per internal part number."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              form.reset({
                vendor_id: vendorFilter || vendors[0]?.id || "",
                part_number: partNumbers[0]?.part_number || "",
                vendor_part_number: "",
                parser_key: parserKeys[0]?.key || "GENERIC",
                default_pack_qty: undefined,
                is_active: true,
              });
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Profile
          </Button>
        }
      />
      <ApiErrorBanner
        message={
          createMutation.error
            ? formatApiError(createMutation.error)
            : updateMutation.error
              ? formatApiError(updateMutation.error)
              : deleteMutation.error
                ? formatApiError(deleteMutation.error)
                : undefined
        }
      />
      {vendorFilter ? (
        <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span>
            Filtered by vendor: <span className="font-semibold">{activeVendor ? `${activeVendor.code} - ${activeVendor.name}` : vendorFilter}</span>
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete("vendorId");
              setSearchParams(next);
            }}
          >
            Clear Filter
          </Button>
        </div>
      ) : null}

      <DataTable data={filteredRows} columns={columns} filterPlaceholder="Search profile..." />

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Vendor Part Profile" : "Create Vendor Part Profile"}
        onSubmit={form.handleSubmit((v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Vendor</Label>
            <Select value={form.watch("vendor_id")} onValueChange={(v) => form.setValue("vendor_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((s: Supplier) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Part Number</Label>
            <Select value={form.watch("part_number")} onValueChange={(v) => form.setValue("part_number", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select part number" />
              </SelectTrigger>
              <SelectContent>
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
            <Input {...form.register("vendor_part_number")} />
          </div>
          <div className="space-y-2">
            <Label>Parser Key</Label>
            <Select value={form.watch("parser_key")} onValueChange={(v) => form.setValue("parser_key", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select parser" />
              </SelectTrigger>
              <SelectContent>
                {parserKeys.map((p: SupplierPackParserInfo) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Default Pack Quantity</Label>
            <Input type="number" {...form.register("default_pack_qty")} />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.watch("is_active")} onCheckedChange={(v) => form.setValue("is_active", Boolean(v))} />
              Active
            </label>
          </div>
        </div>
      </FormDialog>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete vendor part profile"
        description={
          deleteTarget
            ? `Delete profile ${deleteTarget.vendor_code || deleteTarget.supplier_code || deleteTarget.vendor_id || deleteTarget.supplier_id} / ${deleteTarget.part_number}?`
            : ""
        }
        confirmText="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
