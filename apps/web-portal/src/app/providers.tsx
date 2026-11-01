"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { LoginModal } from "@/components/auth/LoginModal";

export interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Ensure a single stable QueryClient instance per client session
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute fresh time
            gcTime: 5 * 60 * 1000, // 5 minutes cache retention
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <LoginModal />
      {/* Global Persian RTL Sonner Notification Center */}
      <Toaster
        richColors
        position="top-center"
        dir="rtl"
        closeButton
        duration={4000}
      />
    </QueryClientProvider>
  );
}

export default Providers;
