import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TimeEntry } from '@pokimate/shared';
import { invokeWithToast } from '@/lib/tauri';
import { useAuthStore } from '@/store/auth';

export function useTimeEntries(fromDate?: string, toDate?: string) {
  const user = useAuthStore((s) => s.user);
  const userId = user?.user_id ?? '';
  return useQuery<TimeEntry[]>({
    queryKey: ['time_entries', userId, fromDate, toDate],
    queryFn: () =>
      invokeWithToast<TimeEntry[]>('time_list_entries', {
        user_id: userId,
        from_date: fromDate,
        to_date: toDate,
      }),
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
    refetchInterval: 10 * 1000,
  });
}

export function useCreateEntry() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (args: {
      title: string;
      category?: string;
      start_time?: string;
      end_time?: string;
    }) =>
      invokeWithToast<TimeEntry>('time_create_entry', {
        user_id: user?.user_id,
        ...args,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_entries'] }),
  });
}

export function useStopEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      invokeWithToast<TimeEntry>('time_stop_entry', { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_entries'] }),
  });
}

export function useSoftDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      invokeWithToast<void>('time_soft_delete_entry', { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_entries'] }),
  });
}
