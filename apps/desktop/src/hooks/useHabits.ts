import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Habit, HabitCheckin } from '@pokimate/shared';
import { invokeWithToast } from '@/lib/tauri';
import { useAuthStore } from '@/store/auth';

export function useHabits() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.user_id ?? '';
  return useQuery<Habit[]>({
    queryKey: ['habits', userId],
    queryFn: () => invokeWithToast<Habit[]>('habits_list', { user_id: userId }),
    enabled: Boolean(userId),
    staleTime: 2 * 60 * 1000,
  });
}

export function useHabitCheckins(habitId: string, fromDate: string, toDate: string) {
  const user = useAuthStore((s) => s.user);
  const userId = user?.user_id ?? '';
  return useQuery<HabitCheckin[]>({
    queryKey: ['habit_checkins', userId, habitId, fromDate, toDate],
    queryFn: () =>
      invokeWithToast<HabitCheckin[]>('habits_list_checkins', {
        habit_id: habitId,
        from_date: fromDate,
        to_date: toDate,
      }),
    enabled: Boolean(userId) && Boolean(habitId),
    staleTime: 60 * 1000,
  });
}

export function useAllHabitCheckins(fromDate: string, toDate: string) {
  const user = useAuthStore((s) => s.user);
  const userId = user?.user_id ?? '';
  return useQuery<HabitCheckin[]>({
    queryKey: ['habit_checkins_all', userId, fromDate, toDate],
    queryFn: () =>
      invokeWithToast<HabitCheckin[]>('habits_list_checkins', {
        habit_id: '',
        from_date: fromDate,
        to_date: toDate,
        user_id: userId,
      }),
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
  });
}

export function useCreateHabit() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (args: {
      name: string;
      description?: string;
      frequency?: string;
      target_days?: string;
      color?: string;
      icon?: string;
      reminder_time?: string;
    }) =>
      invokeWithToast<Habit>('habits_create', { user_id: user?.user_id, ...args }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  });
}

export function useUpsertCheckin() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (args: {
      habit_id: string;
      checkin_date: string;
      status: 'done' | 'skip' | 'missed';
      note?: string;
    }) =>
      invokeWithToast<HabitCheckin>('habits_upsert_checkin', {
        user_id: user?.user_id,
        ...args,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habit_checkins'] });
      qc.invalidateQueries({ queryKey: ['habit_checkins_all'] });
    },
  });
}

export function useSoftDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invokeWithToast<void>('habits_soft_delete', { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  });
}
