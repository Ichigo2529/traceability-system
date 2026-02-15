import { Button } from '@traceability/ui';
import { ApiClient } from '@traceability/sdk';
import { db } from '@traceability/offline-queue';

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
    <div className="mes-shell">
      <div className="mes-panel max-w-3xl p-8">
        <h1 className="text-3xl font-bold mb-2">Shopfloor Kiosk (Pi5)</h1>
        <p className="text-sm text-gray-500 mb-6">Offline-first event buffering for production continuity.</p>
        <Button variant="secondary" onClick={handleOfflineTest}>Test Offline Queue</Button>
      </div>
    </div>
  )
}

export default App
