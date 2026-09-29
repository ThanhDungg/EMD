import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/shared/api';
import { BecaProvider } from './BecaProvider';

// app/providers — global providers: theme beca-ui + locale vi + react-query
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BecaProvider language="vi">{children}</BecaProvider>
    </QueryClientProvider>
  );
}
