import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Role, User, WorkflowApprovalConfig } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { DataTable } from "../../components/shared/DataTable";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { PageLayout, Section } from "@traceability/ui";
import { useToast } from "../../hooks/useToast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Save, ArrowRight } from "lucide-react";
import { FormDialog } from "../../components/shared/FormDialog";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";

const NONE = "__none__";

const schema = z.object({
  flow_code: z.string().min(2),
  flow_name: z.string().min(2),
  from_status: z.string().min(2),
  to_status: z.string().min(2),
  level: z.coerce.number().int().min(1).max(3),
  approver_role_id: z.string().optional(),
  active: z.boolean().default(true),
});

type ApprovalForm = z.infer<typeof schema>;

type TransitionView = {
  flowCode: string;
  flowName: string;
  rows: WorkflowApprovalConfig[];
};

type ApproverRow = {
  user_id: string;
  email: string;
  is_default: boolean;
};

const EMPTY_APPROVER_ROW: ApproverRow = {
  user_id: "",
  email: "",
  is_default: false,
};

export function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkflowApprovalConfig | null>(null);
  const [heartbeatValue, setHeartbeatValue] = useState("2");
  const [approverRows, setApproverRows] = useState<ApproverRow[]>([{ ...EMPTY_APPROVER_ROW }]);
  const { showToast } = useToast();

  const { data: approvals = [], isLoading: approvalsLoading } = useQuery({
    queryKey: ["workflow-approvals"],
    queryFn: () => sdk.admin.getWorkflowApprovals(),
  });
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => sdk.admin.getRoles(),
  });
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => sdk.admin.getUsers(),
  });
  const { data: heartbeatSettings } = useQuery({
    queryKey: ["heartbeat-settings"],
    queryFn: () => sdk.admin.getHeartbeatSettings(),
  });

  useEffect(() => {
    if (heartbeatSettings) {
      setHeartbeatValue(String(heartbeatSettings.online_window_minutes));
    }
  }, [heartbeatSettings]);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ApprovalForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      flow_code: "MATERIAL_REQUEST_APPROVAL",
      flow_name: "Material Request Approval",
      from_status: "REQUESTED",
      to_status: "APPROVED",
      level: 1,
      approver_role_id: "",
      active: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: ApprovalForm) =>
      sdk.admin.createWorkflowApproval({
        flow_code: payload.flow_code,
        flow_name: payload.flow_name,
        from_status: payload.from_status,
        to_status: payload.to_status,
        level: payload.level,
        approver_role_id: payload.approver_role_id || null,
        active: payload.active,
        metadata: {
          approver_users: approverRows
            .filter((row) => row.user_id.trim())
            .map((row) => ({
              user_id: row.user_id,
              email: row.email.trim() || null,
              is_default: row.is_default,
            })),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-approvals"] });
      setOpen(false);
      showToast("Approval rule created successfully");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: ApprovalForm) =>
      sdk.admin.updateWorkflowApproval(editing!.id, {
        flow_code: payload.flow_code,
        flow_name: payload.flow_name,
        from_status: payload.from_status,
        to_status: payload.to_status,
        level: payload.level,
        approver_role_id: payload.approver_role_id || null,
        active: payload.active,
        metadata: {
          approver_users: approverRows
            .filter((row) => row.user_id.trim())
            .map((row) => ({
              user_id: row.user_id,
              email: row.email.trim() || null,
              is_default: row.is_default,
            })),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-approvals"] });
      setOpen(false);
      setEditing(null);
      showToast("Approval rule updated successfully");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteWorkflowApproval(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-approvals"] });
      showToast("Approval rule deleted");
    },
  });

  const heartbeatMutation = useMutation({
    mutationFn: (minutes: number) => sdk.admin.updateHeartbeatSettings(minutes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["heartbeat-settings"] });
      setHeartbeatValue(String(data.online_window_minutes));
      showToast("Heartbeat settings updated");
    },
  });

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const roleMap = useMemo(
    () => roles.reduce<Record<string, Role>>((acc, role) => ({ ...acc, [role.id]: role }), {}),
    [roles]
  );
  const userMap = useMemo(
    () =>
      users.reduce<Record<string, User>>((acc, row) => {
        acc[row.id] = row;
        return acc;
      }, {}),
    [users]
  );

  const columns = useMemo<ColumnDef<WorkflowApprovalConfig>[]>(
    () => [
      { id: "flow_code", header: "Flow", accessorKey: "flow_code" },
      { id: "flow_name", header: "Name", accessorKey: "flow_name" },
      { id: "from_status", header: "From", accessorKey: "from_status" },
      { id: "to_status", header: "To", accessorKey: "to_status" },
      { id: "level", header: "Level", accessorKey: "level" },
      {
        id: "approver_role",
        header: "Approver Role",
        cell: ({ row }) => row.original.approver_role_name || roleMap[row.original.approver_role_id || ""]?.name || "-",
      },
      {
        id: "approver_users",
        header: "Approver Users",
        cell: ({ row }) => {
          const approvers = row.original.approver_users ?? [];
          if (!approvers.length) return "-";
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {approvers.map((approver) => (
                <span
                  key={approver.user_id}
                  style={{
                    fontSize: "0.875rem",
                    color: approver.is_default ? "var(--sapContent_LabelColor)" : "inherit",
                  }}
                >
                  •{" "}
                  {(approver.display_name || userMap[approver.user_id]?.display_name || approver.user_id) +
                    (approver.email ? ` (${approver.email})` : "")}
                  {approver.is_default ? " [default]" : ""}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.active ? "active" : "disabled"} />,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="button-hover-scale"
              onClick={() => {
                setEditing(row.original);
                reset({
                  flow_code: row.original.flow_code,
                  flow_name: row.original.flow_name,
                  from_status: row.original.from_status,
                  to_status: row.original.to_status,
                  level: row.original.level,
                  approver_role_id: row.original.approver_role_id || "",
                  active: row.original.active,
                });
                const approverRows =
                  row.original.approver_users?.map((approver) => ({
                    user_id: approver.user_id,
                    email: approver.email ?? "",
                    is_default: Boolean(approver.is_default),
                  })) ?? [];
                setApproverRows(approverRows.length ? approverRows : [{ ...EMPTY_APPROVER_ROW }]);
                setOpen(true);
              }}
              title="Edit Rule"
              aria-label="Edit Rule"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="button-hover-scale text-destructive"
              onClick={() => setDeleteTarget(row.original.id)}
              title="Delete Rule"
              aria-label="Delete Rule"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [reset, roleMap, userMap]
  );

  // No need for duplicate declaration here

  const transitionGroups = useMemo<TransitionView[]>(() => {
    const grouped = approvals.reduce<Record<string, WorkflowApprovalConfig[]>>((acc, row) => {
      const key = `${row.flow_code}__${row.flow_name}`;
      acc[key] = [...(acc[key] || []), row];
      return acc;
    }, {});

    return Object.entries(grouped).map(([key, rows]) => {
      const [flowCode, flowName] = key.split("__");
      return {
        flowCode,
        flowName,
        rows: [...rows].sort((a, b) => a.level - b.level),
      };
    });
  }, [approvals]);

  return (
    <PageLayout
      title="Approvals & Configuration"
      subtitle={
        <div className="flex items-center gap-2">
          <span className="indicator-live" />
          <span>Workflow rules and approval matrix</span>
        </div>
      }
      icon="approvals"
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
        <div className="ui-section-entry">
          <Section title="Online Indicator Window" variant="card">
            <div className="flex flex-wrap items-end gap-4 p-4">
              <div className="grid gap-2">
                <Label>Heartbeat window (minutes)</Label>
                <Input
                  type="number"
                  value={heartbeatValue}
                  onChange={(e) => setHeartbeatValue(e.target.value)}
                  className="w-[150px]"
                />
              </div>
              <Button
                className="button-hover-scale"
                onClick={() => {
                  const minutes = Number(heartbeatValue);
                  if (!Number.isFinite(minutes) || minutes < 1) return;
                  heartbeatMutation.mutate(minutes);
                }}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <span className="text-sm text-muted-foreground">
                Current: {heartbeatSettings?.online_window_minutes ?? 2} minute(s)
              </span>
            </div>
          </Section>
        </div>

        <div className="ui-section-entry mb-8">
          <h4 className="text-lg font-semibold mb-4 pl-2">Approval Rules</h4>
          <DataTable
            data={approvals}
            columns={columns}
            loading={approvalsLoading || rolesLoading || usersLoading}
            filterPlaceholder="Search workflow by code/status..."
            actions={
              <Button
                className="button-hover-scale"
                onClick={() => {
                  setEditing(null);
                  reset({
                    flow_code: "MATERIAL_REQUEST_APPROVAL",
                    flow_name: "Material Request Approval",
                    from_status: "REQUESTED",
                    to_status: "APPROVED",
                    level: 1,
                    approver_role_id: "",
                    active: true,
                  });
                  setApproverRows([{ ...EMPTY_APPROVER_ROW }]);
                  setOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            }
          />
        </div>

        <div className="ui-section-entry">
          <Section title="Status Transitions" variant="card">
            <div className="flex flex-col">
              {transitionGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No transition rules configured.</div>
              ) : (
                transitionGroups.map((group, index) => (
                  <div
                    key={group.flowCode + group.flowName}
                    className={`p-4 ${index < transitionGroups.length - 1 ? "border-b" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="font-semibold">{group.flowCode}</h5>
                      <Label className="font-normal">{group.flowName}</Label>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {group.rows.map((row) => (
                        <div key={row.id} className="flex items-center gap-2 p-2 rounded-md border bg-card">
                          <span className="rounded px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                            L{row.level}
                          </span>
                          <span className="font-semibold">{row.from_status}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-semibold">{row.to_status}</span>
                          <span className="text-sm text-muted-foreground">
                            ({row.approver_role_name || "Unassigned"})
                          </span>
                          {row.approver_users?.find((a) => a.is_default)?.display_name && (
                            <span className="text-sm italic">
                              - {row.approver_users?.find((a) => a.is_default)?.display_name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Section>
        </div>
      </div>

      <FormDialog
        open={open}
        title={editing ? "Edit Approval Rule" : "Create Approval Rule"}
        onClose={() => setOpen(false)}
        onSubmit={() =>
          handleSubmit((values) => (editing ? updateMutation.mutate(values) : createMutation.mutate(values)))()
        }
        submitting={createMutation.isPending || updateMutation.isPending}
        contentClassName="approval-dialog"
      >
        <div className="grid gap-6 approval-dialog">
          <div className="grid gap-4">
            <h4 className="font-semibold">Rule Configuration</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Flow Code *</Label>
                <Controller
                  name="flow_code"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value || ""}
                      className={errors.flow_code ? "border-destructive" : ""}
                    />
                  )}
                />
                {errors.flow_code && <p className="text-sm text-destructive">{errors.flow_code.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Flow Name *</Label>
                <Controller
                  name="flow_name"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value || ""}
                      className={errors.flow_name ? "border-destructive" : ""}
                    />
                  )}
                />
                {errors.flow_name && <p className="text-sm text-destructive">{errors.flow_name.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label>From Status *</Label>
                <Controller
                  name="from_status"
                  control={control}
                  render={({ field }) => <Input {...field} value={field.value || ""} />}
                />
              </div>
              <div className="grid gap-2">
                <Label>To Status *</Label>
                <Controller
                  name="to_status"
                  control={control}
                  render={({ field }) => <Input {...field} value={field.value || ""} />}
                />
              </div>
              <div className="grid gap-2">
                <Label>Approval Level</Label>
                <Controller
                  name="level"
                  control={control}
                  render={({ field }) => (
                    <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">L1</SelectItem>
                        <SelectItem value="2">L2</SelectItem>
                        <SelectItem value="3">L3</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="grid gap-2">
                <Label>Approver Role</Label>
                <Controller
                  name="approver_role_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Unassigned</SelectItem>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox
                  id="approval-active"
                  checked={watch("active")}
                  onCheckedChange={(v) => setValue("active", !!v)}
                />
                <Label htmlFor="approval-active" className="cursor-pointer font-normal">
                  Active
                </Label>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <h4 className="font-semibold">Approver Users (User + Email + Default)</h4>
            <div className="flex flex-col gap-2 w-full">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setApproverRows((prev) => [...prev, { ...EMPTY_APPROVER_ROW }])}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Approver
                </Button>
              </div>
              {approverRows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-wrap">
                  <div className="flex-1 min-w-[140px]">
                    <Select
                      value={row.user_id || NONE}
                      onValueChange={(userId) => {
                        setApproverRows((prev) =>
                          prev.map((current, currentIdx) => {
                            if (currentIdx !== idx) return current;
                            const selectedUser = users.find((u) => u.id === userId);
                            return { ...current, user_id: userId, email: current.email || selectedUser?.email || "" };
                          })
                        );
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Unassigned</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.display_name} ({user.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <Input
                      type="email"
                      value={row.email}
                      placeholder="approver@email"
                      onChange={(e) =>
                        setApproverRows((prev) =>
                          prev.map((current, currentIdx) =>
                            currentIdx === idx ? { ...current, email: e.target.value } : current
                          )
                        )
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`approver-default-${idx}`}
                      checked={row.is_default}
                      onCheckedChange={(v) =>
                        setApproverRows((prev) =>
                          prev.map((current, currentIdx) => ({
                            ...current,
                            is_default: currentIdx === idx ? !!v : false,
                          }))
                        )
                      }
                    />
                    <Label htmlFor={`approver-default-${idx}`} className="cursor-pointer font-normal text-sm">
                      Default
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() =>
                      setApproverRows((prev) => {
                        const next = prev.filter((_, i) => i !== idx);
                        return next.length ? next : [{ ...EMPTY_APPROVER_ROW }];
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Approval Rule"
        description="Are you sure you want to delete this approval rule? This action cannot be undone."
        confirmText="Delete"
        destructive
        submitting={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget, {
              onSuccess: () => setDeleteTarget(null),
            });
          }
        }}
      />
    </PageLayout>
  );
}
