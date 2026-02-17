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
import { PageLayout, Section } from "@traceability/ui";
import {
  Button,
  Input,
  Select,
  Option,
  CheckBox,
  Label,
  Form,
  FormItem
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/group.js";

const ROLES = ["ADMIN", "SUPERVISOR", "OPERATOR", "STORE", "PRODUCTION", "QA"];

const userSchema = z.object({
  employee_code: z.string().optional(),
  name: z.string().min(2),
  username: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  department: z.string().optional(),
  password: z.string().min(3).optional(),
  roles: z.array(z.string()).min(1),
});
type UserForm = z.infer<typeof userSchema>;

export function UsersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const form = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { roles: ["OPERATOR"], name: "", username: "", department: "" },
  });

  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => sdk.admin.getUsers() });
  const { data: departments = [] } = useQuery({ queryKey: ["departments"], queryFn: () => sdk.admin.getDepartments() });

  const departmentOptions = useMemo(() => {
    const active = departments.filter((department) => department.is_active);
    const existingUserValues = users.map((user) => user.department).filter(Boolean) as string[];
    const unique = new Set<string>([...active.map((department) => department.name), ...existingUserValues]);
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [departments, users]);

  const createMutation = useMutation({
    mutationFn: (payload: UserForm) =>
      sdk.admin.createUser({
        username: payload.username,
        display_name: payload.name,
        password: payload.password || "changeme123",
        employee_code: payload.employee_code,
        email: payload.email,
        department: payload.department,
        roles: payload.roles,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      form.reset({ roles: ["OPERATOR"], name: "", username: "", department: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UserForm) =>
      sdk.admin.updateUser(editing!.id, {
        display_name: payload.name,
        employee_code: payload.employee_code,
        email: payload.email,
        department: payload.department,
        password: payload.password,
        roles: payload.roles,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      setEditing(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      { header: "Employee ID", accessorKey: "employee_code", cell: ({ row }) => row.original.employee_code || "-", size: 120 },
      { header: "Name", accessorKey: "display_name", size: 180 },
      { header: "Email", accessorKey: "email", cell: ({ row }) => row.original.email || "-", size: 200 },
      { header: "Department", accessorKey: "department", cell: ({ row }) => row.original.department || "-", size: 150 },
      { header: "Roles", cell: ({ row }) => <div className="admin-users-role-list-text">{(row.original.roles || []).join(", ")}</div>, size: 200 },
      { header: "Status", cell: ({ row }) => <StatusBadge status={row.original.is_active === false ? "disabled" : "active"} />, size: 100 },
      {
        header: "Actions",
        size: 100,
        cell: ({ row }) => (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              icon="edit"
              design="Transparent"
              onClick={() => {
                setEditing(row.original);
                form.reset({
                  employee_code: row.original.employee_code || "",
                  name: row.original.display_name,
                  username: row.original.username,
                  email: row.original.email || "",
                  department: row.original.department || "",
                  roles: row.original.roles || ["OPERATOR"],
                });
                setOpen(true);
              }}
            />
            <Button
              icon="delete"
              design="Transparent"
              onClick={() => {
                setDeleteTarget(row.original);
              }}
            />
          </div>
        ),
      },
    ],
    [deleteMutation, form]
  );

  return (
    <PageLayout
      title="Users"
      subtitle="Manage operator and admin identities"
      icon="employee"
      iconColor="var(--icon-indigo)"
    >
      <Section variant="card">
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
            loading={!users.length}
            filterPlaceholder="Search users..." 
            actions={
                <Button
                  icon="add"
                  design="Emphasized"
                  onClick={() => {
                    setEditing(null);
                    form.reset({ roles: ["OPERATOR"], name: "", username: "", department: "" });
                    setOpen(true);
                  }}
                >
                  Add User
                </Button>
            }
        />
      </Section>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit User" : "Create User"}
        onSubmit={form.handleSubmit((values) => (editing ? updateMutation.mutate(values) : createMutation.mutate(values)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <Form layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12">
          <FormItem labelContent={<Label>Employee ID</Label>}>
            <Input {...form.register("employee_code")} />
          </FormItem>
          <FormItem labelContent={<Label>Name</Label>}>
            <Input {...form.register("name")} />
          </FormItem>
          <FormItem labelContent={<Label>Username</Label>}>
            <Input {...form.register("username")} disabled={Boolean(editing)} />
          </FormItem>
          <FormItem labelContent={<Label>Email</Label>}>
            <Input {...form.register("email")} />
          </FormItem>
          <FormItem labelContent={<Label>Department</Label>} style={{ gridColumn: "span 2" }}>
             <Controller
                control={form.control}
                name="department"
                render={({ field }) => (
                     <Select
                        onChange={(e) => field.onChange(e.target.value)}
                        value={field.value}
                    >
                         <Option value="">Select department</Option>
                         {departmentOptions.map((department) => (
                            <Option key={department} value={department}>
                              {department}
                            </Option>
                          ))}
                    </Select>
                )}
             />
          </FormItem>
          <FormItem labelContent={<Label>Password {editing ? "(optional)" : ""}</Label>} style={{ gridColumn: "span 2" }}>
            <Input type="Password" {...form.register("password")} />
          </FormItem>
          <FormItem labelContent={<Label>Roles</Label>} style={{ gridColumn: "span 2" }}>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
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
                                     field.onChange(
                                      isChecked
                                        ? [...current, role]
                                        : current.filter((r) => r !== role)
                                    );
                                }}
                            />
                         );
                    }}
                  />
              ))}
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
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </PageLayout>
  );
}
