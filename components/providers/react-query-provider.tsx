'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useState } from 'react';
import { toast } from 'sonner';

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Time before inactive queries are garbage collected (in milliseconds)
            gcTime: 1000 * 60 * 5, // 5 minutes
            // Time before stale data is refetched (in milliseconds)
            staleTime: 1000 * 60, // 1 minute
            // Custom retry logic - retry up to 3 times for non-404 errors
            retry: (failureCount, error: any) => {
              if (error?.response?.status === 404) return false;
              return failureCount < 3;
            },
            // ✅ Allow refetch on mount for fresh data
            refetchOnMount: true,
            // ✅ Allow refetch on window focus (but not too aggressive)
            refetchOnWindowFocus: 'always',
            // ✅ Allow refetch on reconnect
            refetchOnReconnect: true,
          },
          mutations: {
            onError: (error: any) => {
              // Handle global mutation errors
              toast.error(error?.message || 'An error occurred');
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
