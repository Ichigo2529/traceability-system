import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TraceResult } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { 
    Page, 
    Bar, 
    Title, 
    Button, 
    Card, 
    CardHeader, 
    Input, 
    Label, 
    MessageStrip, 
    FlexBox, 
    FlexBoxAlignItems,
    Icon,
    Timeline,
    TimelineItem,
} from "@ui5/webcomponents-react";
import { StatusBadge } from "../../components/shared/StatusBadge";
import "@ui5/webcomponents-icons/dist/search.js";
import "@ui5/webcomponents-icons/dist/history.js";
import "@ui5/webcomponents-icons/dist/product.js";

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
    <Page
      header={<Bar startContent={<Title level="H2">History / Trace View</Title>} />}
      backgroundDesign="List"
      style={{ height: "100%" }}
    >
      <div style={{ padding: "1rem", maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
        
        <Card header={<CardHeader titleText="Trace & Search" subtitleText="Search by serial, tray, carton, or pallet" />}>
          <div style={{ padding: "1rem", display: "flex", gap: "0.5rem" }}>
            <Input 
                value={keyword} 
                onInput={(e) => setKeyword(e.target.value)} 
                placeholder="Enter serial ID..."
                style={{ flex: 1 }}
                icon={<Icon name="search" />}
                onKeyDown={(e) => { if(e.key === 'Enter') setQueryKeyword(keyword.trim()) }}
            />
            <Button design="Emphasized" onClick={() => setQueryKeyword(keyword.trim())} disabled={!keyword.trim()}>
              Search
            </Button>
          </div>
        </Card>

        {!queryKeyword && (
            <MessageStrip design="Information" hideCloseButton>
                Enter a serial ID above to view the full traceability timeline.
            </MessageStrip>
        )}

        {traceQuery.error && (
            <MessageStrip design="Negative" hideCloseButton>
                Trace not found. No genealogy result was returned for this serial.
            </MessageStrip>
        )}

        {traceQuery.data && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem", alignItems: "start" }}>
                
                <Card header={<CardHeader titleText="Unit Summary" avatar={<Icon name="product" />} />}>
                    <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                            <Label>ID:</Label>
                            <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>{traceQuery.data.unit.id}</span>
                        </FlexBox>
                        <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                            <Label>Type:</Label>
                            <span>{traceQuery.data.unit.unitType}</span>
                        </FlexBox>
                        <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                            <Label>Status:</Label>
                            <StatusBadge status={traceQuery.data.unit.status} />
                        </FlexBox>
                        <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                            <Label>Line:</Label>
                            <span>{traceQuery.data.unit.lineCode || "-"}</span>
                        </FlexBox>
                    </div>
                </Card>

                <Card header={<CardHeader titleText="Timeline" avatar={<Icon name="history" />} />}>
                    <div style={{ padding: "1rem" }}>
                        {events.length === 0 ? (
                            <div style={{ color: "var(--sapContent_LabelColor)", fontStyle: "italic" }}>No events recorded.</div>
                        ) : (
                            <Timeline>
                                {events.map((event: any, index: number) => (
                                    <TimelineItem 
                                        key={`${event.id || event.event_id || index}`}
                                        titleText={event.event_type || event.type || "EVENT"}
                                        subtitleText={event.created_at || event.created_at_device || event.timestamp || "-"}
                                        icon="history"
                                        state="None"
                                    >
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                            <div>
                                                <Label>Device: </Label>
                                                <span>{event.device_id || event.deviceCode || "-"}</span>
                                            </div>
                                            <div>
                                                <Label>User: </Label>
                                                <span>{event.user_id || event.operator || "-"}</span>
                                            </div>
                                            <div>
                                                <Label>Station: </Label>
                                                <span>{event.station || event.station_name || "-"}</span>
                                            </div>
                                        </div>
                                    </TimelineItem>
                                ))}
                            </Timeline>
                        )}
                    </div>
                </Card>

            </div>
        )}
      </div>
    </Page>
  );
}
