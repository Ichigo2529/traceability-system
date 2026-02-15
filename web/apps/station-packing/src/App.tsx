import { Button } from '@traceability/ui';
import { ApiClient } from '@traceability/sdk';

const api = new ApiClient(import.meta.env.VITE_API_BASE_URL);

function App() {
  console.log('API Client initialized:', api); // Suppress unused var
  return (
    <div className="mes-shell">
      <div className="mes-panel max-w-3xl p-8">
        <h1 className="text-3xl font-bold mb-2">Station: Packing</h1>
        <p className="text-sm text-gray-500 mb-6">Outer packing execution with carton verification controls.</p>
        <Button variant="danger">Pack Outer</Button>
      </div>
    </div>
  )
}

export default App
