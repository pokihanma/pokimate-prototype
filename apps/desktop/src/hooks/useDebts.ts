import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Debt } from '@pokimate/shared';
import { invokeWithToast } from '@/lib/tauri';
import { useAuthStore } from '@/store/auth';

export function useDebts() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.user_id ?? '';
  return useQuery<Debt[]>({
    queryKey: ['debts', userId],
    queryFn: () => invokeWithToast<Debt[]>('finance_list_debts', { user_id: userId }),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateDebt() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (args: {
      name: string;
      debt_type: string;
      principal_minor: number;
      current_balance_minor: number;
      interest_rate_bp?: number;
      min_payment_minor?: number;
      due_day?: number | null;
      start_date?: string | null;
    }) => invokeWithToast<Debt>('finance_create_debt', { user_id: user?.user_id, ...args }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  });
}

export function useUpdateDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      id: string;
      name: string;
      current_balance_minor: number;
      interest_rate_bp: number;
      min_payment_minor: number;
    }) => invokeWithToast<void>('finance_update_debt', args),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  });
}

export function useDeleteDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invokeWithToast<void>('finance_soft_delete_debt', { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  });
}
