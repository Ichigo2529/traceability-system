import { ApiClient } from "@traceability/sdk";
import { Button, Card } from "@traceability/ui";

const api = new ApiClient(import.meta.env.VITE_API_BASE_URL);

function App() {
  console.log("API Client initialized:", api); // Suppress unused var
  return (
    <div className="station-shell">
      <div className="w-full max-w-[48rem]">
        <Card title="Station: Packing" description="Outer packing execution with carton verification controls.">
          <div className="station-content">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ready to complete packing with carton and traceability safeguards.
            </p>
            <Button variant="danger">Pack Outer</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default App;
