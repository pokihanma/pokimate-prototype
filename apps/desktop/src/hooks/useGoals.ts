import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Goal, GoalDeposit } from '@pokimate/shared';
import { invokeWithToast } from '@/lib/tauri';
import { useAuthStore } from '@/store/auth';

export function useGoals() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.user_id ?? '';
  return useQuery<Goal[]>({
    queryKey: ['goals', userId],
    queryFn: () => invokeWithToast<Goal[]>('goals_list', { user_id: userId }),
    enabled: Boolean(userId),
    staleTime: 2 * 60 * 1000,
  });
}

export function useGoalDeposits(goalId: string) {
  const user = useAuthStore((s) => s.user);
  const userId = user?.user_id ?? '';
  return useQuery<GoalDeposit[]>({
    queryKey: ['goal_deposits', userId, goalId],
    queryFn: () =>
      invokeWithToast<GoalDeposit[]>('goals_list_deposits', { goal_id: goalId }),
    enabled: Boolean(userId) && Boolean(goalId),
    staleTime: 60 * 1000,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (args: {
      title: string;
      description?: string;
      goal_type?: string;
      target_amount_minor?: number;
      target_value?: number;
      unit_label?: string;
      target_date?: string;
      color?: string;
      icon?: string;
    }) =>
      invokeWithToast<Goal>('goals_create', { user_id: user?.user_id, ...args }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useAddDeposit() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (args: {
      goal_id: string;
      amount_minor: number;
      note?: string;
      deposit_date: string;
    }) =>
      invokeWithToast<GoalDeposit>('goals_add_deposit', {
        user_id: user?.user_id,
        ...args,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['goal_deposits'] });
    },
  });
}

export function useSoftDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invokeWithToast<void>('goals_soft_delete', { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}
