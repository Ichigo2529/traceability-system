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
import {
  Button,
  Input,
  CheckBox,
  Label,
  Form,
  FormItem
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/supplier.js";
import "@ui5/webcomponents-icons/dist/marketing-campaign.js";

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
  const { showToast, ToastComponent } = useToast();

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
      { header: "Code", accessorKey: "code" },
      { header: "Vendor ID", accessorKey: "vendor_id" },
      { header: "Name", accessorKey: "name" },
      {
        header: "Part Profiles",
        cell: ({ row }) => {
          const count = profileCountByVendor.get(row.original.id) ?? 0;
          return <span className="admin-supplier-profile-count">{count}</span>;
        },
      },
      { header: "Status", cell: ({ row }) => <StatusBadge status={row.original.is_active ? "active" : "disabled"} /> },
      {
        header: "Actions",
        cell: ({ row }) => (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              icon="edit"
              design="Transparent"
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
              tooltip="Edit Vendor"
            />
            <Button
              icon="marketing-campaign"
              design="Transparent"
              onClick={() => {
                navigate(`/admin/supplier-part-profiles?vendorId=${encodeURIComponent(row.original.id)}`);
              }}
              tooltip="View Profiles"
            />
            <Button
              icon="delete"
              design="Transparent"
              onClick={() => {
                setDeleteTarget(row.original);
              }}
              tooltip="Delete Vendor"
            />
          </div>
        ),
      },
    ],
    [deleteMutation, form, navigate, profileCountByVendor]
  );

  return (
    <PageLayout
      title="Suppliers"
      subtitle="Manage external part suppliers"
      icon="supplier"
      iconColor="orange"
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
          filterPlaceholder="Search suppliers..."
          actions={
            <Button
              icon="add"
              design="Emphasized"
              className="button-hover-scale"
              onClick={() => {
                setEditing(null);
                form.reset({ name: "", code: "", vendor_id: "", is_active: true }); // Adjusted to match schema
                setOpen(true);
              }}
            >
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
        <Form layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12">
          <FormItem labelContent={<Label>Vendor Code</Label>}>
            <Input {...form.register("code")} />
          </FormItem>
          <FormItem labelContent={<Label>Vendor ID</Label>}>
            <Input {...form.register("vendor_id")} placeholder="P / F / I / C / R" />
          </FormItem>
          <FormItem labelContent={<Label>Name</Label>}>
            <Input {...form.register("name")} />
          </FormItem>
          <FormItem labelContent={<Label>Status</Label>}>
              <Controller
                  name="is_active"
                  control={form.control}
                  render={({ field }) => (
                      <CheckBox
                          text="Active"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                      />
                  )}
              />
          </FormItem>
        </Form>
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
      <ToastComponent />
    </PageLayout>
  );
}
