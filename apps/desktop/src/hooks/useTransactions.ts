import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FinanceTransaction } from '@pokimate/shared';
import { invokeWithToast } from '@/lib/tauri';
import { useAuthStore } from '@/store/auth';

export interface TransactionFilters {
  account_id?: string;
  from_date?: string;
  to_date?: string;
}

export function useTransactions(filters: TransactionFilters = {}) {
  const user = useAuthStore((s) => s.user);
  const userId = user?.user_id ?? '';
  return useQuery<FinanceTransaction[]>({
    queryKey: ['transactions', userId, filters],
    queryFn: () =>
      invokeWithToast<FinanceTransaction[]>('finance_list_transactions', {
        user_id: userId,
        account_id: filters.account_id ?? null,
        from_date: filters.from_date ?? null,
        to_date: filters.to_date ?? null,
      }),
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (args: {
      account_id: string;
      category_id: string | null;
      type_: string;
      amount_minor: number;
      merchant: string | null;
      note: string | null;
      txn_date: string;
    }) =>
      invokeWithToast<FinanceTransaction>('finance_create_transaction', {
        user_id: user?.user_id,
        ...args,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      id: string;
      category_id?: string | null;
      merchant?: string | null;
      note?: string | null;
      txn_date?: string;
    }) => invokeWithToast<void>('finance_update_transaction', args),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      invokeWithToast<void>('finance_soft_delete_transaction', { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}
