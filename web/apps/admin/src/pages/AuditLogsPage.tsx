import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { sdk } from "../context/AuthContext";
import { ConfigAuditLog } from "@traceability/sdk";
import { DataTable } from "../components/shared/DataTable";
import { formatDateTime } from "../lib/datetime";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageLayout, Section } from "@traceability/ui";

const SELECT_ALL_ENTITIES = "__all__";

const ENTITY_OPTIONS = [
  "",
  "MODEL",
  "REVISION",
  "VARIANT",
  "BOM",
  "ROUTING_STEP",
  "LABEL_TEMPLATE",
  "LABEL_BINDING",
  "MACHINE",
  "DEVICE",
  "USER",
];

export default function AuditLogsPage() {
  const [entityType, setEntityType] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", entityType],
    queryFn: () => sdk.admin.getAuditLogs(entityType ? { entity_type: entityType } : undefined),
  });

  const columns = useMemo<ColumnDef<ConfigAuditLog>[]>(
    () => [
      {
        id: "created_at",
        header: "Time",
        accessorKey: "created_at",
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        id: "username",
        header: "User",
        accessorKey: "username",
        cell: ({ row }) => row.original.username || "system",
      },
      { id: "entity_type", header: "Entity", accessorKey: "entity_type" },
      { id: "action", header: "Action", accessorKey: "action" },
      {
        id: "entity_id",
        header: "Entity ID",
        accessorKey: "entity_id",
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.entity_id}</span>,
      },
    ],
    []
  );

  return (
    <PageLayout
      title="Configuration Audit Logs"
      subtitle={
        <div className="flex items-center gap-2">
          <span>System-wide configuration changes and user actions</span>
        </div>
      }
      icon="history"
      iconColor="var(--icon-purple)"
    >
      <Section title="Audit Logs" variant="card">
        <DataTable
          data={logs}
          loading={isLoading}
          columns={columns}
          filterPlaceholder="Search event, actor, module, or record ID..."
          initialPageSize={20}
          actions={
            <div className="flex items-center gap-2">
              <Label>Filter by Entity Type:</Label>
              <Select
                value={entityType || SELECT_ALL_ENTITIES}
                onValueChange={(v) => setEntityType(v === SELECT_ALL_ENTITIES ? "" : v)}
              >
                <SelectTrigger className="min-w-[200px]">
                  <SelectValue placeholder="All Entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_ALL_ENTITIES}>All Entities</SelectItem>
                  {ENTITY_OPTIONS.filter(Boolean).map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
      </Section>
    </PageLayout>
  );
}
