import { ApiClient } from '@traceability/sdk';
import { db } from '@traceability/offline-queue';
import { Button, Card, CardHeader, Text } from '@ui5/webcomponents-react';

const api = new ApiClient(import.meta.env.VITE_API_BASE_URL);

function App() {
  console.log('API Client initialized:', api); // Suppress unused var
  const handleOfflineTest = async () => {
    await db.queued_events.add({
      event_id: crypto.randomUUID(),
      event_type: 'TEST_EVENT',
      payload: { foo: 'bar' },
      created_at: new Date().toISOString(),
      retry_count: 0,
    });
    alert('Enqueued event to Dexie');
  };

  return (
    <div className="station-shell">
      <Card
        className="station-card"
        header={
          <CardHeader
            titleText="Shopfloor Kiosk (Pi5)"
            subtitleText="Offline-first event buffering for production continuity."
          />
        }
      >
        <div className="station-content">
          <Text className="station-description">
            Queue events locally and sync them when the line network is available.
          </Text>
          <Button design="Default" onClick={handleOfflineTest}>
            Test Offline Queue
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default App;
