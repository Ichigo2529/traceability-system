import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageLayout } from "@traceability/ui";
import { Button } from "@/components/ui/button";
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
      <div className="flex gap-1 border-b mb-4">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            selectedTab === "PENDING"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setSelectedTab("PENDING")}
        >
          Awaiting Pickup
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            selectedTab === "ACTIVE"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setSelectedTab("ACTIVE")}
        >
          My Active Hauls
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            selectedTab === "COMPLETED"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setSelectedTab("COMPLETED")}
        >
          Completed
        </button>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
              aria-hidden
            />
          </div>
        ) : batches.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground opacity-80">
            <p className="text-lg mb-4">No batches found in this status.</p>
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left font-semibold p-3">Batch No</th>
                  <th className="text-left font-semibold p-3">MR ID</th>
                  <th className="text-left font-semibold p-3">Created</th>
                  <th className="text-left font-semibold p-3">Progress</th>
                  <th className="text-left font-semibold p-3">Status</th>
                  <th className="text-left font-semibold p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id} className="border-b last:border-0">
                    <td className="p-3 font-semibold">{batch.batchNo}</td>
                    <td className="p-3">{batch.materialRequestId.slice(0, 8)}…</td>
                    <td className="p-3">{new Date(batch.createdAt).toLocaleString()}</td>
                    <td className="p-3">
                      {batch.scannedItemCount} / {batch.expectedItemCount}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                          statusVariant[batch.status] ?? "bg-muted text-muted-foreground"
                        }`}
                      >
                        {batch.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-3">
                      {selectedTab === "PENDING" && (
                        <Button onClick={() => pickupMutation.mutate(batch.id)} disabled={pickupMutation.isPending}>
                          <Package className="h-4 w-4 mr-2" />
                          Acknowledge &amp; Pickup
                        </Button>
                      )}
                      {selectedTab === "ACTIVE" && (
                        <Button
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => startSessionMutation.mutate(batch.id)}
                          disabled={startSessionMutation.isPending}
                        >
                          <ArrowRightCircle className="h-4 w-4 mr-2" />
                          Start Scanning
                        </Button>
                      )}
                      {selectedTab === "COMPLETED" && <Button variant="ghost">View Details</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
