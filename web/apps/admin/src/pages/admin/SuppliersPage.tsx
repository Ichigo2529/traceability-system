import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { SupplierPartProfile, Vendor } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { Button } from "../../components/ui/button";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";

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

  const { data: rows = [] } = useQuery({
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
      const key = row.vendor_id || row.supplier_id;
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
    },
  });

  const updateMutation = useMutation({
    mutationFn: (v: VendorForm) => sdk.admin.updateVendor(editing!.id, v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setOpen(false);
      setEditing(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteVendor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });

  const columns = useMemo<ColumnDef<Vendor>[]>(
    () => [
      { header: "Code", accessorKey: "code" },
      { header: "Vendor ID", accessorKey: "vendor_id" },
      { header: "Name", accessorKey: "name" },
      {
        header: "Part Profiles",
        cell: ({ row }) => {
          const count = profileCountByVendor.get(row.original.id) ?? 0;
          return <span className="inline-flex min-w-8 justify-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{count}</span>;
        },
      },
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
                  code: row.original.code,
                  name: row.original.name,
                  vendor_id: row.original.vendor_id ?? "",
                  is_active: row.original.is_active,
                });
                setOpen(true);
              }}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigate(`/admin/supplier-part-profiles?vendorId=${encodeURIComponent(row.original.id)}`);
              }}
            >
              Profiles
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
    [deleteMutation, form, navigate, profileCountByVendor]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        description="Vendor master for inbound pack traceability."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              form.reset({ code: "", name: "", vendor_id: "", is_active: true });
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Vendor
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
      <DataTable data={rows} columns={columns} filterPlaceholder="Search vendor..." />

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Vendor" : "Create Vendor"}
        onSubmit={form.handleSubmit((v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Vendor Code</Label>
            <Input {...form.register("code")} />
          </div>
          <div className="space-y-2">
            <Label>Vendor ID</Label>
            <Input {...form.register("vendor_id")} placeholder="P / F / I / C / R" />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...form.register("name")} />
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
        title="Delete vendor"
        description={deleteTarget ? `Delete vendor ${deleteTarget.code}?` : ""}
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
