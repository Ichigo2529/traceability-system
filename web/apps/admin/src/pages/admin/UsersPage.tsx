import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { sdk } from "../../context/AuthContext";
import { User } from "@traceability/sdk";
import { PageHeader } from "../../components/shared/PageHeader";
import { DataTable } from "../../components/shared/DataTable";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { FormDialog } from "../../components/shared/FormDialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { Button } from "../../components/ui/button";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";

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
      { header: "Employee ID", accessorKey: "employee_code", cell: ({ row }) => row.original.employee_code || "-" },
      { header: "Name", accessorKey: "display_name" },
      { header: "Email", accessorKey: "email", cell: ({ row }) => row.original.email || "-" },
      { header: "Department", accessorKey: "department", cell: ({ row }) => row.original.department || "-" },
      { header: "Roles", cell: ({ row }) => <div className="text-xs">{(row.original.roles || []).join(", ")}</div> },
      { header: "Status", cell: ({ row }) => <StatusBadge status={row.original.is_active === false ? "disabled" : "active"} /> },
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
                  employee_code: row.original.employee_code || "",
                  name: row.original.display_name,
                  username: row.original.username,
                  email: row.original.email || "",
                  department: row.original.department || "",
                  roles: row.original.roles || ["OPERATOR"],
                });
                setOpen(true);
              }}
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setDeleteTarget(row.original);
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [deleteMutation, form]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage operator and admin identities."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              form.reset({ roles: ["OPERATOR"], name: "", username: "", department: "" });
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        }
      />
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

      <DataTable data={users} columns={columns} filterPlaceholder="Search users..." />

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit User" : "Create User"}
        onSubmit={form.handleSubmit((values) => (editing ? updateMutation.mutate(values) : createMutation.mutate(values)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Employee ID</Label>
            <Input {...form.register("employee_code")} />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...form.register("name")} />
          </div>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input {...form.register("username")} disabled={Boolean(editing)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input {...form.register("email")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Department</Label>
            <select
              {...form.register("department")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select department</option>
              {departmentOptions.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Password {editing ? "(optional)" : ""}</Label>
            <Input type="password" {...form.register("password")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Roles</Label>
            <div className="flex flex-wrap gap-3 rounded-lg border p-3">
              {ROLES.map((role) => {
                const checked = form.watch("roles").includes(role);
                return (
                  <label key={role} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        const current = form.getValues("roles");
                        form.setValue(
                          "roles",
                          v ? [...current, role] : current.filter((r) => r !== role)
                        );
                      }}
                    />
                    {role}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
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
    </div>
  );
}
