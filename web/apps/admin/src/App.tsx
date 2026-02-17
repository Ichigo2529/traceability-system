import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { OfflineQueueProvider } from "@traceability/offline-queue";
import { Toaster } from "sonner";
import { ThemeProvider } from "@ui5/webcomponents-react";
import "./icons"; // Import icon registry
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
            <ThemeProvider>
              <Toaster position="top-center" richColors closeButton duration={4200} />
              <EdenFallbackDebugPanel />
              <AppRoutes />
            </ThemeProvider>
          </BrowserRouter>
        </OfflineQueueProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
