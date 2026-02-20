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
import {
  Button,
  Label,
  Input,
  Select,
  Option,
  CheckBox,
  Title,
  FlexBox,
  FlexBoxDirection,
  FlexBoxAlignItems,
  FlexBoxJustifyContent,
  ObjectStatus,
  Icon,
  Form,
  FormGroup,
  FormItem
} from "@ui5/webcomponents-react";
import { FormDialog } from "../../components/shared/FormDialog";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/approvals.js";
import "@ui5/webcomponents-icons/dist/save.js";
import "@ui5/webcomponents-icons/dist/slim-arrow-right.js";

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
  const { showToast, ToastComponent } = useToast();

  const { data: approvals = [], isLoading: approvalsLoading } = useQuery({ queryKey: ["workflow-approvals"], queryFn: () => sdk.admin.getWorkflowApprovals() });
  const { data: roles = [], isLoading: rolesLoading } = useQuery({ queryKey: ["roles"], queryFn: () => sdk.admin.getRoles() });
  const { data: users = [], isLoading: usersLoading } = useQuery({ queryKey: ["users"], queryFn: () => sdk.admin.getUsers() });
  const { data: heartbeatSettings } = useQuery({
    queryKey: ["heartbeat-settings"],
    queryFn: () => sdk.admin.getHeartbeatSettings(),
  });

  useEffect(() => {
    if (heartbeatSettings) {
      setHeartbeatValue(String(heartbeatSettings.online_window_minutes));
    }
  }, [heartbeatSettings]);

  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ApprovalForm>({
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
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {approvers.map((approver) => (
                <span key={approver.user_id} style={{ fontSize: "0.875rem", color: approver.is_default ? "var(--sapContent_LabelColor)" : "inherit" }}>
                   • {(approver.display_name || userMap[approver.user_id]?.display_name || approver.user_id) +
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
          <FlexBox style={{ gap: "0.25rem" }}>
            <Button
              icon="edit"
              design="Transparent"
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
                const rows =
                  row.original.approver_users?.map((approver) => ({
                    user_id: approver.user_id,
                    email: approver.email ?? "",
                    is_default: Boolean(approver.is_default),
                  })) ?? [];
                setApproverRows(rows.length ? rows : [{ ...EMPTY_APPROVER_ROW }]);
                setOpen(true);
              }}
              tooltip="Edit Rule"
              aria-label="Edit Rule"
            />
            <Button 
                icon="delete" 
                design="Transparent" 
                className="button-hover-scale"
                style={{ color: "var(--sapNegativeColor)" }}
                onClick={() => {
                   setDeleteTarget(row.original.id);
                }}
                tooltip="Delete Rule"
                aria-label="Delete Rule"
            />
          </FlexBox>
        ),
      },
    ],
    [deleteMutation, reset, roleMap, userMap]
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
      title="Workflow Approvals"
      subtitle="Configure L1/L2/L3 approver gates and transition routes."
      icon="approvals"
      iconColor="teal"
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
              <FlexBox alignItems={FlexBoxAlignItems.End} style={{ gap: "1rem", padding: "1rem" }}>
                <FlexBox direction={FlexBoxDirection.Column}>
                    <Label>Heartbeat window (minutes)</Label>
                    <Input
                        value={heartbeatValue}
                        onInput={(e: any) => setHeartbeatValue(e.target.value)}
                        style={{ width: "150px" }}
                    />
                </FlexBox>
                <Button
                    icon="save"
                    className="button-hover-scale"
                    onClick={() => {
                        const minutes = Number(heartbeatValue);
                        if (!Number.isFinite(minutes) || minutes < 1) return;
                        heartbeatMutation.mutate(minutes);
                    }}
                >
                    Save
                </Button>
                <ObjectStatus state="Information">
                    Current: {heartbeatSettings?.online_window_minutes ?? 2} minute(s)
                </ObjectStatus>
              </FlexBox>
          </Section>
        </div>

        <div className="ui-section-entry" style={{ marginBottom: "2rem" }}>
          <Title level="H4" style={{ marginBottom: "1rem", paddingLeft: "0.5rem" }}>Approval Rules</Title>
          <DataTable 
              data={approvals} 
              columns={columns} 
              loading={approvalsLoading || rolesLoading || usersLoading}
              filterPlaceholder="Search workflow by code/status..." 
              actions={
                  <Button
                      icon="add"
                      design="Emphasized"
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
                      Add Rule
                  </Button>
              }
          />
        </div>
        
        <div className="ui-section-entry">
          <Section title="Status Transitions" variant="card">
           <div style={{ display: "flex", flexDirection: "column" }}>
            {transitionGroups.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--sapContent_LabelColor)" }}>No transition rules configured.</div>
            ) : (
              transitionGroups.map((group, index) => (
                <div key={group.flowCode + group.flowName} style={{ padding: "1rem", borderBottom: index < transitionGroups.length - 1 ? "1px solid var(--sapList_BorderColor)" : "none" }}>
                      <FlexBox alignItems={FlexBoxAlignItems.Center} justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginBottom: "1rem" }}>
                          <Title level="H5">{group.flowCode}</Title>
                          <Label>{group.flowName}</Label>
                      </FlexBox>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                        {group.rows.map((row) => (
                          <div key={row.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", border: "1px solid var(--sapList_BorderColor)", borderRadius: "var(--sapElement_BorderCornerRadius)", background: "var(--sapList_Background)" }}>
                            <ObjectStatus state="Indication05" inverted>L{row.level}</ObjectStatus>
                            <span style={{ fontWeight: "bold" }}>{row.from_status}</span>
                            <Icon name="slim-arrow-right" style={{ color: "var(--sapContent_IconColor)", width: "1rem", height: "1rem" }} />
                            <span style={{ fontWeight: "bold" }}>{row.to_status}</span>
                            <span style={{ color: "var(--sapContent_LabelColor)", fontSize: "0.875rem" }}>({row.approver_role_name || "Unassigned"})</span>
                            {row.approver_users?.find((approver) => approver.is_default)?.display_name && (
                                <span style={{ fontSize: "0.875rem", fontStyle: "italic" }}>
                                  - {row.approver_users?.find((approver) => approver.is_default)?.display_name}
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
            onSubmit={() => handleSubmit((values) => (editing ? updateMutation.mutate(values) : createMutation.mutate(values)))()}
            submitting={createMutation.isPending || updateMutation.isPending}
            contentClassName="approval-dialog"
        >
        <Form layout="S1 M1 L1 XL1" labelSpan="S12 M12 L12 XL12">
            <FormGroup title="Rule Configuration">
                <FormItem labelContent={<Label required>Flow Code</Label>}>
                    <Controller
                        name="flow_code"
                        control={control}
                        render={({ field }) => (
                            <Input 
                                {...field} 
                                value={field.value || ""} 
                                valueState={errors.flow_code ? "Negative" : "None"}
                                valueStateMessage={errors.flow_code && <div>{errors.flow_code.message}</div>}
                            />
                        )}
                    />
                </FormItem>
                <FormItem labelContent={<Label required>Flow Name</Label>}>
                    <Controller
                        name="flow_name"
                        control={control}
                        render={({ field }) => (
                            <Input 
                                {...field} 
                                value={field.value || ""} 
                                valueState={errors.flow_name ? "Negative" : "None"}
                                valueStateMessage={errors.flow_name && <div>{errors.flow_name.message}</div>}
                            />
                        )}
                    />
                </FormItem>
                <FormItem labelContent={<Label required>From Status</Label>}>
                    <Controller
                        name="from_status"
                        control={control}
                        render={({ field }) => (<Input {...field} value={field.value || ""} />)}
                    />
                </FormItem>
                <FormItem labelContent={<Label required>To Status</Label>}>
                    <Controller
                        name="to_status"
                        control={control}
                        render={({ field }) => (<Input {...field} value={field.value || ""} />)}
                    />
                </FormItem>
                <FormItem labelContent={<Label>Approval Level</Label>}>
                    <Controller
                        name="level"
                        control={control}
                        render={({ field }) => (
                            <Select
                                onChange={(e) => field.onChange(Number((e.target.selectedOption as any).dataset.value))}
                                value={String(field.value)}
                            >
                                <Option value="1" data-value="1">L1</Option>
                                <Option value="2" data-value="2">L2</Option>
                                <Option value="3" data-value="3">L3</Option>
                            </Select>
                        )}
                    />
                </FormItem>
                <FormItem labelContent={<Label>Approver Role</Label>}>
                    <Controller
                        name="approver_role_id"
                        control={control}
                        render={({ field }) => (
                            <Select
                                onChange={(e) => field.onChange((e.target.selectedOption as any).dataset.value === NONE ? "" : (e.target.selectedOption as any).dataset.value)}
                                value={field.value || NONE}
                            >
                                <Option value={NONE} data-value={NONE}>Unassigned</Option>
                                {roles.map((row) => (
                                    <Option key={row.id} value={row.id} data-value={row.id} selected={row.id === field.value}>
                                        {row.name}
                                    </Option>
                                ))}
                            </Select>
                        )}
                    />
                </FormItem>
                <FormItem labelContent={<Label>Active</Label>}>
                    <CheckBox
                        checked={watch("active")}
                        onChange={(e) => setValue("active", e.target.checked)}
                    />
                </FormItem>
            </FormGroup>

            <FormGroup title="Approver Users (User + Email + Default)">
                <FormItem>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <Button
                                icon="add"
                                design="Transparent"
                                onClick={() => setApproverRows((prev) => [...prev, { ...EMPTY_APPROVER_ROW }])}
                            >
                                Add Approver
                            </Button>
                        </div>
                    
                        {approverRows.map((row, idx) => (
                            <FlexBox key={`${idx}`} alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                            <div style={{ flex: 1 }}>
                                <Select
                                    onChange={(e) => {
                                    const userId = (e.target.selectedOption as any).dataset.value === NONE ? "" : (e.target.selectedOption as any).dataset.value;
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
                                    value={row.user_id || NONE}
                                    style={{ width: "100%" }}
                                >
                                    <Option value={NONE} data-value={NONE}>Unassigned</Option>
                                    {users.map((user) => (
                                        <Option key={user.id} value={user.id} data-value={user.id} selected={user.id === row.user_id}>
                                        {user.display_name} ({user.username})
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <Input
                                    type="Email"
                                    value={row.email}
                                    placeholder="approver@email"
                                    onInput={(e: any) =>
                                    setApproverRows((prev) =>
                                        prev.map((current, currentIdx) =>
                                        currentIdx === idx ? { ...current, email: e.target.value } : current
                                        )
                                    )
                                    }
                                    style={{ width: "100%" }}
                                />
                            </div>
                            <CheckBox
                                text="Default"
                                checked={row.is_default}
                                onChange={(e: any) =>
                                setApproverRows((prev) =>
                                    prev.map((current, currentIdx) => ({
                                    ...current,
                                    is_default: currentIdx === idx ? e.target.checked : false, 
                                    }))
                                )
                                }
                            />
                            <Button
                                icon="delete"
                                design="Transparent"
                                style={{ color: "var(--sapNegativeColor)" }}
                                onClick={() =>
                                setApproverRows((prev) => {
                                    const next = prev.filter((_, currentIdx) => currentIdx !== idx);
                                    return next.length ? next : [{ ...EMPTY_APPROVER_ROW }];
                                })
                                }
                            />
                            </FlexBox>
                        ))}
                    </div>
                </FormItem>
            </FormGroup>
        </Form>
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
      <ToastComponent />
    </PageLayout>
  );
}
