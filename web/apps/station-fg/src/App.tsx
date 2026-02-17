import { ApiClient } from '@traceability/sdk';
import { Button, Card, CardHeader, Text } from '@ui5/webcomponents-react';

const api = new ApiClient(import.meta.env.VITE_API_BASE_URL);

function App() {
  console.log('API Client initialized:', api); // Suppress unused var
  return (
    <div className="station-shell">
      <Card
        className="station-card"
        header={
          <CardHeader
            titleText="Station: Finished Goods"
            subtitleText="Pallet mapping, verification, and outbound confirmation."
          />
        }
      >
        <div className="station-content">
          <Text className="station-description">
            Ready for final mapping and shipment confirmation workflow.
          </Text>
          <Button design="Emphasized">Map Pallet</Button>
        </div>
      </Card>
    </div>
  );
}

export default App;
