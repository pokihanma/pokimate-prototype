import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDb, newId, nowIso } from '@/db';
import { useAuthStore } from '@/store/auth';

export interface Account {
  id: string; user_id: string; name: string; account_type: string;
  balance_minor: number; currency: string; is_primary: number; is_active: number;
}

export interface Transaction {
  id: string; user_id: string; account_id: string; category_id: string | null;
  type: string; amount_minor: number; description: string | null;
  txn_date: string; notes: string | null; created_at: string;
  category_name?: string; category_color?: string;
}

export interface Category {
  id: string; user_id: string | null; name: string; type: string; color: string; icon: string | null;
}

// ── Accounts ──────────────────────────────────────────────────────────────────
export function useAccounts() {
  const userId = useAuthStore((s) => s.user?.user_id ?? '');
  return useQuery({
    queryKey: ['accounts', userId],
    queryFn: async () => {
      const db = await getDb();
      return db.getAllAsync<Account>(
        'SELECT * FROM finance_accounts WHERE user_id = ? AND deleted_at IS NULL AND is_active = 1 ORDER BY is_primary DESC, name',
        [userId]
      );
    },
    enabled: !!userId,
  });
}

// ── Transactions (most recent 50) ─────────────────────────────────────────────
export function useTransactions(limit = 50) {
  const userId = useAuthStore((s) => s.user?.user_id ?? '');
  return useQuery({
    queryKey: ['transactions', userId, limit],
    queryFn: async () => {
      const db = await getDb();
      return db.getAllAsync<Transaction>(
        `SELECT t.*, c.name AS category_name, c.color AS category_color
         FROM finance_transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.user_id = ? AND t.deleted_at IS NULL
         ORDER BY t.txn_date DESC, t.created_at DESC
         LIMIT ?`,
        [userId, limit]
      );
    },
    enabled: !!userId,
  });
}

// ── Categories ────────────────────────────────────────────────────────────────
export function useCategories(type?: 'income' | 'expense') {
  const userId = useAuthStore((s) => s.user?.user_id ?? '');
  return useQuery({
    queryKey: ['categories', userId, type],
    queryFn: async () => {
      const db = await getDb();
      const sql = type
        ? `SELECT * FROM categories WHERE (user_id IS NULL OR user_id = ?) AND type = ? AND deleted_at IS NULL ORDER BY sort_order, name`
        : `SELECT * FROM categories WHERE (user_id IS NULL OR user_id = ?) AND deleted_at IS NULL ORDER BY type, sort_order, name`;
      return db.getAllAsync<Category>(sql, type ? [userId, type] : [userId]);
    },
    enabled: !!userId,
  });
}

// ── Add transaction ───────────────────────────────────────────────────────────
export function useAddTransaction() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.user_id ?? '');
  return useMutation({
    mutationFn: async (input: {
      accountId: string; categoryId?: string; type: 'income' | 'expense' | 'transfer';
      amountMinor: number; description: string; txnDate: string; notes?: string;
    }) => {
      const db = await getDb();
      const id = newId('txn');
      const now = nowIso();
      await db.runAsync(
        `INSERT INTO finance_transactions (id, user_id, account_id, category_id, type, amount_minor, description, txn_date, notes, created_at, updated_at, deleted_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,NULL)`,
        [id, userId, input.accountId, input.categoryId ?? null, input.type,
          input.amountMinor, input.description, input.txnDate, input.notes ?? null, now, now]
      );
      // Update account balance
      const delta = input.type === 'income' ? input.amountMinor : -input.amountMinor;
      await db.runAsync(
        'UPDATE finance_accounts SET balance_minor = balance_minor + ?, updated_at = ? WHERE id = ?',
        [delta, now, input.accountId]
      );
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// ── Net worth ─────────────────────────────────────────────────────────────────
export function useNetWorth() {
  const userId = useAuthStore((s) => s.user?.user_id ?? '');
  return useQuery({
    queryKey: ['net-worth', userId],
    queryFn: async () => {
      const db = await getDb();
      const result = await db.getFirstAsync<{ total: number }>(
        'SELECT COALESCE(SUM(balance_minor), 0) AS total FROM finance_accounts WHERE user_id = ? AND deleted_at IS NULL AND is_active = 1',
        [userId]
      );
      return result?.total ?? 0;
    },
    enabled: !!userId,
  });
}
