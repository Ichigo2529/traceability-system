import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Text,
  Dialog,
  Bar,
  Table,
  TableRow,
  TableCell,
  TableHeaderRow,
  TableHeaderCell,
  MessageStrip,
} from "@ui5/webcomponents-react";
import { Badge } from "../../components/ui/badge";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/org-chart.js";
import "@ui5/webcomponents-icons/dist/favorite.js";
import "@ui5/webcomponents-icons/dist/unfavorite.js";
import {
  AdminSection,
  SectionCostCenterMapping,
  getSections,
  createSection,
  updateSection,
  deleteSection,
  getCostCenters,
  addSectionCostCenter,
  removeSectionCostCenter,
  setSectionDefaultCC,
} from "../../lib/section-api";

const schema = z.object({
  section_code: z.string().min(1, "Required"),
  section_name: z.string().min(1, "Required"),
  is_active: z.boolean().default(true),
});
type SectionForm = z.infer<typeof schema>;

export function SectionsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSection | null>(null);
  const [disableTarget, setDisableTarget] = useState<AdminSection | null>(null);
  const [mappingTarget, setMappingTarget] = useState<AdminSection | null>(null);
  const [addCCId, setAddCCId] = useState("");
  const [addCCDefault, setAddCCDefault] = useState(false);
  const { showToast, ToastComponent } = useToast();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-sections"],
    queryFn: getSections,
  });

  const { data: allCostCenters = [] } = useQuery({
    queryKey: ["admin-cost-centers"],
    queryFn: getCostCenters,
  });

  const form = useForm<SectionForm>({
    resolver: zodResolver(schema),
    defaultValues: { section_code: "", section_name: "", is_active: true },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-sections"] });

  const createMut = useMutation({
    mutationFn: (p: SectionForm) => createSection(p),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      form.reset({ section_code: "", section_name: "", is_active: true });
      showToast("Section created");
    },
  });

  const updateMut = useMutation({
    mutationFn: (p: SectionForm) => updateSection(editing!.id, p),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setEditing(null);
      showToast("Section updated");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSection(id),
    onSuccess: () => {
      invalidate();
      showToast("Section disabled");
    },
  });

  const addMappingMut = useMutation({
    mutationFn: ({ sectionId, ccId, isDefault }: { sectionId: string; ccId: string; isDefault: boolean }) =>
      addSectionCostCenter(sectionId, { cost_center_id: ccId, is_default: isDefault }),
    onSuccess: () => {
      invalidate();
      setAddCCId("");
      setAddCCDefault(false);
      showToast("Cost center mapped");
    },
  });

  const removeMappingMut = useMutation({
    mutationFn: ({ sectionId, ccId }: { sectionId: string; ccId: string }) => removeSectionCostCenter(sectionId, ccId),
    onSuccess: () => {
      invalidate();
      showToast("Mapping removed");
    },
  });

  const setDefaultMut = useMutation({
    mutationFn: ({ sectionId, ccId }: { sectionId: string; ccId: string }) => setSectionDefaultCC(sectionId, ccId),
    onSuccess: () => {
      invalidate();
      showToast("Default cost center updated");
    },
  });

  // Refresh mappingTarget data when sections reload
  const liveMappingTarget = mappingTarget ? (rows.find((r) => r.id === mappingTarget.id) ?? mappingTarget) : null;

  const mappedCCIds = new Set(liveMappingTarget?.cost_centers?.map((m) => m.cost_center_id) ?? []);
  const availableCCs = allCostCenters.filter((cc) => cc.is_active && !mappedCCIds.has(cc.id));

  const columns = useMemo<ColumnDef<AdminSection>[]>(
    () => [
      { header: "Code", accessorKey: "section_code", size: 120 },
      { header: "Name", accessorKey: "section_name" },
      {
        header: "Cost Centers",
        size: 140,
        cell: ({ row }) => {
          const count = row.original.cost_centers?.length ?? 0;
          const def = row.original.cost_centers?.find((m) => m.is_default);
          return (
            <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
              <Badge variant="secondary">{count}</Badge>
              {def ? <Text style={{ fontSize: "0.75rem", opacity: 0.7 }}>default: {def.cost_code}</Text> : null}
            </FlexBox>
          );
        },
      },
      {
        header: "Status",
        size: 100,
        cell: ({ row }) => <StatusBadge status={row.original.is_active ? "active" : "disabled"} />,
      },
      {
        header: "Actions",
        size: 160,
        cell: ({ row }) => (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              icon="money-bills"
              design="Transparent"
              onClick={() => {
                setMappingTarget(row.original);
                setAddCCId("");
                setAddCCDefault(false);
              }}
              tooltip="Manage cost centers"
              aria-label="Manage cost centers"
            />
            <Button
              icon="edit"
              design="Transparent"
              onClick={() => {
                setEditing(row.original);
                form.reset({
                  section_code: row.original.section_code,
                  section_name: row.original.section_name,
                  is_active: row.original.is_active,
                });
                setOpen(true);
              }}
              tooltip="Edit"
              aria-label="Edit section"
            />
            <Button
              icon="delete"
              design="Transparent"
              onClick={() => setDisableTarget(row.original)}
              tooltip="Disable"
              aria-label="Disable section"
            />
          </div>
        ),
      },
    ],
    [form]
  );

  return (
    <PageLayout
      title="Sections"
      subtitle={
        <FlexBox alignItems={FlexBoxAlignItems.Center}>
          <span className="indicator-live" />
          <span>Organizational sections and cost center mappings</span>
        </FlexBox>
      }
      icon="org-chart"
      iconColor="indigo"
    >
      <div className="page-container">
        <ApiErrorBanner
          message={
            createMut.error
              ? formatApiError(createMut.error)
              : updateMut.error
                ? formatApiError(updateMut.error)
                : deleteMut.error
                  ? formatApiError(deleteMut.error)
                  : undefined
          }
        />
        <DataTable
          data={rows}
          columns={columns}
          loading={isLoading}
          filterPlaceholder="Search sections..."
          actions={
            <Button
              icon="add"
              design="Emphasized"
              className="button-hover-scale"
              onClick={() => {
                setEditing(null);
                form.reset({ section_code: "", section_name: "", is_active: true });
                setOpen(true);
              }}
            >
              Add Section
            </Button>
          }
        />
      </div>

      {/* Create/Edit Section Dialog */}
      <FormDialog
        open={open}
        onClose={() => {
          setOpen(false);
          createMut.reset();
          updateMut.reset();
        }}
        title={editing ? "Edit Section" : "Create Section"}
        onSubmit={form.handleSubmit((p) => (editing ? updateMut.mutate(p) : createMut.mutate(p)))}
        submitting={createMut.isPending || updateMut.isPending}
      >
        {(createMut.isError || updateMut.isError) && (
          <MessageStrip design="Negative" hideCloseButton style={{ margin: "0 1rem" }}>
            {formatApiError(createMut.error ?? updateMut.error)}
          </MessageStrip>
        )}
        <Form layout="S1 M1 L1 XL1" labelSpan="S12 M12 L12 XL12">
          <FormItem labelContent={<Label required>Section Code</Label>}>
            <Input
              value={form.watch("section_code")}
              onInput={(e: any) => form.setValue("section_code", e.target.value)}
              valueState={form.formState.errors.section_code ? "Negative" : undefined}
              valueStateMessage={
                form.formState.errors.section_code ? (
                  <span>{form.formState.errors.section_code.message}</span>
                ) : undefined
              }
            />
          </FormItem>
          <FormItem labelContent={<Label required>Section Name</Label>}>
            <Input
              value={form.watch("section_name")}
              onInput={(e: any) => form.setValue("section_name", e.target.value)}
              valueState={form.formState.errors.section_name ? "Negative" : undefined}
              valueStateMessage={
                form.formState.errors.section_name ? (
                  <span>{form.formState.errors.section_name.message}</span>
                ) : undefined
              }
            />
          </FormItem>
          <FormItem labelContent={<Label>Status</Label>}>
            <Controller
              name="is_active"
              control={form.control}
              render={({ field }) => (
                <CheckBox text="Active" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
              )}
            />
          </FormItem>
        </Form>
      </FormDialog>

      {/* Cost Center Mapping Dialog */}
      <Dialog
        open={Boolean(liveMappingTarget)}
        onClose={() => setMappingTarget(null)}
        headerText={`Cost Centers — ${liveMappingTarget?.section_name ?? ""}`}
        footer={
          <Bar
            endContent={
              <Button design="Transparent" onClick={() => setMappingTarget(null)}>
                Close
              </Button>
            }
          />
        }
        style={{ width: "min(640px, 90vw)" }}
      >
        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {addMappingMut.error ? (
            <MessageStrip design="Negative" hideCloseButton>
              {formatApiError(addMappingMut.error)}
            </MessageStrip>
          ) : null}
          {removeMappingMut.error ? (
            <MessageStrip design="Negative" hideCloseButton>
              {formatApiError(removeMappingMut.error)}
            </MessageStrip>
          ) : null}

          {/* Add mapping row */}
          <FlexBox alignItems={FlexBoxAlignItems.End} style={{ gap: "0.75rem" }} wrap="Wrap">
            <div style={{ flex: 1, minWidth: "200px" }}>
              <Label>Add Cost Center</Label>
              <Select
                onChange={(e) => setAddCCId(e.detail.selectedOption.getAttribute("data-value") ?? "")}
                style={{ width: "100%" }}
              >
                <Option data-value="">-- Select --</Option>
                {availableCCs.map((cc) => (
                  <Option key={cc.id} data-value={cc.id} selected={addCCId === cc.id}>
                    {cc.group_code} | {cc.cost_code} - {cc.short_text}
                  </Option>
                ))}
              </Select>
            </div>
            <CheckBox
              text="Set as default"
              checked={addCCDefault}
              onChange={(e) => setAddCCDefault(e.target.checked)}
            />
            <Button
              design="Emphasized"
              icon="add"
              disabled={!addCCId || addMappingMut.isPending}
              onClick={() => {
                if (!liveMappingTarget || !addCCId) return;
                addMappingMut.mutate({ sectionId: liveMappingTarget.id, ccId: addCCId, isDefault: addCCDefault });
              }}
            >
              Add
            </Button>
          </FlexBox>

          {/* Mapped cost centers table */}
          {(liveMappingTarget?.cost_centers?.length ?? 0) === 0 ? (
            <Text style={{ opacity: 0.6, fontStyle: "italic" }}>No cost centers mapped yet.</Text>
          ) : (
            <Table
              headerRow={
                <TableHeaderRow>
                  <TableHeaderCell width="80px">
                    <Label style={{ fontWeight: "bold" }}>Group</Label>
                  </TableHeaderCell>
                  <TableHeaderCell width="130px">
                    <Label style={{ fontWeight: "bold" }}>Code</Label>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <Label style={{ fontWeight: "bold" }}>Short Text</Label>
                  </TableHeaderCell>
                  <TableHeaderCell width="90px">
                    <Label style={{ fontWeight: "bold" }}>Default</Label>
                  </TableHeaderCell>
                  <TableHeaderCell width="100px">
                    <Label style={{ fontWeight: "bold" }}>Actions</Label>
                  </TableHeaderCell>
                </TableHeaderRow>
              }
            >
              {(liveMappingTarget?.cost_centers ?? []).map((m: SectionCostCenterMapping) => (
                <TableRow key={m.cost_center_id}>
                  <TableCell>
                    <Text>{m.group_code}</Text>
                  </TableCell>
                  <TableCell>
                    <Text>{m.cost_code}</Text>
                  </TableCell>
                  <TableCell>
                    <Text>{m.short_text}</Text>
                  </TableCell>
                  <TableCell>
                    {m.is_default ? (
                      <Badge variant="success">Default</Badge>
                    ) : (
                      <Button
                        icon="favorite"
                        design="Transparent"
                        tooltip="Set as default"
                        aria-label="Set as default cost center"
                        disabled={setDefaultMut.isPending}
                        onClick={() => {
                          if (!liveMappingTarget) return;
                          setDefaultMut.mutate({ sectionId: liveMappingTarget.id, ccId: m.cost_center_id });
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      icon="delete"
                      design="Transparent"
                      tooltip="Remove mapping"
                      aria-label="Remove cost center mapping"
                      disabled={removeMappingMut.isPending}
                      onClick={() => {
                        if (!liveMappingTarget) return;
                        removeMappingMut.mutate({ sectionId: liveMappingTarget.id, ccId: m.cost_center_id });
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          )}
        </div>
      </Dialog>

      {/* Disable Confirm */}
      <ConfirmDialog
        open={Boolean(disableTarget)}
        title="Disable section"
        description={disableTarget ? `Disable section "${disableTarget.section_name}"?` : ""}
        confirmText="Disable"
        destructive
        submitting={deleteMut.isPending}
        onCancel={() => setDisableTarget(null)}
        onConfirm={() => {
          if (!disableTarget) return;
          deleteMut.mutate(disableTarget.id, {
            onSuccess: () => setDisableTarget(null),
          });
        }}
      />
      <ToastComponent />
    </PageLayout>
  );
}
