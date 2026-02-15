import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Role } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { Button } from "../../components/ui/button";

const roleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([]),
});
type RoleForm = z.infer<typeof roleSchema>;

export function RolesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const { data: roles = [] } = useQuery({ queryKey: ["roles"], queryFn: () => sdk.admin.getRoles() });
  const { data: permissions = [] } = useQuery({ queryKey: ["permissions"], queryFn: () => sdk.admin.getPermissions() });

  const form = useForm<RoleForm>({ resolver: zodResolver(roleSchema), defaultValues: { name: "", permissions: [] } });

  const createMutation = useMutation({
    mutationFn: (v: RoleForm) => sdk.admin.createRole(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (v: RoleForm) => sdk.admin.updateRole(editing!.id, v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const columns = useMemo<ColumnDef<Role>[]>(
    () => [
      { header: "Role", accessorKey: "name" },
      { header: "Description", accessorKey: "description", cell: ({ row }) => row.original.description || "-" },
      { header: "Permissions", cell: ({ row }) => <span className="text-xs">{(row.original.permissions || []).length}</span> },
      {
        header: "Actions",
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditing(row.original);
              form.reset({
                name: row.original.name,
                description: row.original.description || "",
                permissions: row.original.permissions || [],
              });
              setOpen(true);
            }}
          >
            Edit
          </Button>
        ),
      },
    ],
    [form]
  );

  const grouped = permissions.reduce<Record<string, typeof permissions>>((acc, permission) => {
    const key = permission.module || "general";
    acc[key] = [...(acc[key] || []), permission];
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Role CRUD and permission matrix."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              form.reset({ name: "", permissions: [] });
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Role
          </Button>
        }
      />
      <DataTable data={roles} columns={columns} filterPlaceholder="Search roles..." />

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Role" : "Create Role"}
        onSubmit={form.handleSubmit((v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v)))}
        submitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...form.register("name")} disabled={Boolean(editing?.name === "ADMIN")} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input {...form.register("description")} />
          </div>
          <div className="space-y-2">
            <Label>Permission Matrix</Label>
            <div className="space-y-3 rounded-lg border p-3">
              {Object.entries(grouped).map(([module, modulePermissions]) => (
                <div key={module}>
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{module}</p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {modulePermissions.map((permission) => {
                      const checked = form.watch("permissions").includes(permission.code);
                      return (
                        <label key={permission.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const current = form.getValues("permissions");
                              form.setValue(
                                "permissions",
                                v ? [...current, permission.code] : current.filter((p) => p !== permission.code)
                              );
                            }}
                          />
                          {permission.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
