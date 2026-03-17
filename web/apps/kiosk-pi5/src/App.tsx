import { ApiClient } from "@traceability/sdk";
import { db } from "@traceability/offline-queue";
import { Button, Card } from "@traceability/ui";

const api = new ApiClient(import.meta.env.VITE_API_BASE_URL);

function App() {
  console.log("API Client initialized:", api); // Suppress unused var
  const handleOfflineTest = async () => {
    await db.queued_events.add({
      event_id: crypto.randomUUID(),
      event_type: "TEST_EVENT",
      payload: { foo: "bar" },
      created_at: new Date().toISOString(),
      retry_count: 0,
    });
    alert("Enqueued event to Dexie");
  };

  return (
    <div className="station-shell">
      <div className="w-full max-w-[48rem]">
        <Card title="Shopfloor Kiosk (Pi5)" description="Offline-first event buffering for production continuity.">
          <div className="station-content">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Queue events locally and sync them when the line network is available.
            </p>
            <Button variant="secondary" onClick={handleOfflineTest}>
              Test Offline Queue
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default App;
