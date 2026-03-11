import { useQuery } from '@tanstack/react-query';
import type { DashboardSummary } from '@pokimate/shared';
import { invokeWithToast } from '@/lib/tauri';
import { useAuthStore } from '@/store/auth';

export function useDashboard(month: string) {
  const user = useAuthStore((s) => s.user);
  const userId = user?.user_id ?? '';

  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', userId, month],
    queryFn: () =>
      invokeWithToast<DashboardSummary>('get_dashboard_summary', {
        user_id: userId,
        month,
      }),
    enabled: Boolean(userId) && Boolean(month),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
