'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import dynamic from 'next/dynamic';

// Lazy load DevTools only in development
const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then(mod => ({ default: mod.ReactQueryDevtools })),
  { ssr: false }
);

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
            // Custom retry logic - retry up to 2 times for non-404 errors (reduced from 3)
            retry: (failureCount, error: any) => {
              if (error?.response?.status === 404) return false;
              return failureCount < 2;
            },
            // Reduce refetch frequency for better performance
            refetchOnMount: true,
            refetchOnWindowFocus: false, // Changed from 'always' to false to reduce unnecessary refetches
            refetchOnReconnect: true,
          },
          mutations: {
            onError: (error: any) => {
              // Lazy load toast to avoid blocking
              import('sonner').then(({ toast }) => {
                toast.error(error?.message || 'An error occurred');
              });
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NEXT_PUBLIC_NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
