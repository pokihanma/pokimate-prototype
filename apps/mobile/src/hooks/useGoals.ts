import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDb, newId, nowIso } from '@/db';
import { useAuthStore } from '@/store/auth';

export interface Goal {
  id: string; user_id: string; title: string; description: string | null;
  goal_type: string; target_amount_minor: number | null;
  current_amount_minor: number; target_value: number | null;
  current_value: number; unit_label: string | null;
  target_date: string | null; color: string; icon: string;
  is_active: number; reward_title: string | null; reward_emoji: string | null;
  reminder_date: string | null; reminder_time: string | null;
  created_at: string; updated_at: string;
}

export interface GoalDeposit {
  id: string; goal_id: string; user_id: string;
  amount_minor: number; note: string | null; created_at: string;
}

export function useGoals() {
  const userId = useAuthStore((s) => s.user?.user_id ?? '');
  return useQuery({
    queryKey: ['goals', userId],
    queryFn: async () => {
      const db = await getDb();
      return db.getAllAsync<Goal>(
        `SELECT * FROM goals WHERE user_id = ? AND deleted_at IS NULL ORDER BY target_date, title`,
        [userId]
      );
    },
    enabled: !!userId,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.user_id ?? '');
  return useMutation({
    mutationFn: async (input: {
      title: string; goal_type: string; color: string; icon: string;
      description?: string; target_amount_minor?: number;
      target_value?: number; unit_label?: string; target_date?: string;
      reward_title?: string; reward_emoji?: string;
      reminder_date?: string; reminder_time?: string;
    }) => {
      const db = await getDb();
      const id = newId('gol');
      const now = nowIso();
      await db.runAsync(
        `INSERT INTO goals (id, user_id, title, description, goal_type,
          target_amount_minor, current_amount_minor, target_value, current_value,
          unit_label, target_date, color, icon, is_active,
          reward_title, reward_emoji, reminder_date, reminder_time,
          created_at, updated_at, deleted_at)
         VALUES (?,?,?,?,?,?,0,?,0,?,?,?,?,1,?,?,?,?,?,?,NULL)`,
        [
          id, userId, input.title, input.description ?? null, input.goal_type,
          input.target_amount_minor ?? null, input.target_value ?? null,
          input.unit_label ?? null, input.target_date ?? null,
          input.color, input.icon,
          input.reward_title ?? null, input.reward_emoji ?? null,
          input.reminder_date ?? null, input.reminder_time ?? '09:00',
          now, now,
        ]
      );
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useAddDeposit() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.user_id ?? '');
  return useMutation({
    mutationFn: async ({ goalId, amountMinor, note }: {
      goalId: string; amountMinor: number; note?: string;
    }) => {
      const db = await getDb();
      const id = newId('dep');
      const now = nowIso();
      await db.runAsync(
        'INSERT INTO goal_deposits (id, goal_id, user_id, amount_minor, note, created_at) VALUES (?,?,?,?,?,?)',
        [id, goalId, userId, amountMinor, note ?? null, now]
      );
      await db.runAsync(
        'UPDATE goals SET current_amount_minor = current_amount_minor + ?, updated_at = ? WHERE id = ?',
        [amountMinor, now, goalId]
      );
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useUpdateGoalProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ goalId, currentValue }: { goalId: string; currentValue: number }) => {
      const db = await getDb();
      await db.runAsync(
        'UPDATE goals SET current_value = ?, updated_at = ? WHERE id = ?',
        [currentValue, nowIso(), goalId]
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const db = await getDb();
      const now = nowIso();
      await db.runAsync(
        'UPDATE goals SET deleted_at = ?, updated_at = ? WHERE id = ?',
        [now, now, id]
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}
