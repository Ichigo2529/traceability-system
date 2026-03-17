import { ApiClient, getApiBaseUrl } from "@traceability/sdk";
import { Button, Card } from "@traceability/ui";

const api = new ApiClient(getApiBaseUrl(import.meta.env.VITE_API_BASE_URL));

function App() {
  console.log("API Client initialized:", api); // Suppress unused var
  return (
    <div className="station-shell">
      <div className="w-full max-w-[48rem]">
        <Card title="Station: Finished Goods" description="Pallet mapping, verification, and outbound confirmation.">
          <div className="station-content">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ready for final mapping and shipment confirmation workflow.
            </p>
            <Button variant="primary">Map Pallet</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default App;
