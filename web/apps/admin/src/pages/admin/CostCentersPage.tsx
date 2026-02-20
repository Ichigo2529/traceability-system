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
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/money-bills.js";
import {
  AdminCostCenter,
  getCostCenters,
  createCostCenter,
  updateCostCenter,
  deleteCostCenter,
} from "../../lib/section-api";

const GROUP_CODES = ["DL", "IDL", "DIS", "ADM"] as const;

const schema = z.object({
  group_code: z.enum(GROUP_CODES),
  cost_code: z.string().min(1, "Required"),
  short_text: z.string().min(1, "Required"),
  is_active: z.boolean().default(true),
});
type CostCenterForm = z.infer<typeof schema>;

export function CostCentersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCostCenter | null>(null);
  const [disableTarget, setDisableTarget] = useState<AdminCostCenter | null>(null);
  const { showToast, ToastComponent } = useToast();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-cost-centers"],
    queryFn: getCostCenters,
  });

  const form = useForm<CostCenterForm>({
    resolver: zodResolver(schema),
    defaultValues: { group_code: "DL", cost_code: "", short_text: "", is_active: true },
  });

  const createMut = useMutation({
    mutationFn: (p: CostCenterForm) => createCostCenter(p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cost-centers"] });
      setOpen(false);
      form.reset({ group_code: "DL", cost_code: "", short_text: "", is_active: true });
      showToast("Cost center created");
    },
  });

  const updateMut = useMutation({
    mutationFn: (p: CostCenterForm) => updateCostCenter(editing!.id, p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cost-centers"] });
      setOpen(false);
      setEditing(null);
      showToast("Cost center updated");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCostCenter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cost-centers"] });
      showToast("Cost center disabled");
    },
  });

  const columns = useMemo<ColumnDef<AdminCostCenter>[]>(
    () => [
      { header: "Group", accessorKey: "group_code", size: 90 },
      { header: "Cost Code", accessorKey: "cost_code", size: 160 },
      { header: "Short Text", accessorKey: "short_text" },
      {
        header: "Status",
        size: 100,
        cell: ({ row }) => <StatusBadge status={row.original.is_active ? "active" : "disabled"} />,
      },
      {
        header: "Actions",
        size: 110,
        cell: ({ row }) => (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              icon="edit"
              design="Transparent"
              onClick={() => {
                setEditing(row.original);
                form.reset({
                  group_code: row.original.group_code as any,
                  cost_code: row.original.cost_code,
                  short_text: row.original.short_text,
                  is_active: row.original.is_active,
                });
                setOpen(true);
              }}
              tooltip="Edit"
              aria-label="Edit cost center"
            />
            <Button
              icon="delete"
              design="Transparent"
              onClick={() => setDisableTarget(row.original)}
              tooltip="Disable"
              aria-label="Disable cost center"
            />
          </div>
        ),
      },
    ],
    [form]
  );

  return (
    <PageLayout
      title="Cost Centers"
      subtitle={
        <FlexBox alignItems={FlexBoxAlignItems.Center}>
          <span className="indicator-live" />
          <span>Manage cost center codes by group</span>
        </FlexBox>
      }
      icon="money-bills"
      iconColor="green"
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
          filterPlaceholder="Search cost centers..."
          actions={
            <Button
              icon="add"
              design="Emphasized"
              className="button-hover-scale"
              onClick={() => {
                setEditing(null);
                form.reset({ group_code: "DL", cost_code: "", short_text: "", is_active: true });
                setOpen(true);
              }}
            >
              Add Cost Center
            </Button>
          }
        />
      </div>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Cost Center" : "Create Cost Center"}
        onSubmit={form.handleSubmit((p) => (editing ? updateMut.mutate(p) : createMut.mutate(p)))}
        submitting={createMut.isPending || updateMut.isPending}
      >
        <Form layout="S1 M1 L1 XL1" labelSpan="S12 M12 L12 XL12">
          <FormItem labelContent={<Label required>Group Code</Label>}>
            <Controller
              name="group_code"
              control={form.control}
              render={({ field }) => (
                <Select
                  onChange={(e) =>
                    field.onChange(e.detail.selectedOption.getAttribute("data-value"))
                  }
                >
                  {GROUP_CODES.map((gc) => (
                    <Option key={gc} data-value={gc} selected={field.value === gc}>
                      {gc}
                    </Option>
                  ))}
                </Select>
              )}
            />
          </FormItem>
          <FormItem labelContent={<Label required>Cost Code</Label>}>
            <Input
              value={form.watch("cost_code")}
              onInput={(e: any) => form.setValue("cost_code", e.target.value)}
            />
          </FormItem>
          <FormItem labelContent={<Label required>Short Text</Label>}>
            <Input
              value={form.watch("short_text")}
              onInput={(e: any) => form.setValue("short_text", e.target.value)}
            />
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
        open={Boolean(disableTarget)}
        title="Disable cost center"
        description={disableTarget ? `Disable cost center "${disableTarget.cost_code} - ${disableTarget.short_text}"?` : ""}
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
