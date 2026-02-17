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
import { PageLayout, Section } from "@traceability/ui";
import {
  Button,
  Input,
  CheckBox,
  Label,
  Form,
  FormItem,
  Title
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/role.js";

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
      form.reset({ name: "", permissions: [] });
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
      { header: "Permissions", cell: ({ row }) => <span style={{ fontWeight: "bold" }}>{(row.original.permissions || []).length}</span> },
      {
        header: "Actions",
        cell: ({ row }) => (
          <Button
            icon="edit"
            design="Transparent"
            onClick={() => {
              setEditing(row.original);
              form.reset({
                name: row.original.name,
                description: row.original.description || "",
                permissions: row.original.permissions || [],
              });
              setOpen(true);
            }}
            tooltip="Edit Role"
          />
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
    <PageLayout
      title="Roles & Permissions"
      subtitle="Role CRUD and permission matrix"
      icon="role"
    >
      <Section variant="card">
        <DataTable 
            data={roles} 
            columns={columns} 
            filterPlaceholder="Search roles..." 
            actions={
                <Button
                  icon="add"
                  design="Emphasized"
                  onClick={() => {
                    setEditing(null);
                    form.reset({ name: "", permissions: [] });
                    setOpen(true);
                  }}
                >
                  Add Role
                </Button>
            }
        />

        <FormDialog
          open={open}
          onClose={() => setOpen(false)}
          title={editing ? "Edit Role" : "Create Role"}
          onSubmit={form.handleSubmit((v) => (editing ? updateMutation.mutate(v) : createMutation.mutate(v)))}
          submitting={createMutation.isPending || updateMutation.isPending}
        >
          <Form layout="S1 M1 L1 XL1">
            <FormItem labelContent={<Label>Name</Label>}>
              <Input {...form.register("name")} disabled={Boolean(editing?.name === "ADMIN")} />
            </FormItem>
            <FormItem labelContent={<Label>Description</Label>}>
              <Input {...form.register("description")} />
            </FormItem>
            <FormItem labelContent={<Label>Permission Matrix</Label>}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%" }}>
                {Object.entries(grouped).map(([module, modulePermissions]) => (
                  <div key={module} style={{ border: "1px solid var(--sapList_BorderColor)", borderRadius: "var(--sapElement_BorderCornerRadius)", padding: "1rem" }}>
                    <Title level="H5" style={{ marginBottom: "0.5rem", textTransform: "capitalize" }}>{module}</Title>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.5rem" }}>
                      {modulePermissions.map((permission) => (
                          <Controller
                            key={permission.id}
                            control={form.control}
                            name="permissions"
                            render={({ field }) => {
                                const checked = field.value.includes(permission.code);
                                return (
                                  <CheckBox
                                    text={permission.name}
                                    checked={checked}
                                    onChange={(e) => {
                                        const isChecked = e.target.checked;
                                        const current = field.value;
                                        field.onChange(
                                            isChecked
                                            ? [...current, permission.code]
                                            : current.filter((p) => p !== permission.code)
                                        );
                                    }}
                                  />
                                );
                            }}
                          />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </FormItem>
          </Form>
        </FormDialog>
      </Section>
    </PageLayout>
  );
}
