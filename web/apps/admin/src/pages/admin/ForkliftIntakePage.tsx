import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageLayout } from "@traceability/ui";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Package, ArrowRightCircle } from "lucide-react";
import { getHandoverBatches, pickupBatch, startScanSession } from "../../lib/handover-api";
import { useHandoverRealtime } from "../../hooks/useHandoverRealtime";

type TabKey = "PENDING" | "ACTIVE" | "COMPLETED";

const statusVariant: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  IN_TRANSIT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  RECEIVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  RECEIVED_PARTIAL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function ForkliftIntakePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<TabKey>("PENDING");

  const statusFilterMap: Record<TabKey, string | undefined> = {
    PENDING: "PENDING",
    ACTIVE: "IN_TRANSIT",
    COMPLETED: "RECEIVED",
  };

  useHandoverRealtime({
    enabled: true,
    queryKeys: [["handover-batches"]],
  });

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["handover-batches", selectedTab],
    queryFn: () => getHandoverBatches({ status: statusFilterMap[selectedTab] }),
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

  return (
    <PageLayout
      title="Forklift Intake"
      subtitle="Awaiting pickup, active hauls, and completed batches"
      icon="shipping-status"
      iconColor="blue"
    >
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="PENDING">Awaiting Pickup</TabsTrigger>
          <TabsTrigger value="ACTIVE">My Active Hauls</TabsTrigger>
          <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
        </TabsList>

        {(["PENDING", "ACTIVE", "COMPLETED"] as TabKey[]).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div
                  className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
                  aria-hidden
                />
              </div>
            ) : batches.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <p className="text-lg">No batches found in this status.</p>
              </div>
            ) : (
              <div className="border border-border rounded-md overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="text-left font-semibold px-4 py-3">Batch No</th>
                      <th className="text-left font-semibold px-4 py-3">MR ID</th>
                      <th className="text-left font-semibold px-4 py-3">Created</th>
                      <th className="text-left font-semibold px-4 py-3">Progress</th>
                      <th className="text-left font-semibold px-4 py-3">Status</th>
                      <th className="text-left font-semibold px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((batch) => (
                      <tr
                        key={batch.id}
                        className="border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold text-foreground">{batch.batchNo}</td>
                        <td className="px-4 py-3 text-foreground">{batch.materialRequestId.slice(0, 8)}…</td>
                        <td className="px-4 py-3 text-foreground">{new Date(batch.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-foreground">
                          {batch.scannedItemCount} / {batch.expectedItemCount}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                              statusVariant[batch.status] ?? "bg-muted text-muted-foreground"
                            }`}
                          >
                            {batch.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {tab === "PENDING" && (
                            <Button onClick={() => pickupMutation.mutate(batch.id)} disabled={pickupMutation.isPending}>
                              <Package className="h-4 w-4 mr-2" />
                              Acknowledge &amp; Pickup
                            </Button>
                          )}
                          {tab === "ACTIVE" && (
                            <Button
                              onClick={() => startSessionMutation.mutate(batch.id)}
                              disabled={startSessionMutation.isPending}
                            >
                              <ArrowRightCircle className="h-4 w-4 mr-2" />
                              Start Scanning
                            </Button>
                          )}
                          {tab === "COMPLETED" && <Button variant="ghost">View Details</Button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </PageLayout>
  );
}
