import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { OfflineQueueProvider } from "@traceability/offline-queue";
import { AuthProvider, sdk } from "./context/AuthContext";
import { AppRoutes } from "./app/AppRoutes";
import { queryClient } from "./app/queryClient";
import { EdenFallbackDebugPanel } from "./components/debug/EdenFallbackDebugPanel";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OfflineQueueProvider client={sdk}>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <EdenFallbackDebugPanel />
            <AppRoutes />
            <Toaster
              position="top-center"
              richColors
              closeButton
              duration={5000}
              toastOptions={{
                style: { fontFamily: "Inter, sans-serif" },
              }}
            />
          </BrowserRouter>
        </OfflineQueueProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
