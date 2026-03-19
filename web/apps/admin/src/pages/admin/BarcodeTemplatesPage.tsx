import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { BarcodeTemplate } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { PageLayout } from "@traceability/ui";
import { useToast } from "../../hooks/useToast";
import { Button } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Pencil, Copy, Play } from "lucide-react";

const schema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  identifiers: z.string().min(1),
  lot_identifiers: z.string().default("LOT,PT,PL"),
  quantity_identifiers: z.string().default("Q"),
  part_identifiers: z.string().default("P"),
  vendor_identifiers: z.string().default("V"),
  production_date_identifiers: z.string().default("PD,D,TD,MD"),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});

const parserSchema = z.object({
  parser_key: z.string().min(1),
  pack_barcode_raw: z.string().min(1),
});

type TemplateForm = z.infer<typeof schema>;
type ParserForm = z.infer<typeof parserSchema>;

function csvToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item) => item.length > 0);
}

function listToCsv(value?: string[] | null) {
  return (value ?? []).join(",");
}

function toCloneKey(key: string) {
  const base = `${key.trim().toUpperCase()}_CUSTOM`;
  return base.length <= 80 ? base : base.slice(0, 80);
}

export function BarcodeTemplatesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BarcodeTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BarcodeTemplate | null>(null);
  const [parseResult, setParseResult] = useState<Record<string, unknown> | null>(null);
  const { showToast } = useToast();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["barcode-templates"],
    queryFn: () => sdk.admin.getBarcodeTemplates(),
  });

  const openCloneDialog = (item: BarcodeTemplate) => {
    setEditing(null);
    form.reset({
      key: toCloneKey(item.key),
      name: `${item.name} (Custom)`,
      identifiers: listToCsv(item.identifiers),
      lot_identifiers: listToCsv(item.lot_identifiers),
      quantity_identifiers: listToCsv(item.quantity_identifiers),
      part_identifiers: listToCsv(item.part_identifiers),
      vendor_identifiers: listToCsv(item.vendor_identifiers),
      production_date_identifiers: listToCsv(item.production_date_identifiers),
      notes: item.notes ?? "",
      is_active: true,
    });
    setOpen(true);
  };

  const form = useForm<TemplateForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      key: "",
      name: "",
      identifiers: "P,Q,V,PD,PT,PL,D,R",
      lot_identifiers: "LOT,PT,PL",
      quantity_identifiers: "Q",
      part_identifiers: "P",
      vendor_identifiers: "V",
      production_date_identifiers: "PD,D,TD,MD",
      notes: "",
      is_active: true,
    },
  });

  const parserForm = useForm<ParserForm>({
    resolver: zodResolver(parserSchema),
    defaultValues: {
      parser_key: "GENERIC",
      pack_barcode_raw: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: TemplateForm) =>
      sdk.admin.createBarcodeTemplate({
        key: values.key.trim().toUpperCase(),
        name: values.name.trim(),
        identifiers: csvToList(values.identifiers),
        lot_identifiers: csvToList(values.lot_identifiers),
        quantity_identifiers: csvToList(values.quantity_identifiers),
        part_identifiers: csvToList(values.part_identifiers),
        vendor_identifiers: csvToList(values.vendor_identifiers),
        production_date_identifiers: csvToList(values.production_date_identifiers),
        notes: values.notes || undefined,
        is_active: values.is_active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barcode-templates"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-pack-parsers"] });
      setOpen(false);
      form.reset({
        key: "",
        name: "",
        identifiers: "P,Q,V,PD,PT,PL,D,R",
        lot_identifiers: "LOT,PT,PL",
        quantity_identifiers: "Q",
        part_identifiers: "P",
        vendor_identifiers: "V",
        production_date_identifiers: "PD,D,TD,MD",
        notes: "",
        is_active: true,
      });
      showToast("Template created successfully");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: TemplateForm) =>
      sdk.admin.updateBarcodeTemplate(editing!.id, {
        key: values.key.trim().toUpperCase(),
        name: values.name.trim(),
        identifiers: csvToList(values.identifiers),
        lot_identifiers: csvToList(values.lot_identifiers),
        quantity_identifiers: csvToList(values.quantity_identifiers),
        part_identifiers: csvToList(values.part_identifiers),
        vendor_identifiers: csvToList(values.vendor_identifiers),
        production_date_identifiers: csvToList(values.production_date_identifiers),
        notes: values.notes || undefined,
        is_active: values.is_active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barcode-templates"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-pack-parsers"] });
      setOpen(false);
      setEditing(null);
      showToast("Template updated successfully");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteBarcodeTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barcode-templates"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-pack-parsers"] });
      showToast("Template deleted");
    },
  });

  const testParseMutation = useMutation({
    mutationFn: (values: ParserForm) =>
      sdk.admin.testBarcodeTemplateParse({
        parser_key: values.parser_key.trim().toUpperCase(),
        pack_barcode_raw: values.pack_barcode_raw,
      }),
    onSuccess: (result) => {
      setParseResult(result);
      showToast("Parser tested successfully");
    },
  });

  const errorMessage = createMutation.error
    ? formatApiError(createMutation.error)
    : updateMutation.error
      ? formatApiError(updateMutation.error)
      : deleteMutation.error
        ? formatApiError(deleteMutation.error)
        : testParseMutation.error
          ? formatApiError(testParseMutation.error)
          : undefined;

  const columns = useMemo<ColumnDef<BarcodeTemplate>[]>(
    () => [
      { id: "key", header: "Key", accessorKey: "key" },
      { id: "name", header: "Name", accessorKey: "name" },
      { id: "identifiers", header: "Identifiers", cell: ({ row }) => row.original.identifiers.join(", ") },
      { id: "version", header: "Version", accessorKey: "version" },
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
            {row.original.is_system || row.original.source === "SYSTEM" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => openCloneDialog(row.original)}
                title="Clone as Custom Template"
                aria-label="Clone as Custom Template"
              >
                <Copy className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const item = row.original;
                    setEditing(item);
                    form.reset({
                      key: item.key,
                      name: item.name,
                      identifiers: listToCsv(item.identifiers),
                      lot_identifiers: listToCsv(item.lot_identifiers),
                      quantity_identifiers: listToCsv(item.quantity_identifiers),
                      part_identifiers: listToCsv(item.part_identifiers),
                      vendor_identifiers: listToCsv(item.vendor_identifiers),
                      production_date_identifiers: listToCsv(item.production_date_identifiers),
                      notes: item.notes ?? "",
                      is_active: item.is_active,
                    });
                    setOpen(true);
                  }}
                  title="Edit Template"
                  aria-label="Edit Template"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <DeleteIconButton
                  onClick={() => setDeleteTarget(row.original)}
                  title="Delete Template"
                  aria-label="Delete Template"
                />
              </>
            )}
          </div>
        ),
      },
    ],
    [form]
  );

  return (
    <PageLayout
      title="Barcode Templates"
      subtitle={
        <div className="flex items-center gap-2">
          <span>GS1-128 and 2D barcode parsing rules</span>
        </div>
      }
      icon="bar-code"
      iconColor="indigo"
    >
      <div className="page-container">
        <ApiErrorBanner message={errorMessage} />
        {rows.length === 0 && !isLoading && (
          <Alert className="mb-3">
            <AlertDescription>
              No custom barcode templates yet. You can add one, or use built-in parser keys in the Parse Tester.
            </AlertDescription>
          </Alert>
        )}

        <DataTable
          data={rows}
          columns={columns}
          loading={isLoading}
          filterPlaceholder="Search template..."
          actions={
            <Button
              className="button-hover-scale"
              onClick={() => {
                setEditing(null);
                form.reset({
                  key: "",
                  name: "",
                  identifiers: "P,Q,V,PD,PT,PL,D,R",
                  lot_identifiers: "LOT,PT,PL",
                  quantity_identifiers: "Q",
                  part_identifiers: "P",
                  vendor_identifiers: "V",
                  production_date_identifiers: "PD,D,TD,MD",
                  notes: "",
                  is_active: true,
                });
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          }
        />

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Parse Tester</CardTitle>
            <CardDescription>Test your barcode templates in real-time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-3 grid gap-2">
                  <Label>Parser Key *</Label>
                  <Input
                    placeholder="MARLIN_PLATE_V1"
                    {...parserForm.register("parser_key")}
                    className={parserForm.formState.errors.parser_key ? "border-destructive" : ""}
                  />
                  {parserForm.formState.errors.parser_key && (
                    <p className="text-sm text-destructive">{parserForm.formState.errors.parser_key.message}</p>
                  )}
                </div>
                <div className="md:col-span-6 grid gap-2">
                  <Label>Raw Barcode *</Label>
                  <Input
                    placeholder="Raw 2D barcode text"
                    {...parserForm.register("pack_barcode_raw")}
                    className={parserForm.formState.errors.pack_barcode_raw ? "border-destructive" : ""}
                  />
                  {parserForm.formState.errors.pack_barcode_raw && (
                    <p className="text-sm text-destructive">{parserForm.formState.errors.pack_barcode_raw.message}</p>
                  )}
                </div>
                <div className="md:col-span-3">
                  <Button
                    className="button-hover-scale w-full md:w-auto"
                    onClick={(e) => parserForm.handleSubmit((values) => testParseMutation.mutate(values))(e as any)}
                    disabled={testParseMutation.isPending}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Test Parse
                  </Button>
                </div>
              </div>

              {parseResult && (
                <div className="mt-4 grid gap-2">
                  <Label className="block">Result</Label>
                  <Textarea
                    rows={10}
                    readOnly
                    value={JSON.stringify(parseResult, null, 2)}
                    className="w-full font-mono text-sm"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Barcode Template" : "Create Barcode Template"}
        onSubmit={form.handleSubmit((values) =>
          editing ? updateMutation.mutate(values) : createMutation.mutate(values)
        )}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Template Key</Label>
            <Input {...form.register("key")} placeholder="MARLIN_MAGNET_V2" />
          </div>
          <div className="grid gap-2">
            <Label>Template Name</Label>
            <Input {...form.register("name")} placeholder="Marlin Magnet v2" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Identifiers</Label>
            <Input {...form.register("identifiers")} placeholder="K,3S,P,E,Q,V,PD,PL,D,PT,R" />
          </div>
          <div className="grid gap-2">
            <Label>Lot Identifiers</Label>
            <Input {...form.register("lot_identifiers")} placeholder="PT,PL,LOT" />
          </div>
          <div className="grid gap-2">
            <Label>Quantity Identifiers</Label>
            <Input {...form.register("quantity_identifiers")} placeholder="Q" />
          </div>
          <div className="grid gap-2">
            <Label>Part Identifiers</Label>
            <Input {...form.register("part_identifiers")} placeholder="P" />
          </div>
          <div className="grid gap-2">
            <Label>Vendor Identifiers</Label>
            <Input {...form.register("vendor_identifiers")} placeholder="V" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Production Date Identifiers</Label>
            <Input {...form.register("production_date_identifiers")} placeholder="PD,D,TD,MD" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea rows={3} {...form.register("notes")} className="resize-none" />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Controller
              name="is_active"
              control={form.control}
              render={({ field }) => (
                <Checkbox id="barcode-active" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="barcode-active" className="cursor-pointer font-normal">
              Active
            </Label>
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete barcode template"
        description={deleteTarget ? `Delete template ${deleteTarget.key}?` : ""}
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
