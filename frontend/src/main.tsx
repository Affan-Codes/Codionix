import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./context/AuthContext.tsx";
import { RouterProvider } from "react-router";
import { router } from "./router.tsx";
import "./index.css";
import { Toaster } from "./components/ui/sonner.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import { NetworkStatus } from "./components/NetworkStatus.tsx";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./utils/queryClient.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NetworkStatus />
          <RouterProvider router={router} />
          <Toaster />
        </AuthProvider>

        {/* React Query Devtools - ONLY shows in development */}
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
