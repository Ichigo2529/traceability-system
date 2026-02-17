import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { sdk } from "../context/AuthContext";
import { ConfigAuditLog } from "@traceability/sdk";
import { DataTable } from "../components/shared/DataTable";
import { formatDateTime } from "../lib/datetime";
import { 
    Select, 
    Option, 
    BusyIndicator,
    Label,
    FlexBox,
    FlexBoxAlignItems,
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/history.js";
import { PageLayout, Section } from "@traceability/ui";

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
        cell: ({ row }) => <span style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>{row.original.entity_id}</span>,
      },
    ],
    []
  );

  return (
    <PageLayout
      title="Configuration Audit Logs"
      subtitle="System-wide configuration changes and user actions"
      icon="history"
    >
      <Section
        title="Audit Logs"
        variant="card"
      >
        {isLoading ? (
            <div style={{ padding: "3rem", display: "flex", justifyContent: "center" }}>
                <BusyIndicator active text="Loading audit logs..." />
            </div>
        ) : (
            <DataTable 
                data={logs} 
                columns={columns} 
                filterPlaceholder="Search audit logs..." 
                initialPageSize={20} 
                actions={
                    <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                        <Label>Filter by Entity Type:</Label>
                        <div style={{ minWidth: "200px" }}>
                            <Select onChange={(e) => setEntityType((e.target.selectedOption as any).dataset.value)}>
                                <Option value="" data-value="" selected={entityType === ""}>All Entities</Option>
                                <Option value="MODEL" data-value="MODEL" selected={entityType === "MODEL"}>MODEL</Option>
                                <Option value="REVISION" data-value="REVISION" selected={entityType === "REVISION"}>REVISION</Option>
                                <Option value="VARIANT" data-value="VARIANT" selected={entityType === "VARIANT"}>VARIANT</Option>
                                <Option value="BOM" data-value="BOM" selected={entityType === "BOM"}>BOM</Option>
                                <Option value="ROUTING_STEP" data-value="ROUTING_STEP" selected={entityType === "ROUTING_STEP"}>ROUTING_STEP</Option>
                                <Option value="LABEL_TEMPLATE" data-value="LABEL_TEMPLATE" selected={entityType === "LABEL_TEMPLATE"}>LABEL_TEMPLATE</Option>
                                <Option value="LABEL_BINDING" data-value="LABEL_BINDING" selected={entityType === "LABEL_BINDING"}>LABEL_BINDING</Option>
                                <Option value="MACHINE" data-value="MACHINE" selected={entityType === "MACHINE"}>MACHINE</Option>
                                <Option value="DEVICE" data-value="DEVICE" selected={entityType === "DEVICE"}>DEVICE</Option>
                                <Option value="USER" data-value="USER" selected={entityType === "USER"}>USER</Option>
                            </Select>
                        </div>
                    </FlexBox>
                }
            />
        )}
      </Section>
    </PageLayout>
  );
}
