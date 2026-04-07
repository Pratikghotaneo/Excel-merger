"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const client = new QueryClient();

export default function Providers({ children }: any) {
  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}