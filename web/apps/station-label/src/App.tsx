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
            titleText="Station: Label Printing"
            subtitleText="Generate production labels with controlled revision templates."
          />
        }
      >
        <div className="station-content">
          <Text className="station-description">
            Ready to print labels using the approved template revision.
          </Text>
          <Button design="Default">Generate Labels</Button>
        </div>
      </Card>
    </div>
  );
}

export default App;
