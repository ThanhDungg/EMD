import { QueryClient } from '@tanstack/react-query';

// QueryClient dùng chung toàn app: không refetch khi focus lại tab
// (tránh bảng số liệu nhảy bất ngờ), thử lại tối đa 1 lần khi lỗi mạng.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});
