import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { InventoryDoRecord, PartNumberMaster, SupplierPackParserInfo, SupplierPackRecord, SupplierPartProfile } from "@traceability/sdk";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { sdk } from "../../context/AuthContext";
import { DataTable } from "../../components/shared/DataTable";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { PageLayout, Section } from "@traceability/ui";
import { useToast } from "../../hooks/useToast";
import {
  Button,
  Dialog,
  Label,
  Input,
  Select,
  Option,
  FlexBox,
  FlexBoxAlignItems,
  FlexBoxDirection,
  Bar,
  ObjectStatus
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/shipping-status.js";

const schema = z.object({
  vendor_id: z.string().min(1, "Vendor is required"),
  do_number: z.string().optional(),
  parser_key: z.string().default("GENERIC"),
  pack_barcode_raw: z.string().min(1, "Barcode is required"),
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
  const [error, setError] = useState<string | undefined>();
  const { showToast, ToastComponent } = useToast();

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => sdk.admin.getVendors(),
  });
  const { data: dos = [], isLoading: dosLoading } = useQuery({
    queryKey: ["inventory-do"],
    queryFn: () => sdk.admin.getInventoryDoRecords(),
  });
  const { data: packs = [], isLoading: packsLoading } = useQuery({
    queryKey: ["vendor-packs"],
    queryFn: () => sdk.admin.getVendorPacks(),
  });
  const { data: partNumbers = [], isLoading: partNumbersLoading } = useQuery({
    queryKey: ["part-numbers"],
    queryFn: () => sdk.admin.getPartNumbers(),
  });
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ["vendor-part-profiles"],
    queryFn: () => sdk.admin.getVendorPartProfiles(),
  });
  const { data: parsers = [], isLoading: parsersLoading } = useQuery({
    queryKey: ["vendor-pack-parsers"],
    queryFn: () => sdk.admin.getVendorPackParsers(),
  });

  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<InboundPackForm>({
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
      reset({
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
      setError(undefined);
      showToast("Pack received successfully");
    },
    onError: (err) => setError(formatApiError(err))
  });

  const selectedVendorId = watch("vendor_id");
  const selectedPartNumber = watch("part_number");
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
    <PageLayout
      title="Inbound Packs"
      subtitle={
        <FlexBox alignItems={FlexBoxAlignItems.Center}>
            <span className="indicator-live" />
            <span>Receive vendor 2D packs and keep lot-level traceability.</span>
        </FlexBox>
      }
      icon="shipping-status"
      iconColor="green"
    >
      <div className="page-container">
        <Section title="Delivery Orders" variant="card">
          <DataTable data={dos} columns={doColumns} loading={dosLoading} filterPlaceholder="Search DO..." />
        </Section>

        <Section title="Vendor Packs" variant="card">
          <ApiErrorBanner message={receiveMutation.error ? formatApiError(receiveMutation.error) : undefined} />
          <DataTable 
              data={packs} 
              columns={packColumns} 
              loading={packsLoading || vendorsLoading || partNumbersLoading || profilesLoading || parsersLoading}
              filterPlaceholder="Search pack..." 
              actions={
                  <Button
                    icon="add"
                    design="Emphasized"
                    className="button-hover-scale"
                    onClick={() => {
                      reset({
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
                      setError(undefined);
                      setOpen(true);
                    }}
                    disabled={receiveMutation.isPending}
                    tooltip="Receive New Pack"
                    aria-label="Receive New Pack"
                  >
                    Receive Pack
                  </Button>
              }
          />
        </Section>
      </div>

      <Dialog
        open={open}
        headerText="Receive Vendor Pack"
        footer={
            <Bar
                endContent={
                    <>
                        <Button onClick={() => setOpen(false)} design="Transparent">Cancel</Button>
                        <Button design="Emphasized" onClick={(e) => { handleSubmit((values) => receiveMutation.mutate(values))(e as any); }} disabled={receiveMutation.isPending}>
                            {receiveMutation.isPending ? "Receiving..." : "Receive"}
                        </Button>
                    </>
                }
            />
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", minWidth: "480px", padding: "1rem" }}>
          {error && (
              <ObjectStatus state="Negative" inverted>
                  {error}
              </ObjectStatus>
          )}

          <FlexBox direction={FlexBoxDirection.Column}>
            <Label required>Vendor</Label>
            <Controller
                name="vendor_id"
                control={control}
                render={({ field }) => (
                    <Select
                        onChange={(e) => field.onChange((e.target.selectedOption as any).dataset.value)}
                        value={field.value}
                        valueState={errors.vendor_id ? "Negative" : "None"}
                        valueStateMessage={errors.vendor_id && <div>{errors.vendor_id.message}</div>}
                    >
                        <Option value="" data-value="">Select vendor</Option>
                        {vendors.map((s) => (
                            <Option key={s.id} value={s.id} data-value={s.id} selected={s.id === field.value}>
                                {s.code} - {s.name}
                            </Option>
                        ))}
                    </Select>
                )}
            />
          </FlexBox>

          <FlexBox direction={FlexBoxDirection.Column}>
            <Label>DO Number</Label>
            <Controller
                name="do_number"
                control={control}
                render={({ field }) => (<Input {...field} value={field.value || ""} placeholder="D0001" />)}
            />
          </FlexBox>

          <FlexBox direction={FlexBoxDirection.Column}>
            <Label>Parser Key</Label>
            <Controller
                name="parser_key"
                control={control}
                render={({ field }) => (
                    <Select
                        onChange={(e) => field.onChange((e.target.selectedOption as any).dataset.value)}
                        value={field.value}
                    >
                        {parsers.map((p: SupplierPackParserInfo) => (
                            <Option key={p.key} value={p.key} data-value={p.key} selected={p.key === field.value}>
                                {p.key}
                            </Option>
                        ))}
                    </Select>
                )}
            />
          </FlexBox>

          <FlexBox direction={FlexBoxDirection.Column}>
            <Label>Part Number</Label>
            <Controller
                name="part_number"
                control={control}
                render={({ field }) => (
                    <Select
                        onChange={(e) => {
                             const val = (e.target.selectedOption as any).dataset.value;
                             field.onChange(val === "NONE" ? "" : val);

                             const nextProfile = profiles.find(
                               (p: SupplierPartProfile) =>
                                 (p.vendor_id ?? p.supplier_id) === watch("vendor_id") &&
                                 p.part_number === (val === "NONE" ? "" : val) &&
                                 p.is_active
                             );
                             if (nextProfile) {
                               setValue("parser_key", nextProfile.parser_key || "GENERIC");
                               setValue("vendor_part_number", nextProfile.vendor_part_number || nextProfile.supplier_part_number || "");
                               if (nextProfile.default_pack_qty) setValue("pack_qty_total", nextProfile.default_pack_qty);
                             }
                        }}
                        value={field.value || "NONE"}
                    >
                        <Option value="NONE" data-value="NONE">Manual input</Option>
                        {partNumbers.map((pn: PartNumberMaster) => (
                            <Option key={pn.id} value={pn.part_number} data-value={pn.part_number} selected={pn.part_number === field.value}>
                                {pn.part_number}
                            </Option>
                        ))}
                    </Select>
                )}
            />
          </FlexBox>

          <FlexBox direction={FlexBoxDirection.Column}>
            <Label>Vendor Part Number</Label>
            {vendorProfiles.length ? (
                <Controller
                    name="vendor_part_number"
                    control={control}
                    render={({ field }) => (
                        <Select
                            onChange={(e) => {
                                const val = (e.target.selectedOption as any).dataset.value;
                                const next = val === "NONE" ? "" : val;
                                field.onChange(next);
                                const matched = vendorProfiles.find((p: SupplierPartProfile) => (p.vendor_part_number || p.supplier_part_number) === next);
                                if (matched) {
                                    setValue("parser_key", matched.parser_key || "GENERIC");
                                    if (matched.default_pack_qty) setValue("pack_qty_total", matched.default_pack_qty);
                                }
                            }}
                            value={field.value || "NONE"}
                        >
                            <Option value="NONE" data-value="NONE">Not specified</Option>
                            {vendorProfiles.map((profile: SupplierPartProfile) => (
                                <Option 
                                    key={profile.id} 
                                    value={profile.vendor_part_number || profile.supplier_part_number || ""}
                                    data-value={profile.vendor_part_number || profile.supplier_part_number || ""}
                                    selected={(profile.vendor_part_number || profile.supplier_part_number) === field.value}
                                >
                                    {profile.vendor_part_number || profile.supplier_part_number || "(empty mapping)"}
                                </Option>
                            ))}
                        </Select>
                    )}
                />
            ) : (
                <Controller
                    name="vendor_part_number"
                    control={control}
                    render={({ field }) => (<Input {...field} value={field.value || ""} />)}
                />
            )}
          </FlexBox>
          
          <FlexBox direction={FlexBoxDirection.Column}>
            <Label>Vendor Lot</Label>
            <Controller
                name="vendor_lot"
                control={control}
                render={({ field }) => (<Input {...field} value={field.value || ""} />)}
            />
          </FlexBox>

          <FlexBox direction={FlexBoxDirection.Column}>
            <Label>Pack Quantity</Label>
            <Controller
                name="pack_qty_total"
                control={control}
                render={({ field }) => (
                    <Input 
                        type="Number" 
                        {...field} 
                        value={field.value?.toString() || ""} 
                        onInput={(e) => field.onChange(Number(e.target.value))}
                        valueState={errors.pack_qty_total ? "Negative" : "None"}
                        valueStateMessage={errors.pack_qty_total && <div>{errors.pack_qty_total.message}</div>}
                    />
                )}
            />
          </FlexBox>

          <FlexBox direction={FlexBoxDirection.Column}>
            <Label>Production Date</Label>
            <Controller
                name="production_date"
                control={control}
                render={({ field }) => (<Input type="Text" placeholder="YYYY-MM-DD" {...field} value={field.value || ""} />)}
            />
          </FlexBox>
          
          <FlexBox direction={FlexBoxDirection.Column}>
            <Label required>Pack 2D Barcode Raw</Label>
             <Controller
                name="pack_barcode_raw"
                control={control}
                render={({ field }) => (
                    <Input 
                        {...field} 
                        value={field.value || ""} 
                        valueState={errors.pack_barcode_raw ? "Negative" : "None"}
                        valueStateMessage={errors.pack_barcode_raw && <div>{errors.pack_barcode_raw.message}</div>}
                    />
                )}
            />
          </FlexBox>
          
          {selectedProfile ? (
            <div style={{ fontSize: "0.875rem", color: "var(--sapContent_LabelColor)", marginTop: "0.5rem" }}>
              Active profile: parser `{selectedProfile.parser_key}` {selectedProfile.default_pack_qty ? `| default pack ${selectedProfile.default_pack_qty}` : ""}
            </div>
          ) : null}
        </div>
      </Dialog>
      <ToastComponent />
    </PageLayout>
  );
}
