import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Role } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { PageLayout } from "@traceability/ui";
import { useToast } from "../../hooks/useToast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil } from "lucide-react";

const roleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([]),
});
type RoleForm = z.infer<typeof roleSchema>;

type Permission = { id: string; code: string; name: string; module?: string };

export function RolesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const { showToast } = useToast();
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => sdk.admin.getRoles(),
  });
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => sdk.admin.getPermissions(),
  });

  const form = useForm<RoleForm>({ resolver: zodResolver(roleSchema), defaultValues: { name: "", permissions: [] } });

  const createMutation = useMutation({
    mutationFn: (v: RoleForm) => sdk.admin.createRole(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setOpen(false);
      form.reset({ name: "", permissions: [] });
      showToast("Role created successfully");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (v: RoleForm) => sdk.admin.updateRole(editing!.id, v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setOpen(false);
      setEditing(null);
      showToast("Role updated successfully");
    },
  });

  const columns = useMemo<ColumnDef<Role>[]>(
    () => [
      { id: "name", header: "Role", accessorKey: "name" },
      {
        id: "description",
        header: "Description",
        accessorKey: "description",
        cell: ({ row }) => row.original.description || "-",
      },
      {
        id: "permissions",
        header: "Permissions",
        cell: ({ row }) => <span className="font-bold">{(row.original.permissions || []).length}</span>,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditing(row.original);
              form.reset({
                name: row.original.name,
                description: row.original.description || "",
                permissions: row.original.permissions || [],
              });
              setOpen(true);
            }}
            title="Edit Role"
            aria-label="Edit Role"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [form]
  );

  const grouped = (permissions as Permission[]).reduce<Record<string, Permission[]>>((acc, permission) => {
    const key = permission.module || "general";
    acc[key] = [...(acc[key] || []), permission];
    return acc;
  }, {});

  return (
    <PageLayout
      title="Roles & Permissions"
      subtitle={
        <div className="flex items-center gap-2">
          <span>Role CRUD and permission matrix</span>
        </div>
      }
      icon="role"
      iconColor="indigo"
    >
      <div className="page-container">
        <ApiErrorBanner
          message={
            createMutation.error
              ? formatApiError(createMutation.error)
              : updateMutation.error
                ? formatApiError(updateMutation.error)
                : undefined
          }
        />
        <DataTable
          data={roles}
          columns={columns}
          loading={rolesLoading || permissionsLoading}
          filterPlaceholder="Search roles..."
          actions={
            <Button
              className="button-hover-scale"
              onClick={() => {
                setEditing(null);
                form.reset({ name: "", permissions: [] });
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Role
            </Button>
          }
        />
      </div>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Role" : "Create Role"}
        onSubmit={form.handleSubmit((v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="role-name">Name</Label>
            <Input id="role-name" {...form.register("name")} disabled={editing?.name === "ADMIN"} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role-desc">Description</Label>
            <Input id="role-desc" {...form.register("description")} />
          </div>
          <div className="grid gap-2">
            <Label>Permission Matrix</Label>
            <div className="flex flex-col gap-4 w-full">
              {Object.entries(grouped).map(([module, modulePermissions]) => (
                <div key={module} className="rounded-lg border p-4">
                  <h5 className="text-sm font-medium capitalize mb-2">{module}</h5>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
                    {modulePermissions.map((permission) => (
                      <Controller
                        key={permission.id}
                        control={form.control}
                        name="permissions"
                        render={({ field }) => {
                          const checked = field.value.includes(permission.code);
                          return (
                            <div key={permission.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`perm-${permission.id}`}
                                checked={checked}
                                onCheckedChange={(v) => {
                                  const isChecked = !!v;
                                  const current = field.value;
                                  field.onChange(
                                    isChecked
                                      ? [...current, permission.code]
                                      : current.filter((p) => p !== permission.code)
                                  );
                                }}
                              />
                              <Label htmlFor={`perm-${permission.id}`} className="cursor-pointer font-normal text-sm">
                                {permission.name}
                              </Label>
                            </div>
                          );
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FormDialog>
    </PageLayout>
  );
}
