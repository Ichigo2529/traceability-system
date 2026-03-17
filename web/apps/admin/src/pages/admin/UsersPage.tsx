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
import { useToast } from "../../hooks/useToast";
import { getSections } from "../../lib/section-api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";

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
  const { showToast } = useToast();
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
      (sdk.admin.createUser as (p: object) => Promise<unknown>)({
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
      (sdk.admin.updateUser as (id: string, p: object) => Promise<unknown>)(editing!.id, {
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
        id: "employee_code",
        header: "Employee ID",
        accessorKey: "employee_code",
        cell: ({ row }) => row.original.employee_code || "-",
        size: 140,
      },
      { id: "display_name", header: "Name", accessorKey: "display_name", size: 200 },
      { id: "email", header: "Email", accessorKey: "email", cell: ({ row }) => row.original.email || "-", size: 220 },
      {
        id: "section",
        header: "Section",
        cell: ({ row }) =>
          sections.find((s) => s.id === (row.original as User & { section_id?: string }).section_id)?.section_name ||
          "-",
        size: 150,
      },
      {
        id: "department",
        header: "Department",
        cell: ({ row }) =>
          departments.find((d) => d.id === (row.original as User & { department_id?: string }).department_id)?.name ||
          (row.original as User & { department?: string }).department ||
          "-",
        size: 150,
      },
      {
        id: "roles",
        header: "Roles",
        cell: ({ row }) => <div className="admin-users-role-list-text">{(row.original.roles || []).join(", ")}</div>,
        size: 300,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.is_active === false ? "disabled" : "active"} />,
        size: 100,
      },
      {
        id: "actions",
        header: "Actions",
        size: 100,
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Edit User"
              aria-label="Edit User"
              onClick={() => {
                setEditing(row.original);
                form.reset({
                  employee_code: row.original.employee_code || "",
                  name: row.original.display_name,
                  username: row.original.username,
                  email: row.original.email || "",
                  section_id: (row.original as User & { section_id?: string }).section_id || undefined,
                  department_id: (row.original as User & { department_id?: string }).department_id || undefined,
                  roles: row.original.roles || ["OPERATOR"],
                });
                setOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Delete User"
              aria-label="Delete User"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [form, sections, departments]
  );

  return (
    <PageLayout
      title="Users"
      subtitle={
        <div className="flex items-center gap-2">
          <span className="indicator-live" />
          <span>Manage operator and admin identities</span>
        </div>
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
              className="button-hover-scale"
              onClick={() => {
                setEditing(null);
                form.reset({ roles: ["OPERATOR"], name: "", username: "" });
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
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
        <div className="grid gap-4 p-4">
          <div className="grid gap-2">
            <Label htmlFor="employee_code">Employee ID</Label>
            <Input id="employee_code" {...form.register("employee_code")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...form.register("name")}
              className={form.formState.errors.name ? "border-destructive" : ""}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              {...form.register("username")}
              disabled={Boolean(editing)}
              className={form.formState.errors.username ? "border-destructive" : ""}
            />
            {form.formState.errors.username && (
              <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              {...form.register("email")}
              className={form.formState.errors.email ? "border-destructive" : ""}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Section</Label>
            <Controller
              control={form.control}
              name="section_id"
              render={({ field }) => (
                <Select value={field.value || ""} onValueChange={(v) => field.onChange(v || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {sections
                      .filter((s) => s.is_active)
                      .map((sec) => (
                        <SelectItem key={sec.id} value={sec.id}>
                          {sec.section_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid gap-2">
            <Label>Department</Label>
            <Controller
              control={form.control}
              name="department_id"
              render={({ field }) => (
                <Select value={field.value || ""} onValueChange={(v) => field.onChange(v || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {departments
                      .filter((d) => d.is_active)
                      .map((dep: { id: string; name: string }) => (
                        <SelectItem key={dep.id} value={dep.id}>
                          {dep.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password {editing ? "(optional)" : ""}</Label>
            <Input
              id="password"
              type="password"
              {...form.register("password")}
              placeholder={editing ? "Leave blank to keep current" : ""}
            />
          </div>
          <div className="grid gap-2">
            <Label>Roles *</Label>
            {form.formState.errors.roles && (
              <p className="text-sm text-destructive">{form.formState.errors.roles.message}</p>
            )}
            <div className="flex gap-4 flex-wrap py-2">
              {ROLES.map((role) => (
                <Controller
                  key={role}
                  control={form.control}
                  name="roles"
                  render={({ field }) => {
                    const checked = field.value.includes(role);
                    return (
                      <div key={role} className="flex items-center gap-2">
                        <Checkbox
                          id={`role-${role}`}
                          checked={checked}
                          onCheckedChange={(v) => {
                            const isChecked = !!v;
                            const current = field.value;
                            field.onChange(isChecked ? [...current, role] : current.filter((r) => r !== role));
                          }}
                        />
                        <Label htmlFor={`role-${role}`} className="cursor-pointer font-normal">
                          {role}
                        </Label>
                      </div>
                    );
                  }}
                />
              ))}
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
