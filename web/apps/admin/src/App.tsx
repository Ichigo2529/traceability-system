import { QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";
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
          <HashRouter
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
              closeButton={false}
              duration={5000}
              toastOptions={{
                style: { fontFamily: "Inter, sans-serif" },
              }}
            />
          </HashRouter>
        </OfflineQueueProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
