import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save } from "lucide-react";
import { Role, User, WorkflowApprovalConfig } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Checkbox } from "../../components/ui/checkbox";
import { Button } from "../../components/ui/button";

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

  const { data: approvals = [] } = useQuery({ queryKey: ["workflow-approvals"], queryFn: () => sdk.admin.getWorkflowApprovals() });
  const { data: roles = [] } = useQuery({ queryKey: ["roles"], queryFn: () => sdk.admin.getRoles() });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => sdk.admin.getUsers() });
  const { data: heartbeatSettings } = useQuery({
    queryKey: ["heartbeat-settings"],
    queryFn: async () => {
      const result = await sdk.admin.getHeartbeatSettings();
      setHeartbeatValue(String(result.online_window_minutes));
      return result;
    },
  });

  const form = useForm<ApprovalForm>({
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
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteWorkflowApproval(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-approvals"] });
    },
  });

  const heartbeatMutation = useMutation({
    mutationFn: (minutes: number) => sdk.admin.updateHeartbeatSettings(minutes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["heartbeat-settings"] });
      setHeartbeatValue(String(data.online_window_minutes));
    },
  });

  const roleMap = useMemo(() => roles.reduce<Record<string, Role>>((acc, role) => ({ ...acc, [role.id]: role }), {}), [roles]);
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
      { header: "Flow", accessorKey: "flow_code" },
      { header: "Name", accessorKey: "flow_name" },
      { header: "From", accessorKey: "from_status" },
      { header: "To", accessorKey: "to_status" },
      { header: "Level", accessorKey: "level" },
      {
        header: "Approver Role",
        cell: ({ row }) => row.original.approver_role_name || roleMap[row.original.approver_role_id || ""]?.name || "-",
      },
      {
        header: "Approver Users",
        cell: ({ row }) => {
          const approvers = row.original.approver_users ?? [];
          if (!approvers.length) return "-";
          return (
            <div className="flex flex-col gap-1 text-xs">
              {approvers.map((approver) => (
                <span key={approver.user_id} className={approver.is_default ? "font-semibold text-primary" : ""}>
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
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.active ? "active" : "disabled"} />,
      },
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
                  flow_code: row.original.flow_code,
                  flow_name: row.original.flow_name,
                  from_status: row.original.from_status,
                  to_status: row.original.to_status,
                  level: row.original.level,
                  approver_role_id: row.original.approver_role_id || "",
                  active: row.original.active,
                });
                const rows =
                  row.original.approver_users?.map((approver) => ({
                    user_id: approver.user_id,
                    email: approver.email ?? "",
                    is_default: Boolean(approver.is_default),
                  })) ?? [];
                setApproverRows(rows.length ? rows : [{ ...EMPTY_APPROVER_ROW }]);
                setOpen(true);
              }}
            >
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(row.original.id)}>
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [deleteMutation, form, roleMap, userMap]
  );

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
    <div className="space-y-6">
      <PageHeader
        title="Workflow Approvals"
        description="Configure L1/L2/L3 approver gates and transition routes."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              form.reset({
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
            <Plus className="h-4 w-4" />
            Add Rule
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Online Indicator Window</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="w-full md:max-w-xs">
            <Label>Heartbeat window (minutes)</Label>
            <Input
              type="number"
              min={1}
              max={60}
              value={heartbeatValue}
              onChange={(e) => setHeartbeatValue(e.target.value)}
            />
          </div>
          <Button
            className="md:mt-6"
            onClick={() => {
              const minutes = Number(heartbeatValue);
              if (!Number.isFinite(minutes) || minutes < 1) return;
              heartbeatMutation.mutate(minutes);
            }}
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
          <p className="text-xs text-muted-foreground md:mt-6">
            Current: {heartbeatSettings?.online_window_minutes ?? 2} minute(s)
          </p>
        </CardContent>
      </Card>

      <DataTable data={approvals} columns={columns} filterPlaceholder="Search workflow by code/status..." />

      <Card>
        <CardHeader>
          <CardTitle>Status Transitions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {transitionGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transition rules configured.</p>
          ) : (
            transitionGroups.map((group) => (
              <div key={group.flowCode + group.flowName} className="rounded-xl border bg-slate-50 p-4">
                <p className="text-sm font-semibold">{group.flowCode}</p>
                <p className="text-xs text-muted-foreground">{group.flowName}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {group.rows.map((row) => (
                    <div key={row.id} className="rounded-md border bg-white px-2 py-1">
                      <span className="font-medium">L{row.level}</span>
                      <span className="mx-1">{row.from_status}</span>
                      <span className="text-primary">?</span>
                      <span className="mx-1">{row.to_status}</span>
                      <span className="text-muted-foreground">({row.approver_role_name || "Unassigned"})</span>
                      <span className="ml-1 text-muted-foreground">
                        {row.approver_users?.find((approver) => approver.is_default)?.display_name
                          ? `- ${row.approver_users?.find((approver) => approver.is_default)?.display_name}`
                          : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Approval Rule" : "Create Approval Rule"}
        onSubmit={form.handleSubmit((values) => (editing ? updateMutation.mutate(values) : createMutation.mutate(values)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Flow Code</Label>
            <Input {...form.register("flow_code")} />
          </div>
          <div className="space-y-2">
            <Label>Flow Name</Label>
            <Input {...form.register("flow_name")} />
          </div>
          <div className="space-y-2">
            <Label>From Status</Label>
            <Input {...form.register("from_status")} />
          </div>
          <div className="space-y-2">
            <Label>To Status</Label>
            <Input {...form.register("to_status")} />
          </div>
          <div className="space-y-2">
            <Label>Approval Level</Label>
            <Select value={String(form.watch("level"))} onValueChange={(v) => form.setValue("level", Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">L1</SelectItem>
                <SelectItem value="2">L2</SelectItem>
                <SelectItem value="3">L3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Approver Role</Label>
            <Select
              value={form.watch("approver_role_id") || NONE}
              onValueChange={(v) => form.setValue("approver_role_id", v === NONE ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Unassigned</SelectItem>
                {roles.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label>Approver Users (User + Email + Default)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setApproverRows((prev) => [...prev, { ...EMPTY_APPROVER_ROW }])}
              >
                Add Approver
              </Button>
            </div>
            <div className="space-y-2 rounded-md border bg-slate-50 p-3">
              {approverRows.map((row, idx) => (
                <div key={`${row.user_id}-${idx}`} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
                  <Select
                    value={row.user_id || NONE}
                    onValueChange={(value) => {
                      const userId = value === NONE ? "" : value;
                      setApproverRows((prev) =>
                        prev.map((current, currentIdx) => {
                          if (currentIdx !== idx) return current;
                          const selectedUser = users.find((user) => user.id === userId);
                          return {
                            ...current,
                            user_id: userId,
                            email: current.email || selectedUser?.email || "",
                          };
                        })
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
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
                  <Input
                    type="email"
                    value={row.email}
                    placeholder="approver@email"
                    onChange={(event) =>
                      setApproverRows((prev) =>
                        prev.map((current, currentIdx) =>
                          currentIdx === idx ? { ...current, email: event.target.value } : current
                        )
                      )
                    }
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={row.is_default}
                      onCheckedChange={(value) =>
                        setApproverRows((prev) =>
                          prev.map((current, currentIdx) => ({
                            ...current,
                            is_default: currentIdx === idx ? Boolean(value) : false,
                          }))
                        )
                      }
                    />
                    Default
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setApproverRows((prev) => {
                        const next = prev.filter((_, currentIdx) => currentIdx !== idx);
                        return next.length ? next : [{ ...EMPTY_APPROVER_ROW }];
                      })
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.watch("active")} onCheckedChange={(v) => form.setValue("active", Boolean(v))} />
              Active
            </label>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
