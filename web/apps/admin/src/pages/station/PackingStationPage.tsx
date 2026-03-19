import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sdk } from "../../context/AuthContext";

import { StationHeader } from "../../components/shared/StationHeader";
import { StationActionBar, StationActionButton } from "../../components/shared/StationActionBar";
import { FullscreenResultOverlay } from "../../components/shared/FullscreenResultOverlay";
import { StationResultFeedback, type StationResultFeedbackState } from "../../components/shared/StationResultFeedback";
import { ScanInput } from "../../components/shared/ScanInput";
import { ErrorState, LoadingSkeleton } from "../../components/shared/States";
import { StatusBadge } from "../../components/shared/StatusBadge";

import { useStationEvent } from "../../hooks/useStationEvent";
import { formatStationError } from "../../lib/station-errors";
import { PageStack } from "@traceability/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function genEventId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function PackingStationPage() {
  const navigate = useNavigate();
  const { publishEvent } = useStationEvent();
  const [assyId, setAssyId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [groups, setGroups] = useState<string[]>([]);
  const [outers, setOuters] = useState<string[]>([]);
  const [latestResult, setLatestResult] = useState<StationResultFeedbackState | null>(null);
  const [overlay, setOverlay] = useState<{ open: boolean; mode: "PASS" | "NG"; title: string; description?: string }>({
    open: false,
    mode: "PASS",
    title: "",
  });

  const heartbeatQuery = useQuery({
    queryKey: ["packing-heartbeat"],
    queryFn: () => sdk.device.heartbeat(),
    retry: false,
  });

  useEffect(() => {
    if (!heartbeatQuery.error) return;
    const err = heartbeatQuery.error as { code?: string };
    if (err.code === "DEVICE_NOT_REGISTERED") {
      navigate("/station/register", { replace: true });
    }
  }, [heartbeatQuery.error, navigate]);

  const splitMutation = useMutation({
    mutationFn: async (targetAssyId: string) =>
      publishEvent({
        event_id: genEventId(),
        event_type: "SPLIT_GROUP_CREATED",
        payload: { assy_id: targetAssyId },
        created_at_device: new Date().toISOString(),
      }),
    onSuccess: (result) => {
      const res = result.queued ? ({} as Record<string, unknown>) : ((result.data ?? {}) as Record<string, unknown>);
      const generatedGroups = Array.isArray(res.generated_groups) ? (res.generated_groups as string[]) : [];
      setGroups(generatedGroups);
      const nextResult = {
        mode: "PASS" as const,
        title: result.queued ? "Queued Offline" : "Groups Created",
        description: result.queued
          ? "Group creation was queued for sync."
          : `Generated ${generatedGroups.length} groups.`,
      };
      setLatestResult(nextResult);
      setOverlay({ open: true, ...nextResult });
    },
    onError: (err) => {
      const nextResult = {
        mode: "NG" as const,
        title: "Group Creation Failed",
        description: formatStationError(err, "Split group failed"),
      };
      setLatestResult(nextResult);
      setOverlay({ open: true, ...nextResult });
    },
  });

  const outerMutation = useMutation({
    mutationFn: async (targetGroupId: string) =>
      publishEvent({
        event_id: genEventId(),
        event_type: "OUTER_PACKED",
        payload: { group_id: targetGroupId },
        created_at_device: new Date().toISOString(),
      }),
    onSuccess: (result) => {
      const res = result.queued ? ({} as Record<string, unknown>) : ((result.data ?? {}) as Record<string, unknown>);
      const outerId = (res.outer_id as string) || "";
      if (outerId) setOuters((prev) => [outerId, ...prev].slice(0, 10));
      setGroupId("");
      const nextResult = {
        mode: "PASS" as const,
        title: result.queued ? "Queued Offline" : "Outer Packed",
        description: result.queued
          ? "Outer packing was queued for sync."
          : outerId
            ? `Outer ${outerId} created.`
            : "Group packed to outer.",
      };
      setLatestResult(nextResult);
      setOverlay({ open: true, ...nextResult });
    },
    onError: (err) => {
      const nextResult = {
        mode: "NG" as const,
        title: "Outer Packing Failed",
        description: formatStationError(err, "Outer packing failed"),
      };
      setLatestResult(nextResult);
      setOverlay({ open: true, ...nextResult });
    },
  });

  if (heartbeatQuery.isLoading) return <LoadingSkeleton label="Preparing packing station..." />;
  if (heartbeatQuery.error)
    return <ErrorState title="Packing station offline" description="Device is not registered or token is invalid." />;
  if (heartbeatQuery.data?.status === "disabled")
    return <ErrorState title="Device Disabled" description="This station is disabled by admin." />;

  return (
    <PageStack>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Packing Station</h1>
          <p className="text-sm text-muted-foreground">Create groups from trays and pack group into outer carton.</p>
        </div>
      </div>
      <StationHeader
        stationName={heartbeatQuery.data?.station?.name || "Unassigned"}
        processName={heartbeatQuery.data?.process?.name || "Unassigned"}
        deviceStatus={heartbeatQuery.data?.status || "active"}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle>Packing Flow</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-4">
            <StationResultFeedback result={latestResult} />
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">1. Split ASSY into groups (2 x 60)</p>
              <ScanInput
                name="packing-assy-id"
                ariaLabel="ASSY ID"
                value={assyId}
                onChange={setAssyId}
                onSubmit={() => splitMutation.mutate(assyId.trim())}
                placeholder="Scan ASSY ID"
              />
              <StationActionBar>
                <StationActionButton
                  onClick={() => splitMutation.mutate(assyId.trim())}
                  disabled={splitMutation.isPending || !assyId.trim()}
                >
                  {splitMutation.isPending ? "Creating…" : "Create Groups"}
                </StationActionButton>
              </StationActionBar>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">2. Pack group into outer</p>
              <ScanInput
                name="packing-group-id"
                ariaLabel="Group ID"
                value={groupId}
                onChange={setGroupId}
                onSubmit={() => outerMutation.mutate(groupId.trim())}
                placeholder="Scan GROUP ID"
              />
              <StationActionBar>
                <StationActionButton
                  onClick={() => outerMutation.mutate(groupId.trim())}
                  disabled={outerMutation.isPending || !groupId.trim()}
                >
                  {outerMutation.isPending ? "Packing…" : "Pack to Outer"}
                </StationActionButton>
              </StationActionBar>
            </div>

            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium mb-1">Latest Groups</p>
              {!groups.length ? (
                <p className="text-muted-foreground">No generated groups</p>
              ) : (
                groups.map((g) => (
                  <p key={g} className="font-mono text-xs text-foreground">
                    {g}
                  </p>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle>Station Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-2 text-sm">
            <p>
              Device status: <StatusBadge status={heartbeatQuery.data?.status || "active"} />
            </p>
            <p>Station: {heartbeatQuery.data?.station?.name || "Unassigned"}</p>
            <p>Process: {heartbeatQuery.data?.process?.name || "Unassigned"}</p>
            <p>Created outers: {outers.length}</p>
            {outers.length > 0 && (
              <div className="rounded-lg border border-border p-2 mt-1">
                {outers.map((id) => (
                  <p key={id} className="font-mono text-xs text-foreground">
                    {id}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <FullscreenResultOverlay
        open={overlay.open}
        mode={overlay.mode}
        title={overlay.title}
        description={overlay.description}
        onClose={() => setOverlay((prev) => ({ ...prev, open: false }))}
      />
    </PageStack>
  );
}
