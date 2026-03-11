import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Subscription } from '@pokimate/shared';
import { invokeWithToast } from '@/lib/tauri';
import { useAuthStore } from '@/store/auth';

export function useSubscriptions() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.user_id ?? '';
  return useQuery<Subscription[]>({
    queryKey: ['subscriptions', userId],
    queryFn: () => invokeWithToast<Subscription[]>('finance_list_subscriptions', { user_id: userId }),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (args: {
      name: string;
      amount_minor: number;
      billing_cycle: string;
      next_renewal_date: string;
      category?: string | null;
      notes?: string | null;
    }) =>
      invokeWithToast<Subscription>('finance_create_subscription', { user_id: user?.user_id, ...args }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      id: string;
      name: string;
      amount_minor: number;
      billing_cycle: string;
      next_renewal_date: string;
      reminder_days_before: number;
    }) => invokeWithToast<void>('finance_update_subscription', args),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invokeWithToast<void>('finance_soft_delete_subscription', { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });
}
