import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export function useCreateAccount() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (args: {
      name: string;
      account_type: string;
      opening_balance_minor?: number;
    }) =>
      invokeWithToast<FinanceAccount>('finance_create_account', {
        user_id: user?.user_id,
        ...args,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance_accounts'] }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      invokeWithToast<void>('finance_soft_delete_account', { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance_accounts'] }),
  });
}
