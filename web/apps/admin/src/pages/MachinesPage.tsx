import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../context/AuthContext";
import { Machine } from "@traceability/sdk";
import { DataTable } from "../components/shared/DataTable";
import { formatApiError } from "../lib/errors";
import { PageLayout, Section } from "@traceability/ui";
import { 
    Button,
    Input,
    Label,
    Select,
    Option,
    FlexBox,
    FlexBoxAlignItems,
    Avatar,
    ObjectStatus,
    Form,
    FormItem
} from "@ui5/webcomponents-react";
import { FormDialog } from "../components/shared/FormDialog";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/machine.js";

const EMPTY_FORM = { name: "", station_type: "SCANNER", line_code: "", supported_variants: "" };
const STATION_TYPES = ["SCANNER", "PRINTER", "TESTER", "ASSEMBLY", "PACKING"];

export default function MachinesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | undefined>();

  const { data: machines = [], isLoading } = useQuery({
    queryKey: ["machines"],
    queryFn: () => sdk.admin.getMachines(),
  });

  const createMachine = useMutation({
    mutationFn: async (data: any) => sdk.admin.createMachine(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      setIsModalOpen(false);
      setFormData(EMPTY_FORM);
      setEditingId(null);
      setError(undefined);
    },
    onError: (err) => setError(formatApiError(err))
  });

  const updateMachine = useMutation({
    mutationFn: async (data: any) => sdk.admin.updateMachine(editingId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      setIsModalOpen(false);
      setFormData(EMPTY_FORM);
      setEditingId(null);
      setError(undefined);
    },
    onError: (err) => setError(formatApiError(err))
  });

  const deleteMachine = useMutation({
    mutationFn: async (id: string) => sdk.admin.deleteMachine(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["machines"] }),
  });

  const openCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setError(undefined);
    setIsModalOpen(true);
  };

  const openEdit = (m: Machine) => {
    setEditingId(m.id);
    setFormData({
      name: m.name,
      station_type: m.station_type,
      line_code: m.line_code || "",
      supported_variants: (m.supported_variants || []).join(","),
    });
    setError(undefined);
    setIsModalOpen(true);
  };

  const submit = () => {
    const payload = {
      name: formData.name,
      station_type: formData.station_type,
      line_code: formData.line_code || null,
      supported_variants: formData.supported_variants
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    if (editingId) updateMachine.mutate(payload);
    else createMachine.mutate(payload);
  };

  const columns = [
    {
      header: "Name",
      accessorKey: "name" as any,
      cell: ({ row }: { row: any }) => (
        <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
          <Avatar icon="machine" size="XS" colorScheme="Accent6" />
          <span style={{ fontWeight: "bold" }}>{row.original.name}</span>
        </FlexBox>
      ),
    },
    { header: "Station Type", accessorKey: "station_type" as any },
    {
      header: "Line Code",
      accessorKey: "line_code" as any,
      cell: ({ row }: { row: any }) => (row.original.line_code ? <span style={{ fontFamily: "monospace" }}>{row.original.line_code}</span> : "-"),
    },
    {
      header: "Supported Variants",
      accessorKey: "supported_variants" as any,
      cell: ({ row }: { row: any }) => <div style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.original.supported_variants?.length ? row.original.supported_variants.join(", ") : "-"}</div>,
    },
    {
      header: "Actions",
      accessorKey: "id" as any,
      cell: ({ row }: { row: any }) => (
        <FlexBox>
          <Button icon="edit" design="Transparent" onClick={() => openEdit(row.original)} />
          <Button 
            icon="delete" 
            design="Transparent" 
            style={{ color: "var(--sapNegativeColor)" }}
            onClick={() => {
              if (confirm("Deactivate this machine?")) deleteMachine.mutate(row.original.id);
            }} 
          />
        </FlexBox>
      ),
    },
  ];

  const isSubmitting = createMachine.isPending || updateMachine.isPending;

  return (
    <PageLayout
      title="Machines"
      subtitle="Manage machine configurations and line assignments."
      icon="machine"
      iconColor="var(--icon-green)"
    >
      <Section variant="card">
        <DataTable 
            data={machines} 
            columns={columns}
            loading={isLoading}
            actions={
                <Button icon="add" design="Emphasized" onClick={openCreate}>
                    Add Machine
                </Button>
            }
        />

        <FormDialog
            open={isModalOpen}
            title={editingId ? "Edit Machine" : "Create Machine"}
            onClose={() => setIsModalOpen(false)}
            onSubmit={submit}
            submitting={isSubmitting}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", minWidth: "400px", padding: "1rem" }}>
                {error && (
                    <ObjectStatus state="Negative" inverted>
                        {error}
                    </ObjectStatus>
                )}

                <Form layout="S1 M1 L1 XL1" labelSpan="S12 M12 L12 XL12">
                    <FormItem labelContent={<Label required>Machine Name</Label>}>
                        <Input 
                            value={formData.name}
                            onInput={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </FormItem>

                    <FormItem labelContent={<Label required>Station Type</Label>}>
                        <Select
                            onChange={(e) => setFormData({...formData, station_type: (e.target.selectedOption as any).dataset.value!})}
                        >
                            {STATION_TYPES.map(type => (
                                <Option key={type} selected={formData.station_type === type} data-value={type}>
                                    {type}
                                </Option>
                            ))}
                        </Select>
                    </FormItem>

                    <FormItem labelContent={<Label>Line Code</Label>}>
                        <Input 
                            value={formData.line_code}
                            onInput={(e) => setFormData({...formData, line_code: e.target.value})}
                        />
                    </FormItem>

                    <FormItem labelContent={<Label>Supported Variants (comma separated)</Label>}>
                        <Input 
                            value={formData.supported_variants}
                            onInput={(e) => setFormData({...formData, supported_variants: e.target.value})}
                            placeholder="WITH_SHROUD, NO_SHROUD"
                        />
                    </FormItem>
                </Form>
            </div>
        </FormDialog>
      </Section>
    </PageLayout>
  );
}
