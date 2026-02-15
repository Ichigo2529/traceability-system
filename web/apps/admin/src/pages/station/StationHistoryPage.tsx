import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { TraceResult } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { StationHeader } from "../../components/shared/StationHeader";
import { EmptyState, ErrorState } from "../../components/shared/States";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

async function fetchTraceBySerial(serial: string): Promise<TraceResult> {
  try {
    return await sdk.trace.getTray(serial);
  } catch {
    try {
      return await sdk.trace.getOuter(serial);
    } catch {
      return sdk.trace.getPallet(serial);
    }
  }
}

export function StationHistoryPage() {
  const [keyword, setKeyword] = useState("");
  const [queryKeyword, setQueryKeyword] = useState("");

  const traceQuery = useQuery({
    queryKey: ["trace-history", queryKeyword],
    queryFn: () => fetchTraceBySerial(queryKeyword),
    enabled: Boolean(queryKeyword),
    retry: false,
  });

  const events = traceQuery.data?.events || [];

  return (
    <div className="space-y-6">
      <PageHeader title="History / Trace View" description="Search by serial and review event timeline." />
      <StationHeader />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-2 md:flex-row">
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Enter serial, tray, carton, or pallet" />
            <Button onClick={() => setQueryKeyword(keyword.trim())} disabled={!keyword.trim()}>
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {!queryKeyword ? <EmptyState title="No search yet" description="Enter serial ID to view full traceability timeline." /> : null}
      {traceQuery.error ? <ErrorState title="Trace not found" description="No genealogy result was returned for this serial." /> : null}

      {traceQuery.data ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Unit Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                ID: <span className="font-mono">{traceQuery.data.unit.id}</span>
              </p>
              <p>Type: {traceQuery.data.unit.unitType}</p>
              <p>Status: {traceQuery.data.unit.status}</p>
              <p>Line: {traceQuery.data.unit.lineCode || "-"}</p>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {!events.length ? (
                <p className="text-sm text-muted-foreground">No events recorded.</p>
              ) : (
                <div className="space-y-3">
                  {events.map((event: any, index: number) => (
                    <div key={`${event.id || event.event_id || index}`} className="rounded-lg border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">{event.event_type || event.type || "EVENT"}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.created_at || event.created_at_device || event.timestamp || "-"}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Device: {event.device_id || event.deviceCode || "-"} | User: {event.user_id || event.operator || "-"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Station: {event.station || event.station_name || "-"}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
