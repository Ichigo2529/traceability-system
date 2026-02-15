import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { sdk } from "../context/AuthContext";
import { ConfigAuditLog } from "@traceability/sdk";
import { DataTable } from "../components/shared/DataTable";
import { formatDateTime } from "../lib/datetime";

export default function AuditLogsPage() {
  const [entityType, setEntityType] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", entityType],
    queryFn: () => sdk.admin.getAuditLogs(entityType ? { entity_type: entityType } : undefined),
  });

  const columns = useMemo<ColumnDef<ConfigAuditLog>[]>(
    () => [
      {
        header: "Time",
        accessorKey: "created_at",
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        header: "User",
        accessorKey: "username",
        cell: ({ row }) => row.original.username || "system",
      },
      { header: "Entity", accessorKey: "entity_type" },
      { header: "Action", accessorKey: "action" },
      {
        header: "Entity ID",
        accessorKey: "entity_id",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.entity_id}</span>,
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Config Audit Logs</h1>
        <select className="px-3 py-2 border rounded-md" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
          <option value="">All Entities</option>
          <option value="MODEL">MODEL</option>
          <option value="REVISION">REVISION</option>
          <option value="VARIANT">VARIANT</option>
          <option value="BOM">BOM</option>
          <option value="ROUTING_STEP">ROUTING_STEP</option>
          <option value="LABEL_TEMPLATE">LABEL_TEMPLATE</option>
          <option value="LABEL_BINDING">LABEL_BINDING</option>
          <option value="MACHINE">MACHINE</option>
          <option value="DEVICE">DEVICE</option>
          <option value="USER">USER</option>
        </select>
      </div>

      {isLoading ? (
        <AuditLogTableSkeleton />
      ) : (
        <DataTable data={logs} columns={columns} filterPlaceholder="Search audit logs..." initialPageSize={20} />
      )}
    </div>
  );
}

function AuditLogTableSkeleton() {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-4 h-9 w-64 animate-pulse rounded-md bg-slate-200" />
      <div className="overflow-hidden rounded-lg border">
        <div className="grid grid-cols-5 bg-slate-50">
          <div className="h-10 animate-pulse border-r bg-slate-100" />
          <div className="h-10 animate-pulse border-r bg-slate-100" />
          <div className="h-10 animate-pulse border-r bg-slate-100" />
          <div className="h-10 animate-pulse border-r bg-slate-100" />
          <div className="h-10 animate-pulse bg-slate-100" />
        </div>
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="grid grid-cols-5 border-t">
            <div className="h-12 animate-pulse border-r bg-white" />
            <div className="h-12 animate-pulse border-r bg-white" />
            <div className="h-12 animate-pulse border-r bg-white" />
            <div className="h-12 animate-pulse border-r bg-white" />
            <div className="h-12 animate-pulse bg-white" />
          </div>
        ))}
      </div>
    </div>
  );
}
