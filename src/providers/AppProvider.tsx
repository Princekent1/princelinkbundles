"use client"

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "@/stores/auth";

const queryClient = new QueryClient();

function AuthHydrator() {
  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);
  return null;
}

const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthHydrator />
      {children}
      <Toaster />
    </QueryClientProvider>
  );
};

export default AppProvider;
