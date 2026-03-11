import { useQuery } from '@tanstack/react-query';
import type { FinanceAccount } from '@pokimate/shared';
import { invokeWithToast } from '@/lib/tauri';
import { useAuthStore } from '@/store/auth';

export function useFinanceAccounts() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.user_id ?? '';
  return useQuery<FinanceAccount[]>({
    queryKey: ['finance_accounts', userId],
    queryFn: () => invokeWithToast<FinanceAccount[]>('finance_list_accounts', { user_id: userId }),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });
}
