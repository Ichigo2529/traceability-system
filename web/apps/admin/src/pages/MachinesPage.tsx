import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { sdk } from "../context/AuthContext";
import { Machine } from "@traceability/sdk";
import { DataTable } from "../components/shared/DataTable";
import { formatApiError } from "../lib/errors";
import { PageLayout } from "@traceability/ui";
import { useToast } from "../hooks/useToast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog } from "../components/shared/FormDialog";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { ApiErrorBanner } from "../components/ui/ApiErrorBanner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Pencil, Trash2, Cpu } from "lucide-react";

const EMPTY_FORM = { name: "", station_type: "SCANNER", line_code: "", supported_variants: "" };
const STATION_TYPES = ["SCANNER", "PRINTER", "TESTER", "ASSEMBLY", "PACKING"];

export default function MachinesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { showToast } = useToast();

  const { data: machines = [], isLoading } = useQuery({
    queryKey: ["machines"],
    queryFn: () => sdk.admin.getMachines(),
  });

  const createMachine = useMutation({
    mutationFn: async (data: {
      name: string;
      station_type: string;
      line_code: string | null;
      supported_variants: string[];
    }) => sdk.admin.createMachine(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      setIsModalOpen(false);
      setFormData(EMPTY_FORM);
      setEditingId(null);
      setError(undefined);
      showToast("Machine created successfully");
    },
    onError: (err) => setError(formatApiError(err)),
  });

  const updateMachine = useMutation({
    mutationFn: async (data: {
      name: string;
      station_type: string;
      line_code: string | null;
      supported_variants: string[];
    }) => sdk.admin.updateMachine(editingId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      setIsModalOpen(false);
      setFormData(EMPTY_FORM);
      setEditingId(null);
      setError(undefined);
      showToast("Machine updated successfully");
    },
    onError: (err) => setError(formatApiError(err)),
  });

  const deleteMachine = useMutation({
    mutationFn: async (id: string) => sdk.admin.deleteMachine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      showToast("Machine deactivated");
    },
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

  const columns = useMemo<ColumnDef<Machine>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        accessorKey: "name",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                <Cpu className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <span className="font-bold">{row.original.name}</span>
          </div>
        ),
      },
      { id: "station_type", header: "Station Type", accessorKey: "station_type" },
      {
        id: "line_code",
        header: "Line Code",
        accessorKey: "line_code",
        cell: ({ row }) =>
          row.original.line_code ? <span className="font-mono text-sm">{row.original.line_code}</span> : "-",
      },
      {
        id: "supported_variants",
        header: "Supported Variants",
        accessorKey: "supported_variants",
        cell: ({ row }) => (
          <div className="max-w-[200px] truncate">
            {row.original.supported_variants?.length ? row.original.supported_variants.join(", ") : "-"}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(row.original)} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => setDeleteTarget(row.original.id)}
              title="Deactivate"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const isSubmitting = createMachine.isPending || updateMachine.isPending;

  return (
    <PageLayout
      title="Production Machines"
      subtitle={
        <div className="flex items-center gap-2">
          <span className="indicator-live" />
          <span>Configured physical equipment and assembly lines</span>
        </div>
      }
      icon="machine"
      iconColor="indigo"
    >
      <div className="page-container">
        <ApiErrorBanner message={error} />
        <DataTable
          data={machines}
          columns={columns}
          loading={isLoading}
          actions={
            <Button className="button-hover-scale" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Machine
            </Button>
          }
        />
      </div>

      <FormDialog
        open={isModalOpen}
        title={editingId ? "Edit Machine" : "Create Machine"}
        onClose={() => setIsModalOpen(false)}
        onSubmit={submit}
        submitting={isSubmitting}
      >
        <div className="flex flex-col gap-4 min-w-[400px]">
          <div className="grid gap-2">
            <Label htmlFor="machine-name">Machine Name *</Label>
            <Input
              id="machine-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Station Type *</Label>
            <Select value={formData.station_type} onValueChange={(v) => setFormData({ ...formData, station_type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="machine-line">Line Code</Label>
            <Input
              id="machine-line"
              value={formData.line_code}
              onChange={(e) => setFormData({ ...formData, line_code: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="machine-variants">Supported Variants (comma separated)</Label>
            <Input
              id="machine-variants"
              value={formData.supported_variants}
              onChange={(e) => setFormData({ ...formData, supported_variants: e.target.value })}
              placeholder="WITH_SHROUD, NO_SHROUD"
            />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Deactivate Machine"
        description="Are you sure you want to deactivate this machine? This action will prevent it from being used at stations."
        confirmText="Deactivate"
        destructive
        submitting={deleteMachine.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMachine.mutate(deleteTarget, {
              onSuccess: () => setDeleteTarget(null),
            });
          }
        }}
      />
    </PageLayout>
  );
}
