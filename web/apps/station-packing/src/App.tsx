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
            titleText="Station: Packing"
            subtitleText="Outer packing execution with carton verification controls."
          />
        }
      >
        <div className="station-content">
          <Text className="station-description">
            Ready to complete packing with carton and traceability safeguards.
          </Text>
          <Button design="Negative">Pack Outer</Button>
        </div>
      </Card>
    </div>
  );
}

export default App;
