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
import {
  Button,
  Input,
  CheckBox,
  Label,
  Form,
  FormItem,
  Select,
  Option,
  FlexBox,
  FlexBoxAlignItems,
  FlexBoxJustifyContent
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/attachment-html.js";
import "@ui5/webcomponents-icons/dist/filter.js";

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
  const { showToast, ToastComponent } = useToast();

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
      { header: "Vendor", cell: ({ row }) => row.original.vendor_code || row.original.supplier_code || row.original.vendor_id || row.original.supplier_id },
      { header: "Part Number", accessorKey: "part_number" },
      { header: "Vendor PN", cell: ({ row }) => row.original.vendor_part_number || row.original.supplier_part_number || "-" },
      { header: "Parser", accessorKey: "parser_key" },
      { header: "Default Pack", cell: ({ row }) => row.original.default_pack_qty ?? "-" },
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
                  vendor_id: row.original.vendor_id || row.original.supplier_id,
                  part_number: row.original.part_number,
                  vendor_part_number: row.original.vendor_part_number || row.original.supplier_part_number || "",
                  parser_key: row.original.parser_key || "GENERIC",
                  default_pack_qty: row.original.default_pack_qty ?? undefined,
                  is_active: row.original.is_active,
                });
                setOpen(true);
              }}
              tooltip="Edit Profile"
              aria-label="Edit Profile"
            />
            <Button
              icon="delete"
              design="Transparent"
              onClick={() => {
                setDeleteTarget(row.original);
              }}
              tooltip="Delete Profile"
              aria-label="Delete Profile"
            />
          </div>
        ),
      },
    ],
    [deleteMutation, form]
  );

  return (
    <PageLayout
      title="Vendor Part Profiles"
      subtitle={
        <FlexBox alignItems={FlexBoxAlignItems.Center}>
          <span className="indicator-live" />
          <span>Cross-reference between vendor PN and internal codes</span>
        </FlexBox>
      }
      icon="attachment-html"
      iconColor="indigo"
    >
      <div className="page-container">
        {vendorFilter && (
             <FlexBox 
                alignItems={FlexBoxAlignItems.Center} 
                justifyContent={FlexBoxJustifyContent.SpaceBetween}
                style={{ marginBottom: "1rem", padding: "0.5rem 1rem", backgroundColor: "var(--sapList_SelectionBackgroundColor)", borderRadius: "0.25rem" }}
            >
                <Label>
                  Filtered by vendor: <strong>{activeVendor ? `${activeVendor.code} - ${activeVendor.name}` : vendorFilter}</strong>
                </Label>
                <Button
                  icon="filter"
                  design="Transparent"
                  className="button-hover-scale"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete("vendorId");
                    setSearchParams(next);
                  }}
                >
                  Clear Filter
                </Button>
            </FlexBox>
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
                  icon="add"
                  design="Emphasized"
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
        <Form layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12">
          <FormItem labelContent={<Label>Vendor</Label>}>
              <Controller
                  control={form.control}
                  name="vendor_id"
                  render={({ field }) => (
                       <Select
                          onChange={(e) => {
                              const selected = e.detail.selectedOption as unknown as { value: string };
                              field.onChange(selected.value);
                          }}
                          value={field.value}
                      >
                           {vendors.map((s: Supplier) => (
                              <Option key={s.id} value={s.id}>
                                {s.code} - {s.name}
                              </Option>
                            ))}
                      </Select>
                  )}
               />
          </FormItem>
          
          <FormItem labelContent={<Label>Part Number</Label>}>
              <Controller
                  control={form.control}
                  name="part_number"
                  render={({ field }) => (
                       <Select
                          onChange={(e) => {
                              const selected = e.detail.selectedOption as unknown as { value: string };
                              field.onChange(selected.value);
                          }}
                          value={field.value}
                      >
                           {partNumbers.map((pn: PartNumberMaster) => (
                              <Option key={pn.id} value={pn.part_number}>
                                {pn.part_number}
                              </Option>
                            ))}
                      </Select>
                  )}
               />
          </FormItem>
          
          <FormItem labelContent={<Label>Vendor Part Number</Label>}>
            <Input {...form.register("vendor_part_number")} />
          </FormItem>
          
          <FormItem labelContent={<Label>Parser Key</Label>}>
              <Controller
                  control={form.control}
                  name="parser_key"
                  render={({ field }) => (
                       <Select
                          onChange={(e) => {
                              const selected = e.detail.selectedOption as unknown as { value: string };
                              field.onChange(selected.value);
                          }}
                          value={field.value}
                      >
                          {parserKeys.map((p: SupplierPackParserInfo) => (
                              <Option key={p.key} value={p.key}>
                                {p.key}
                              </Option>
                            ))}
                      </Select>
                  )}
               />
          </FormItem>
          
          <FormItem labelContent={<Label>Default Pack Quantity</Label>}>
            <Input type="Number" {...form.register("default_pack_qty")} />
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
      <ToastComponent />
    </PageLayout>
  );
}
