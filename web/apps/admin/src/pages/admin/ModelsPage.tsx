import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Model } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { DataTable } from "../../components/shared/DataTable";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { PageLayout } from "@traceability/ui";
import { Button } from "@/components/ui/button";
import { useToast } from "../../hooks/useToast";
import { ModelDetailPanel } from "../../components/shared/ModelDetailPanel";
import { Plus, Trash2 } from "lucide-react";

export function ModelsPage() {
  const queryClient = useQueryClient();
  const [layout, setLayout] = useState<"OneColumn" | "TwoColumnsMidExpanded">("OneColumn");
  const [editing, setEditing] = useState<Model | null | undefined>(undefined);

  useEffect(() => {
    if (editing === undefined && layout !== "OneColumn") {
      setLayout("OneColumn");
    }
  }, [editing, layout]);

  const [deleteTarget, setDeleteTarget] = useState<Model | null>(null);
  const { showToast } = useToast();
  const { data: models = [], isLoading } = useQuery({ queryKey: ["models"], queryFn: () => sdk.admin.getModels() });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.admin.deleteModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      showToast("Model deleted");
    },
  });

  const allColumns = useMemo<ColumnDef<Model>[]>(
    () => [
      { id: "code", header: "Model Code", accessorKey: "code", minSize: 120 },
      { id: "name", header: "Model Name", accessorKey: "name", minSize: 200 },
      {
        id: "part_number",
        header: "Part Number",
        accessorKey: "part_number",
        minSize: 140,
        cell: ({ row }) => row.original.part_number || "-",
      },
      { id: "pack_size", header: "FOF Tray Pack Size", accessorKey: "pack_size", minSize: 140 },
      {
        id: "active_revision",
        header: "Active Revision",
        accessorKey: "active_revision_code",
        minSize: 140,
        cell: ({ row }) => row.original.active_revision_code || "-",
      },
      {
        id: "status",
        header: "Status",
        minSize: 100,
        cell: ({ row }) => <StatusBadge status={row.original.active ? "active" : "disabled"} />,
      },
      {
        id: "actions",
        header: "",
        size: 50,
        enableResizing: false,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row.original);
            }}
            title="Delete Model"
            aria-label="Delete Model"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    []
  );

  const columns = useMemo(() => {
    if (layout === "OneColumn") return allColumns;
    return allColumns.filter((c) => ["name", "part_number", "status", "actions"].includes(c.id as string));
  }, [allColumns, layout]);

  return (
    <PageLayout
      title="Models"
      fullHeight={true}
      subtitle={
        <div className="flex items-center gap-2">
          <span className="indicator-live" />
          <span>Manage product models and specifications</span>
        </div>
      }
      icon="product"
      iconColor="blue"
    >
      <div className="flex h-full gap-0" style={{ minHeight: 0 }}>
        <div
          className={`page-container flex flex-col ${layout === "TwoColumnsMidExpanded" ? "w-1/2 min-w-0 border-r border-border" : "flex-1"}`}
          style={{ height: "100%" }}
        >
          <ApiErrorBanner message={deleteMutation.error ? formatApiError(deleteMutation.error) : undefined} />

          <DataTable
            data={models}
            columns={columns}
            loading={isLoading}
            filterPlaceholder="Search models..."
            hideEmptyState={layout !== "OneColumn"}
            onRowClick={(row) => {
              setEditing(row);
              setLayout("TwoColumnsMidExpanded");
            }}
            actions={
              <Button
                className="button-hover-scale"
                onClick={() => {
                  setEditing(null);
                  setLayout("TwoColumnsMidExpanded");
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Model
              </Button>
            }
          />
        </div>

        {layout === "TwoColumnsMidExpanded" && (
          <div className="w-1/2 min-w-0 flex flex-col overflow-hidden">
            {editing !== undefined && (
              <ModelDetailPanel
                model={editing!}
                onClose={() => {
                  setLayout("OneColumn");
                  setEditing(undefined);
                }}
                onSaved={() => {
                  queryClient.invalidateQueries({ queryKey: ["models"] });
                  setLayout("OneColumn");
                  showToast(editing ? "Model updated successfully" : "Model created successfully");
                }}
              />
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Model"
        description={`Are you sure you want to delete model "${deleteTarget?.name}"?`}
        confirmText="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </PageLayout>
  );
}
