import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { SupplierPartProfile, Vendor } from "@traceability/sdk";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, LayoutGrid } from "lucide-react";

const schema = z.object({
  code: z.string().min(1),
  name: z.string().min(2),
  vendor_id: z.string().min(1, "Vendor ID required"),
  is_active: z.boolean().default(true),
});
type VendorForm = z.infer<typeof schema>;

export function SuppliersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const { showToast } = useToast();

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => sdk.admin.getVendors(),
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["vendor-part-profiles"],
    queryFn: () => sdk.admin.getVendorPartProfiles(),
  });

  const profileCountByVendor = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of profiles as SupplierPartProfile[]) {
      const key = row.vendor_id;
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [profiles]);

  const form = useForm<VendorForm>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true },
  });

  const createMutation = useMutation({
    mutationFn: (v: VendorForm) => sdk.admin.createVendor(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setOpen(false);
      form.reset({ code: "", name: "", vendor_id: "", is_active: true });
      showToast("Supplier created successfully");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (v: VendorForm) => sdk.admin.updateVendor(editing!.id, v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setOpen(false);
      setEditing(null);
      showToast("Supplier updated successfully");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteVendor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      showToast("Supplier deleted");
    },
  });

  const columns = useMemo<ColumnDef<Vendor>[]>(
    () => [
      {
        id: "code",
        header: "Supplier",
        accessorKey: "code",
        size: 240,
        cell: ({ row }) => (
          <div className="min-w-0 whitespace-normal">
            <p className="truncate font-medium text-foreground">{row.original.code}</p>
            <p className="truncate text-xs text-muted-foreground">{row.original.name}</p>
          </div>
        ),
      },
      {
        id: "vendor_id",
        header: "Vendor Ref",
        accessorKey: "vendor_id",
        size: 180,
        cell: ({ row }) => (
          <div className="min-w-0 whitespace-normal">
            <p className="truncate text-foreground">{row.original.vendor_id || "-"}</p>
            <p className="truncate text-xs text-muted-foreground">External vendor identifier</p>
          </div>
        ),
      },
      {
        id: "profiles",
        header: "Part Profiles",
        cell: ({ row }) => (
          <div className="min-w-0 whitespace-normal">
            <p className="tabular-nums font-medium text-foreground">{profileCountByVendor.get(row.original.id) ?? 0}</p>
            <p className="truncate text-xs text-muted-foreground">Mapped supplier part profiles</p>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        size: 120,
        cell: ({ row }) => (
          <div className="min-w-0 whitespace-normal">
            <StatusBadge status={row.original.is_active ? "active" : "disabled"} />
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {row.original.is_active ? "Available for sourcing and profiles" : "Hidden from active sourcing"}
            </p>
          </div>
        ),
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
                  code: row.original.code,
                  name: row.original.name,
                  vendor_id: row.original.vendor_id ?? "",
                  is_active: row.original.is_active,
                });
                setOpen(true);
              }}
              title="Edit Vendor"
              aria-label="Edit Vendor"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/admin/supplier-part-profiles?vendorId=${encodeURIComponent(row.original.id)}`)}
              title="View Profiles"
              aria-label="View Profiles"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <DeleteIconButton
              onClick={() => setDeleteTarget(row.original)}
              title="Delete Vendor"
              aria-label="Delete Vendor"
            />
          </div>
        ),
      },
    ],
    [form, navigate, profileCountByVendor]
  );

  return (
    <PageLayout
      title="Vendors"
      subtitle={
        <div className="flex items-center gap-2">
          <span>Manage supplier master data and jump into supplier-specific part profiles</span>
        </div>
      }
      icon="supplier"
      iconColor="indigo"
    >
      <div className="page-container">
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
          data={suppliers}
          columns={columns}
          loading={suppliersLoading}
          onRowClick={(vendor) => navigate(`/admin/supplier-part-profiles?vendorId=${encodeURIComponent(vendor.id)}`)}
          filterPlaceholder="Search supplier code, name, vendor ID, or profile coverage..."
          actions={
            <Button
              className="button-hover-scale"
              onClick={() => {
                setEditing(null);
                form.reset({ name: "", code: "", vendor_id: "", is_active: true });
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          }
        />
      </div>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Vendor" : "Create Vendor"}
        onSubmit={form.handleSubmit((v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="vendor-code">Vendor Code</Label>
            <Input id="vendor-code" {...form.register("code")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vendor-id">Vendor ID</Label>
            <Input id="vendor-id" {...form.register("vendor_id")} placeholder="P / F / I / C / R" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vendor-name">Name</Label>
            <Input id="vendor-name" {...form.register("name")} />
          </div>
          <div className="flex items-center gap-2">
            <Controller
              name="is_active"
              control={form.control}
              render={({ field }) => (
                <Checkbox id="vendor-active" checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
              )}
            />
            <Label htmlFor="vendor-active" className="cursor-pointer">
              Active
            </Label>
          </div>
        </div>
      </FormDialog>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete vendor"
        description={deleteTarget ? `Delete vendor ${deleteTarget.code}?` : ""}
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
