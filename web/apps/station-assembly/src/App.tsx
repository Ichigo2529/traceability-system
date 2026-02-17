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
            titleText="Station: Assembly"
            subtitleText="Component binding and trace verification console."
          />
        }
      >
        <div className="station-content">
          <Text className="station-description">
            Ready to bind components and verify genealogy in one workflow.
          </Text>
          <Button design="Emphasized">Bind Components</Button>
        </div>
      </Card>
    </div>
  );
}

export default App;
