import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import {
  InventoryDoRecord,
  PartNumberMaster,
  SupplierPackParserInfo,
  SupplierPackRecord,
  SupplierPartProfile,
} from "@traceability/sdk";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { sdk } from "../../context/AuthContext";
import { DataTable } from "../../components/shared/DataTable";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { PageLayout, Section } from "@traceability/ui";
import { useToast } from "../../hooks/useToast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus } from "lucide-react";

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

const NONE = "__none__";

export function InboundPacksPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const { showToast } = useToast();

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

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InboundPackForm>({
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
    onError: (err) => setError(formatApiError(err)),
  });

  const selectedVendorId = watch("vendor_id");
  const selectedPartNumber = watch("part_number");
  const selectedProfile = useMemo(
    () =>
      profiles.find(
        (p: SupplierPartProfile) =>
          (p.vendor_id ?? p.supplier_id) === selectedVendorId && p.part_number === selectedPartNumber && p.is_active
      ),
    [profiles, selectedPartNumber, selectedVendorId]
  );

  const vendorProfiles = useMemo(
    () =>
      profiles.filter(
        (p: SupplierPartProfile) =>
          (p.vendor_id ?? p.supplier_id) === selectedVendorId && p.part_number === selectedPartNumber && p.is_active
      ),
    [profiles, selectedPartNumber, selectedVendorId]
  );

  const doColumns = useMemo<ColumnDef<InventoryDoRecord>[]>(
    () => [
      { id: "do_number", header: "DO Number", accessorKey: "do_number" },
      {
        id: "vendor",
        header: "Vendor",
        cell: ({ row }) => row.original.vendor_name || row.original.supplier_name || "-",
      },
      { id: "part_number", header: "Part Number", accessorKey: "part_number" },
      { id: "qty_received", header: "Qty Received", accessorKey: "qty_received" },
      { id: "qty_issued", header: "Qty Issued", accessorKey: "qty_issued" },
    ],
    []
  );

  const packColumns = useMemo<ColumnDef<SupplierPackRecord>[]>(
    () => [
      {
        id: "vendor",
        header: "Vendor",
        cell: ({ row }) => row.original.vendor_name || row.original.supplier_name || "-",
      },
      { id: "do_number", header: "DO", accessorKey: "do_number" },
      { id: "part_number", header: "Part Number", accessorKey: "part_number" },
      { id: "lot", header: "Lot", cell: ({ row }) => row.original.vendor_lot || row.original.supplier_lot || "-" },
      { id: "pack_qty_total", header: "Pack Qty", accessorKey: "pack_qty_total" },
      { id: "pack_qty_remaining", header: "Remaining", accessorKey: "pack_qty_remaining" },
      { id: "pack_barcode_raw", header: "Raw 2D", accessorKey: "pack_barcode_raw" },
    ],
    []
  );

  return (
    <PageLayout
      title="Inbound Material Packs"
      subtitle={
        <div className="flex items-center gap-2">
          <span>Vendor pack reception and DO matching</span>
        </div>
      }
      icon="shipping-status"
      iconColor="blue"
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
                title="Receive New Pack"
                aria-label="Receive New Pack"
              >
                <Plus className="h-4 w-4 mr-2" />
                Receive Pack
              </Button>
            }
          />
        </Section>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Receive Vendor Pack</DialogTitle>
            <DialogDescription>Enter pack details and raw barcode.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label>Vendor *</Label>
              <Controller
                name="vendor_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger className={errors.vendor_id ? "border-destructive" : ""}>
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
                )}
              />
              {errors.vendor_id && <p className="text-sm text-destructive">{errors.vendor_id.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label>DO Number</Label>
              <Controller
                name="do_number"
                control={control}
                render={({ field }) => <Input {...field} value={field.value || ""} placeholder="D0001" />}
              />
            </div>

            <div className="grid gap-2">
              <Label>Parser Key</Label>
              <Controller
                name="parser_key"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {parsers.map((p: SupplierPackParserInfo) => (
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
              <Label>Part Number</Label>
              <Controller
                name="part_number"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || NONE}
                    onValueChange={(val) => {
                      const v = val === NONE ? "" : val;
                      field.onChange(v);
                      const nextProfile = profiles.find(
                        (p: SupplierPartProfile) =>
                          (p.vendor_id ?? p.supplier_id) === watch("vendor_id") && p.part_number === v && p.is_active
                      );
                      if (nextProfile) {
                        setValue("parser_key", nextProfile.parser_key || "GENERIC");
                        setValue(
                          "vendor_part_number",
                          nextProfile.vendor_part_number || nextProfile.supplier_part_number || ""
                        );
                        if (nextProfile.default_pack_qty) setValue("pack_qty_total", nextProfile.default_pack_qty);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Manual input" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Manual input</SelectItem>
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

            <div className="grid gap-2">
              <Label>Vendor Part Number</Label>
              {vendorProfiles.length ? (
                <Controller
                  name="vendor_part_number"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || NONE}
                      onValueChange={(val) => {
                        const next = val === NONE ? "" : val;
                        field.onChange(next);
                        const matched = vendorProfiles.find(
                          (p: SupplierPartProfile) => (p.vendor_part_number || p.supplier_part_number) === next
                        );
                        if (matched) {
                          setValue("parser_key", matched.parser_key || "GENERIC");
                          if (matched.default_pack_qty) setValue("pack_qty_total", matched.default_pack_qty);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Not specified" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Not specified</SelectItem>
                        {vendorProfiles.map((profile: SupplierPartProfile) => (
                          <SelectItem
                            key={profile.id}
                            value={profile.vendor_part_number || profile.supplier_part_number || ""}
                          >
                            {profile.vendor_part_number || profile.supplier_part_number || "(empty mapping)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              ) : (
                <Controller
                  name="vendor_part_number"
                  control={control}
                  render={({ field }) => <Input {...field} value={field.value || ""} />}
                />
              )}
            </div>

            <div className="grid gap-2">
              <Label>Vendor Lot</Label>
              <Controller
                name="vendor_lot"
                control={control}
                render={({ field }) => <Input {...field} value={field.value || ""} />}
              />
            </div>

            <div className="grid gap-2">
              <Label>Pack Quantity</Label>
              <Controller
                name="pack_qty_total"
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    value={field.value?.toString() ?? ""}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className={errors.pack_qty_total ? "border-destructive" : ""}
                  />
                )}
              />
              {errors.pack_qty_total && <p className="text-sm text-destructive">{errors.pack_qty_total.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label>Production Date</Label>
              <Controller
                name="production_date"
                control={control}
                render={({ field }) => <Input {...field} value={field.value || ""} placeholder="YYYY-MM-DD" />}
              />
            </div>

            <div className="grid gap-2">
              <Label>Pack 2D Barcode Raw *</Label>
              <Controller
                name="pack_barcode_raw"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value || ""}
                    className={errors.pack_barcode_raw ? "border-destructive" : ""}
                  />
                )}
              />
              {errors.pack_barcode_raw && <p className="text-sm text-destructive">{errors.pack_barcode_raw.message}</p>}
            </div>

            {selectedProfile && (
              <p className="text-sm text-muted-foreground mt-1">
                Active profile: parser `{selectedProfile.parser_key}`{" "}
                {selectedProfile.default_pack_qty ? `| default pack ${selectedProfile.default_pack_qty}` : ""}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={(e) => handleSubmit((values) => receiveMutation.mutate(values))(e as any)}
              disabled={receiveMutation.isPending}
            >
              {receiveMutation.isPending ? "Receiving..." : "Receive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
