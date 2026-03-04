import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Page,
  Bar,
  Title,
  Button,
  Table,
  TableRow,
  TableCell,
  TableHeaderRow,
  TableHeaderCell,
  FlexBox,
  FlexBoxDirection,
  FlexBoxAlignItems,
  FlexBoxJustifyContent,
  Text,
  BusyIndicator,
  TabContainer,
  Tab,
  ObjectStatus,
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/shipping-status.js";
import "@ui5/webcomponents-icons/dist/accept.js";
import "@ui5/webcomponents-icons/dist/decline.js";
import "@ui5/webcomponents-icons/dist/navigation-right-arrow.js";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  getHandoverBatches,
  pickupBatch,
  startScanSession,
  type HandoverBatch,
} from "../../lib/handover-api";
import { useHandoverRealtime } from "../../hooks/useHandoverRealtime";

type TabKey = "PENDING" | "ACTIVE" | "COMPLETED";

export function ForkliftIntakePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<TabKey>("PENDING");

  const statusFilterMap: Record<TabKey, string | undefined> = {
    PENDING: "PENDING",
    ACTIVE: "IN_TRANSIT",
    COMPLETED: "RECEIVED",
  };

  // SSE real-time updates — invalidates query cache when backend pushes events
  useHandoverRealtime({
    enabled: true,
    queryKeys: [["handover-batches"]],
  });

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["handover-batches", selectedTab],
    queryFn: () => getHandoverBatches({ status: statusFilterMap[selectedTab] }),
    // With SSE we don't need aggressive polling; keep a fallback at 30s
    refetchInterval: 30_000,
  });

  const pickupMutation = useMutation({
    mutationFn: (batchId: string) => pickupBatch(batchId),
    onSuccess: () => {
      toast.success("Batch picked up successfully.");
      queryClient.invalidateQueries({ queryKey: ["handover-batches"] });
      setSelectedTab("ACTIVE");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const startSessionMutation = useMutation({
    mutationFn: (batchId: string) => startScanSession(batchId),
    onSuccess: (session) => {
      navigate(`/admin/scan-session/${session.id}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const statusColor = (s: HandoverBatch["status"]) => {
    switch (s) {
      case "PENDING":   return "Warning";
      case "IN_TRANSIT": return "Information";
      case "RECEIVED":  return "Positive";
      case "RECEIVED_PARTIAL": return "Critical";
      case "CANCELLED": return "Negative";
      default:          return "None";
    }
  };

  return (
    <Page
      header={<Bar startContent={<Title>Forklift Intake</Title>} />}
      style={{ height: "100%" }}
    >
      <TabContainer
        onTabSelect={(e: any) => {
          const key = e.detail?.tab?.dataset?.tab as TabKey | undefined;
          if (key) setSelectedTab(key);
        }}
      >
        <Tab text="Awaiting Pickup" data-tab="PENDING" selected={selectedTab === "PENDING"} />
        <Tab text="My Active Hauls" data-tab="ACTIVE" selected={selectedTab === "ACTIVE"} />
        <Tab text="Completed" data-tab="COMPLETED" selected={selectedTab === "COMPLETED"} />
      </TabContainer>

      <div style={{ padding: "1rem" }}>
        {isLoading ? (
          <FlexBox justifyContent={FlexBoxJustifyContent.Center} style={{ padding: "2rem" }}>
            <BusyIndicator active />
          </FlexBox>
        ) : batches.length === 0 ? (
          <FlexBox
            direction={FlexBoxDirection.Column}
            alignItems={FlexBoxAlignItems.Center}
            style={{ padding: "3rem", opacity: 0.6 }}
          >
            <Text style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>
              No batches found in this status.
            </Text>
          </FlexBox>
        ) : (
          <Table
            headerRow={
              <TableHeaderRow>
                <TableHeaderCell>Batch No</TableHeaderCell>
                <TableHeaderCell>MR ID</TableHeaderCell>
                <TableHeaderCell>Created</TableHeaderCell>
                <TableHeaderCell>Progress</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableHeaderRow>
            }
          >
            {batches.map((batch) => (
              <TableRow key={batch.id}>
                <TableCell>
                  <Text style={{ fontWeight: "bold" }}>{batch.batchNo}</Text>
                </TableCell>
                <TableCell>
                  <Text>{batch.materialRequestId.slice(0, 8)}…</Text>
                </TableCell>
                <TableCell>
                  <Text>{new Date(batch.createdAt).toLocaleString()}</Text>
                </TableCell>
                <TableCell>
                  <Text>
                    {batch.scannedItemCount} / {batch.expectedItemCount}
                  </Text>
                </TableCell>
                <TableCell>
                  <ObjectStatus state={statusColor(batch.status) as any}>
                    {batch.status.replace(/_/g, " ")}
                  </ObjectStatus>
                </TableCell>
                <TableCell>
                  {selectedTab === "PENDING" && (
                    <Button
                      icon="shipping-status"
                      design="Emphasized"
                      onClick={() => pickupMutation.mutate(batch.id)}
                      disabled={pickupMutation.isPending}
                    >
                      Acknowledge &amp; Pickup
                    </Button>
                  )}
                  {selectedTab === "ACTIVE" && (
                    <Button
                      icon="navigation-right-arrow"
                      design="Positive"
                      onClick={() => startSessionMutation.mutate(batch.id)}
                      disabled={startSessionMutation.isPending}
                    >
                      Start Scanning
                    </Button>
                  )}
                  {selectedTab === "COMPLETED" && (
                    <Button design="Transparent">View Details</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </Table>
        )}
      </div>
    </Page>
  );
}
