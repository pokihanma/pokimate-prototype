import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDb, newId, nowIso } from '@/db';
import { useAuthStore } from '@/store/auth';

export interface Habit {
  id: string; user_id: string; name: string;
  frequency: string; target_days: string;
  color: string; icon: string;
  reminder_time: string | null; reminder_enabled: number;
  is_active: number; created_at: string; updated_at: string;
}

export interface HabitCheckin {
  id: string; habit_id: string; user_id: string;
  checkin_date: string; status: string;
  note: string | null; created_at: string;
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

// ── List habits ───────────────────────────────────────────────────────────────
export function useHabits() {
  const userId = useAuthStore((s) => s.user?.user_id ?? '');
  return useQuery({
    queryKey: ['habits', userId],
    queryFn: async () => {
      const db = await getDb();
      return db.getAllAsync<Habit>(
        'SELECT * FROM habits WHERE user_id = ? AND deleted_at IS NULL ORDER BY name',
        [userId]
      );
    },
    enabled: !!userId,
  });
}

// ── List checkins for a date range ───────────────────────────────────────────
export function useCheckins(from: string, to: string) {
  const userId = useAuthStore((s) => s.user?.user_id ?? '');
  return useQuery({
    queryKey: ['checkins', userId, from, to],
    queryFn: async () => {
      const db = await getDb();
      return db.getAllAsync<HabitCheckin>(
        `SELECT * FROM habit_checkins
         WHERE user_id = ? AND checkin_date >= ? AND checkin_date <= ?
         ORDER BY checkin_date DESC`,
        [userId, from, to]
      );
    },
    enabled: !!userId,
  });
}

// ── Upsert checkin ────────────────────────────────────────────────────────────
export function useUpsertCheckin() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.user_id ?? '');
  return useMutation({
    mutationFn: async ({ habitId, status, date = todayStr() }: {
      habitId: string; status: 'done' | 'missed' | 'skip'; date?: string;
    }) => {
      const db = await getDb();
      const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM habit_checkins WHERE habit_id = ? AND checkin_date = ?',
        [habitId, date]
      );
      if (existing) {
        await db.runAsync(
          'UPDATE habit_checkins SET status = ? WHERE id = ?',
          [status, existing.id]
        );
        return existing.id;
      } else {
        const id = newId('chk');
        await db.runAsync(
          'INSERT INTO habit_checkins (id, habit_id, user_id, checkin_date, status, note, created_at) VALUES (?,?,?,?,?,NULL,?)',
          [id, habitId, userId, date, status, nowIso()]
        );
        return id;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkins'] });
    },
  });
}

// ── Create habit ──────────────────────────────────────────────────────────────
export function useCreateHabit() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.user_id ?? '');
  return useMutation({
    mutationFn: async (input: {
      name: string; color: string; icon: string;
      frequency?: string; target_days?: string;
      reminder_time?: string; reminder_enabled?: number;
    }) => {
      const db = await getDb();
      const id = newId('hab');
      const now = nowIso();
      await db.runAsync(
        `INSERT INTO habits (id, user_id, name, frequency, target_days, color, icon,
          reminder_time, reminder_enabled, is_active, created_at, updated_at, deleted_at)
         VALUES (?,?,?,?,?,?,?,?,?,1,?,?,NULL)`,
        [
          id, userId, input.name,
          input.frequency ?? 'daily',
          input.target_days ?? '[0,1,2,3,4,5,6]',
          input.color, input.icon,
          input.reminder_time ?? null,
          input.reminder_enabled ?? 0,
          now, now,
        ]
      );
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  });
}

// ── Delete habit ──────────────────────────────────────────────────────────────
export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const db = await getDb();
      const now = nowIso();
      await db.runAsync(
        'UPDATE habits SET deleted_at = ?, updated_at = ? WHERE id = ?',
        [now, now, id]
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  });
}
