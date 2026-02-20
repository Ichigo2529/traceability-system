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
import {
  Button,
  Input,
  CheckBox,
  Label,
  Form,
  FormItem,
  TextArea,
  Card,
  CardHeader,
  FlexBox,
  FlexBoxDirection
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/bar-code.js";
import "@ui5/webcomponents-icons/dist/simulate.js";

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

export function BarcodeTemplatesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BarcodeTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BarcodeTemplate | null>(null);
  const [parseResult, setParseResult] = useState<Record<string, unknown> | null>(null);
  const { showToast, ToastComponent } = useToast();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["barcode-templates"],
    queryFn: () => sdk.admin.getBarcodeTemplates(),
  });

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

  const errorMessage =
    createMutation.error
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
      { header: "Key", accessorKey: "key" },
      { header: "Name", accessorKey: "name" },
      { header: "Identifiers", cell: ({ row }) => row.original.identifiers.join(", ") },
      { header: "Version", accessorKey: "version" },
      {
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.is_active ? "active" : "disabled"} />,
      },
      {
        header: "Actions",
        cell: ({ row }) => (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              icon="edit"
              design="Transparent"
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
              tooltip="Edit Template"
              aria-label="Edit Template"
            />
            <Button 
                icon="delete" 
                design="Transparent" 
                onClick={() => setDeleteTarget(row.original)} 
                tooltip="Delete Template"
                aria-label="Delete Template"
            />
          </div>
        ),
      },
    ],
    [form]
  );

  return (
    <PageLayout
      title="Barcode Template Master"
      subtitle="Configurable 2D barcode parsing templates by vendor/component without code changes"
      icon="bar-code"
      iconColor="indigo"
    >
      <div className="page-container">
        <ApiErrorBanner message={errorMessage} />

        <DataTable 
            data={rows} 
            columns={columns} 
            loading={isLoading}
            filterPlaceholder="Search template..." 
            actions={
                <Button
                  icon="add"
                  design="Emphasized"
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
                  Add Template
                </Button>
            }
        />

        <Card 
          style={{ marginTop: "2rem" }}
          header={<CardHeader titleText="Parse Tester" subtitleText="Test your barcode templates in real-time" />}
        >
          <div style={{ padding: "1rem" }}>
              <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: "1rem", alignItems: "end" }}>
                   <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <Label>Parser Key</Label>
                        <Input placeholder="MARLIN_PLATE_V1" {...parserForm.register("parser_key")} />
                   </div>
                   <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <Label>Raw Barcode</Label>
                        <Input placeholder="Raw 2D barcode text" {...parserForm.register("pack_barcode_raw")} />
                   </div>
                   <Button 
                      icon="simulate" 
                      className="button-hover-scale"
                      onClick={(e) => parserForm.handleSubmit((values) => testParseMutation.mutate(values))(e as any)} 
                      disabled={testParseMutation.isPending}
                    >
                      Test Parse
                    </Button>
                </div>

                {parseResult && (
                    <div style={{ marginTop: "1rem" }}>
                        <Label style={{ marginBottom: "0.5rem", display: "block" }}>Result</Label>
                        <TextArea 
                            rows={10} 
                            readonly 
                            value={JSON.stringify(parseResult, null, 2)} 
                            style={{ width: "100%", fontFamily: "monospace" }} 
                        />
                    </div>
                )}
              </FlexBox>
          </div>
        </Card>
      </div>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Barcode Template" : "Create Barcode Template"}
        onSubmit={form.handleSubmit((values) => (editing ? updateMutation.mutate(values) : createMutation.mutate(values)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <Form layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12">
          <FormItem labelContent={<Label>Template Key</Label>}>
            <Input {...form.register("key")} placeholder="MARLIN_MAGNET_V2" />
          </FormItem>
          <FormItem labelContent={<Label>Template Name</Label>}>
            <Input {...form.register("name")} placeholder="Marlin Magnet v2" />
          </FormItem>
          <FormItem labelContent={<Label>Identifiers</Label>}>
            <Input {...form.register("identifiers")} placeholder="K,3S,P,E,Q,V,PD,PL,D,PT,R" />
          </FormItem>
          <FormItem labelContent={<Label>Lot Identifiers</Label>}>
            <Input {...form.register("lot_identifiers")} placeholder="PT,PL,LOT" />
          </FormItem>
          <FormItem labelContent={<Label>Quantity Identifiers</Label>}>
            <Input {...form.register("quantity_identifiers")} placeholder="Q" />
          </FormItem>
          <FormItem labelContent={<Label>Part Identifiers</Label>}>
            <Input {...form.register("part_identifiers")} placeholder="P" />
          </FormItem>
          <FormItem labelContent={<Label>Vendor Identifiers</Label>}>
            <Input {...form.register("vendor_identifiers")} placeholder="V" />
          </FormItem>
          <FormItem labelContent={<Label>Production Date Identifiers</Label>}>
            <Input {...form.register("production_date_identifiers")} placeholder="PD,D,TD,MD" />
          </FormItem>
          <FormItem labelContent={<Label>Notes</Label>} style={{ gridColumn: "span 2" }}>
            <TextArea rows={3} {...form.register("notes")} />
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
      <ToastComponent />
    </PageLayout>
  );
}

