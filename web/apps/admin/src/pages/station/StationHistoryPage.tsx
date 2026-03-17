import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TraceResult } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Package, History } from "lucide-react";

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
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b px-4 py-3">
        <h2 className="text-xl font-semibold">History / Trace View</h2>
      </header>

      <div className="p-4 max-w-[1000px] mx-auto flex flex-col gap-4 flex-1">
        <Card>
          <CardHeader>
            <CardTitle>Trace & Search</CardTitle>
            <CardDescription>Search by serial, tray, carton, or pallet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Enter serial ID..."
                  className="pl-9"
                  onKeyDown={(e) => e.key === "Enter" && setQueryKeyword(keyword.trim())}
                />
              </div>
              <Button onClick={() => setQueryKeyword(keyword.trim())} disabled={!keyword.trim()}>
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {!queryKeyword && (
          <Alert>
            <AlertDescription>Enter a serial ID above to view the full traceability timeline.</AlertDescription>
          </Alert>
        )}

        {traceQuery.error && (
          <Alert variant="destructive">
            <AlertDescription>Trace not found. No genealogy result was returned for this serial.</AlertDescription>
          </Alert>
        )}

        {traceQuery.data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Unit Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Label className="shrink-0">ID:</Label>
                  <span className="font-mono font-semibold truncate">{traceQuery.data.unit.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="shrink-0">Type:</Label>
                  <span>{traceQuery.data.unit.unitType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="shrink-0">Status:</Label>
                  <StatusBadge status={traceQuery.data.unit.status} />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="shrink-0">Line:</Label>
                  <span>{traceQuery.data.unit.lineCode || "-"}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <p className="text-muted-foreground italic">No events recorded.</p>
                ) : (
                  <ul className="space-y-0 border-l-2 border-muted pl-4 ml-2">
                    {events.map((event: any, index: number) => (
                      <li key={event.id || event.event_id || index} className="relative pb-6 last:pb-0">
                        <span className="absolute -left-[29px] top-0 w-2 h-2 rounded-full bg-primary" />
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold">{event.event_type || event.type || "EVENT"}</span>
                          <span className="text-xs text-muted-foreground">
                            {event.created_at || event.created_at_device || event.timestamp || "-"}
                          </span>
                          <div className="flex flex-col gap-0.5 mt-1 text-sm">
                            <div>
                              <Label className="text-muted-foreground font-normal">Device: </Label>
                              <span>{event.device_id || event.deviceCode || "-"}</span>
                            </div>
                            <div>
                              <Label className="text-muted-foreground font-normal">User: </Label>
                              <span>{event.user_id || event.operator || "-"}</span>
                            </div>
                            <div>
                              <Label className="text-muted-foreground font-normal">Station: </Label>
                              <span>{event.station || event.station_name || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
