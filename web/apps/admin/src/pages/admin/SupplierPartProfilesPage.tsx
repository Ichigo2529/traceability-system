import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useSearchParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PartNumberMaster, Supplier, SupplierPackParserInfo, SupplierPartProfile } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
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
import { Plus, Pencil, FilterX } from "lucide-react";

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
  const { showToast } = useToast();

  const { data: rows = [], isLoading: profilesLoading } = useQuery({
    queryKey: ["vendor-part-profiles"],
    queryFn: () => sdk.admin.getVendorPartProfiles(),
  });
  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => sdk.admin.getVendors(),
  });
  const { data: partNumbers = [], isLoading: partNumbersLoading } = useQuery({
    queryKey: ["part-numbers"],
    queryFn: () => sdk.admin.getPartNumbers(),
  });
  const { data: parserKeys = [], isLoading: parsersLoading } = useQuery({
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
      showToast("Profile created successfully");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (v: FormValues) => sdk.admin.updateVendorPartProfile(editing!.id, v as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-part-profiles"] });
      setOpen(false);
      setEditing(null);
      showToast("Profile updated successfully");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteVendorPartProfile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-part-profiles"] });
      showToast("Profile deleted");
    },
  });

  const columns = useMemo<ColumnDef<SupplierPartProfile>[]>(
    () => [
      {
        id: "vendor",
        header: "Vendor",
        cell: ({ row }) =>
          row.original.vendor_code || row.original.supplier_code || row.original.vendor_id || row.original.supplier_id,
      },
      { id: "part_number", header: "Part Number", accessorKey: "part_number" },
      {
        id: "vendor_pn",
        header: "Vendor PN",
        cell: ({ row }) => row.original.vendor_part_number || row.original.supplier_part_number || "-",
      },
      { id: "parser", header: "Parser", accessorKey: "parser_key" },
      { id: "default_pack", header: "Default Pack", cell: ({ row }) => row.original.default_pack_qty ?? "-" },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.is_active ? "active" : "disabled"} />,
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
              title="Edit Profile"
              aria-label="Edit Profile"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <DeleteIconButton
              onClick={() => setDeleteTarget(row.original)}
              title="Delete Profile"
              aria-label="Delete Profile"
            />
          </div>
        ),
      },
    ],
    [form]
  );

  return (
    <PageLayout
      title="Vendor Part Profiles"
      subtitle={
        <div className="flex items-center gap-2">
          <span>Cross-reference between vendor PN and internal codes</span>
        </div>
      }
      icon="attachment-html"
      iconColor="indigo"
    >
      <div className="page-container">
        {vendorFilter && (
          <div className="flex items-center justify-between mb-4 py-2 px-4 rounded bg-muted/50">
            <Label className="font-normal">
              Filtered by vendor:{" "}
              <strong>{activeVendor ? `${activeVendor.code} - ${activeVendor.name}` : vendorFilter}</strong>
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="button-hover-scale"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete("vendorId");
                setSearchParams(next);
              }}
            >
              <FilterX className="h-4 w-4 mr-2" />
              Clear Filter
            </Button>
          </div>
        )}

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

        <DataTable
          data={filteredRows}
          columns={columns}
          loading={profilesLoading || vendorsLoading || partNumbersLoading || parsersLoading}
          filterPlaceholder="Search profile..."
          actions={
            <Button
              className="button-hover-scale"
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
              <Plus className="h-4 w-4 mr-2" />
              Add Profile
            </Button>
          }
        />
      </div>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Vendor Part Profile" : "Create Vendor Part Profile"}
        onSubmit={form.handleSubmit((v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Vendor</Label>
            <Controller
              control={form.control}
              name="vendor_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
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
              )}
            />
          </div>
          <div className="grid gap-2">
            <Label>Part Number</Label>
            <Controller
              control={form.control}
              name="part_number"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select part" />
                  </SelectTrigger>
                  <SelectContent>
                    {partNumbers.map((pn: PartNumberMaster) => (
                      <SelectItem key={pn.id} value={pn.part_number}>
                        {pn.part_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Vendor Part Number</Label>
            <Input {...form.register("vendor_part_number")} />
          </div>
          <div className="grid gap-2">
            <Label>Parser Key</Label>
            <Controller
              control={form.control}
              name="parser_key"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {parserKeys.map((p: SupplierPackParserInfo) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid gap-2">
            <Label>Default Pack Quantity</Label>
            <Input type="number" {...form.register("default_pack_qty")} />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Controller
              name="is_active"
              control={form.control}
              render={({ field }) => (
                <Checkbox id="spp-active" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="spp-active" className="cursor-pointer font-normal">
              Active
            </Label>
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
        submitting={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />
    </PageLayout>
  );
}
