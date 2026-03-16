import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { sdk } from "../../context/AuthContext";
import { User } from "@traceability/sdk";
import { DataTable } from "../../components/shared/DataTable";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { FormDialog } from "../../components/shared/FormDialog";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { PageLayout } from "@traceability/ui";
import {
  Button,
  Input,
  Select,
  Option,
  CheckBox,
  Label,
  Form,
  FormItem,
  FlexBox,
  FlexBoxAlignItems,
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/group.js";
import { useToast } from "../../hooks/useToast";
import { getSections } from "../../lib/section-api";

const ROLES = ["ADMIN", "SUPERVISOR", "OPERATOR", "STORE", "PRODUCTION", "QA"];

const userSchema = z.object({
  employee_code: z.string().optional().or(z.literal("")),
  name: z.string().min(2),
  username: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  section_id: z.string().optional(),
  department_id: z.string().optional(),
  password: z.string().min(3).optional().or(z.literal("")),
  roles: z.array(z.string()).min(1),
});
type UserForm = z.infer<typeof userSchema>;

export function UsersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const { showToast, ToastComponent } = useToast();
  const form = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { roles: ["OPERATOR"], name: "", username: "" },
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => sdk.admin.getUsers(),
  });
  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: () => sdk.admin.getDepartments(),
  });
  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ["admin-sections"],
    queryFn: getSections,
  });

  const createMutation = useMutation({
    mutationFn: (payload: UserForm) =>
      (sdk.admin.createUser as any)({
        username: payload.username,
        display_name: payload.name,
        password: payload.password || "changeme123",
        employee_code: payload.employee_code,
        email: payload.email,
        section_id: payload.section_id,
        department_id: payload.department_id,
        roles: payload.roles,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      form.reset({ roles: ["OPERATOR"], name: "", username: "" });
      showToast("User created successfully");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UserForm) =>
      (sdk.admin.updateUser as any)(editing!.id, {
        display_name: payload.name,
        employee_code: payload.employee_code,
        email: payload.email,
        section_id: payload.section_id,
        department_id: payload.department_id,
        password: payload.password,
        roles: payload.roles,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      setEditing(null);
      showToast("User updated successfully");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast("User deleted");
    },
  });

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        header: "Employee ID",
        accessorKey: "employee_code",
        cell: ({ row }) => row.original.employee_code || "-",
        size: 140,
      },
      { header: "Name", accessorKey: "display_name", size: 200 },
      { header: "Email", accessorKey: "email", cell: ({ row }) => row.original.email || "-", size: 220 },
      {
        header: "Section",
        cell: ({ row }) => sections.find((s) => s.id === (row.original as any).section_id)?.section_name || "-",
        size: 150,
      },
      {
        header: "Department",
        cell: ({ row }) =>
          departments.find((d) => d.id === (row.original as any).department_id)?.name || row.original.department || "-",
        size: 150,
      },
      {
        header: "Roles",
        cell: ({ row }) => <div className="admin-users-role-list-text">{(row.original.roles || []).join(", ")}</div>,
        size: 300,
      },
      {
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.is_active === false ? "disabled" : "active"} />,
        size: 100,
      },
      {
        header: "Actions",
        size: 100,
        cell: ({ row }) => (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              icon="edit"
              design="Transparent"
              tooltip="Edit User"
              aria-label="Edit User"
              onClick={() => {
                setEditing(row.original);
                form.reset({
                  employee_code: row.original.employee_code || "",
                  name: row.original.display_name,
                  username: row.original.username,
                  email: row.original.email || "",
                  section_id: (row.original as any).section_id || undefined,
                  department_id: (row.original as any).department_id || undefined,
                  roles: row.original.roles || ["OPERATOR"],
                });
                setOpen(true);
              }}
            />
            <Button
              icon="delete"
              design="Transparent"
              tooltip="Delete User"
              aria-label="Delete User"
              onClick={() => {
                setDeleteTarget(row.original);
              }}
            />
          </div>
        ),
      },
    ],
    [deleteMutation, form, sections, departments]
  );

  return (
    <PageLayout
      title="Users"
      subtitle={
        <FlexBox alignItems={FlexBoxAlignItems.Center}>
          <span className="indicator-live" />
          <span>Manage operator and admin identities</span>
        </FlexBox>
      }
      icon="employee"
      iconColor="indigo"
      maxWidth="100%"
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

        <DataTable
          data={users}
          columns={columns}
          loading={usersLoading || departmentsLoading || sectionsLoading}
          filterPlaceholder="Search users..."
          actions={
            <Button
              icon="add"
              design="Emphasized"
              className="button-hover-scale"
              onClick={() => {
                setEditing(null);
                form.reset({ roles: ["OPERATOR"], name: "", username: "" });
                setOpen(true);
              }}
            >
              Add User
            </Button>
          }
        />
      </div>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit User" : "Create User"}
        onSubmit={form.handleSubmit((values) =>
          editing ? updateMutation.mutate(values) : createMutation.mutate(values)
        )}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <Form layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12" style={{ padding: "1rem" }}>
          <FormItem labelContent={<Label showColon>Employee ID</Label>}>
            <Input {...form.register("employee_code")} />
          </FormItem>
          <FormItem
            labelContent={
              <Label required showColon>
                Name
              </Label>
            }
          >
            <Input
              {...form.register("name")}
              valueState={form.formState.errors.name ? "Negative" : undefined}
              valueStateMessage={
                form.formState.errors.name ? <span>{form.formState.errors.name.message}</span> : undefined
              }
            />
          </FormItem>
          <FormItem
            labelContent={
              <Label required showColon>
                Username
              </Label>
            }
          >
            <Input
              {...form.register("username")}
              disabled={Boolean(editing)}
              valueState={form.formState.errors.username ? "Negative" : undefined}
              valueStateMessage={
                form.formState.errors.username ? <span>{form.formState.errors.username.message}</span> : undefined
              }
            />
          </FormItem>
          <FormItem labelContent={<Label showColon>Email</Label>}>
            <Input
              {...form.register("email")}
              valueState={form.formState.errors.email ? "Negative" : undefined}
              valueStateMessage={
                form.formState.errors.email ? <span>{form.formState.errors.email.message}</span> : undefined
              }
            />
          </FormItem>
          <FormItem labelContent={<Label showColon>Section</Label>}>
            <Controller
              control={form.control}
              name="section_id"
              render={({ field }) => (
                <Select
                  onChange={(e) => field.onChange(e.detail.selectedOption.getAttribute("data-value") || undefined)}
                >
                  <Option data-value="" selected={!field.value}>
                    None
                  </Option>
                  {sections
                    .filter((s) => s.is_active)
                    .map((sec) => (
                      <Option key={sec.id} data-value={sec.id} selected={field.value === sec.id}>
                        {sec.section_name}
                      </Option>
                    ))}
                </Select>
              )}
            />
          </FormItem>
          <FormItem labelContent={<Label showColon>Department</Label>}>
            <Controller
              control={form.control}
              name="department_id"
              render={({ field }) => (
                <Select
                  onChange={(e) => field.onChange(e.detail.selectedOption.getAttribute("data-value") || undefined)}
                >
                  <Option data-value="" selected={!field.value}>
                    None
                  </Option>
                  {departments
                    .filter((d) => d.is_active)
                    .map((dep: any) => (
                      <Option key={dep.id} data-value={dep.id} selected={field.value === dep.id}>
                        {dep.name}
                      </Option>
                    ))}
                </Select>
              )}
            />
          </FormItem>
          <FormItem
            labelContent={<Label showColon>Password {editing ? "(optional)" : ""}</Label>}
            style={{ gridColumn: "span 2" }}
          >
            <Input
              type="Password"
              {...form.register("password")}
              placeholder={editing ? "Leave blank to keep current" : ""}
            />
          </FormItem>
          <FormItem
            labelContent={
              <Label required showColon>
                Roles
              </Label>
            }
            style={{ gridColumn: "span 2" }}
          >
            <div>
              {form.formState.errors.roles && (
                <span
                  style={{
                    color: "var(--sapNegativeColor)",
                    fontSize: "0.75rem",
                    marginBottom: "0.25rem",
                    display: "block",
                  }}
                >
                  {form.formState.errors.roles.message}
                </span>
              )}
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", padding: "0.5rem 0" }}>
                {ROLES.map((role) => (
                  <Controller
                    key={role}
                    control={form.control}
                    name="roles"
                    render={({ field }) => {
                      const checked = field.value.includes(role);
                      return (
                        <CheckBox
                          text={role}
                          checked={checked}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            const current = field.value;
                            field.onChange(isChecked ? [...current, role] : current.filter((r) => r !== role));
                          }}
                        />
                      );
                    }}
                  />
                ))}
              </div>
            </div>
          </FormItem>
        </Form>
      </FormDialog>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete user"
        description={deleteTarget ? `Delete user ${deleteTarget.username}?` : ""}
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
