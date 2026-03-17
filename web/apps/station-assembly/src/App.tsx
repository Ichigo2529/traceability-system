import { ApiClient, getApiBaseUrl } from "@traceability/sdk";
import { Button, Card } from "@traceability/ui";

const api = new ApiClient(getApiBaseUrl(import.meta.env.VITE_API_BASE_URL));

function App() {
  console.log("API Client initialized:", api); // Suppress unused var
  return (
    <div className="station-shell">
      <div className="w-full max-w-[48rem]">
        <Card title="Station: Assembly" description="Component binding and trace verification console.">
          <div className="station-content">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ready to bind components and verify genealogy in one workflow.
            </p>
            <Button variant="primary">Bind Components</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default App;
