import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Budget } from '@pokimate/shared';
import { invokeWithToast } from '@/lib/tauri';
import { useAuthStore } from '@/store/auth';

export function useBudgets() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.user_id ?? '';
  return useQuery<Budget[]>({
    queryKey: ['budgets', userId],
    queryFn: () => invokeWithToast<Budget[]>('finance_list_budgets', { user_id: userId }),
    enabled: Boolean(userId),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (args: { category_id: string; limit_minor: number; period?: string }) =>
      invokeWithToast<Budget>('finance_create_budget', { user_id: user?.user_id, ...args }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; limit_minor: number; alert_threshold_pct: number }) =>
      invokeWithToast<void>('finance_update_budget', args),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invokeWithToast<void>('finance_soft_delete_budget', { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}
