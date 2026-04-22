import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Modal, TextInput, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAccounts, useTransactions, useNetWorth, useAddTransaction, useCategories } from '@/hooks/useFinance';
import { formatINR } from '@pokimate/shared';
import { Card, EmptyState, PrimaryButton, Badge } from '@/components/ui';
import { colors, fontSize, spacing, radius, hexToRgba } from '@/theme';

function todayStr() { return new Date().toISOString().slice(0, 10); }

// ── Add transaction modal ─────────────────────────────────────────────────────
function AddTxnModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const addTxn   = useAddTransaction();
  const accountsQ = useAccounts();
  const categoriesQ = useCategories();

  const [type, setType]     = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [desc, setDesc]     = useState('');
  const [date, setDate]     = useState(todayStr());
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(false);

  const accounts   = accountsQ.data ?? [];
  const categories = (categoriesQ.data ?? []).filter((c) => c.type === type);
  const selAccount = accountId || accounts[0]?.id;

  const handleAdd = async () => {
    const n = parseFloat(amount);
    if (!n || !selAccount) { Alert.alert('Missing fields', 'Enter amount and select account.'); return; }
    setLoading(true);
    try {
      await addTxn.mutateAsync({
        accountId: selAccount,
        categoryId: categoryId || undefined,
        type, amountMinor: Math.round(n * 100),
        description: desc || (type === 'income' ? 'Income' : 'Expense'),
        txnDate: date,
      });
      setAmount(''); setDesc(''); setCategoryId('');
      onClose();
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Transaction</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color={colors.foreground} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          {/* Type toggle */}
          <View style={styles.typeRow}>
            {(['expense', 'income'] as const).map((t) => (
              <Pressable key={t} onPress={() => setType(t)}
                style={[styles.typeBtn, type === t && { backgroundColor: t === 'income' ? colors.success : colors.destructive, borderColor: 'transparent' }]}>
                <Text style={[styles.typeBtnText, type === t && { color: '#fff' }]}>
                  {t === 'income' ? '↑ Income' : '↓ Expense'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Amount (₹)</Text>
          <TextInput style={styles.textInput} placeholder="0.00" placeholderTextColor={colors.mutedFg}
            value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />

          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput style={styles.textInput} placeholder="e.g. Grocery" placeholderTextColor={colors.mutedFg}
            value={desc} onChangeText={setDesc} />

          <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.textInput} value={date} onChangeText={setDate}
            placeholderTextColor={colors.mutedFg} />

          {/* Account selector */}
          <Text style={styles.fieldLabel}>Account</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.xs }}>
              {accounts.map((acc) => (
                <Pressable key={acc.id} onPress={() => setAccountId(acc.id)}
                  style={[styles.chipBtn, (accountId || accounts[0]?.id) === acc.id && styles.chipActive]}>
                  <Text style={[styles.chipText, (accountId || accounts[0]?.id) === acc.id && styles.chipTextActive]}>
                    {acc.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Category selector */}
          <Text style={styles.fieldLabel}>Category (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.xs }}>
              {categories.map((cat) => (
                <Pressable key={cat.id} onPress={() => setCategoryId(cat.id === categoryId ? '' : cat.id)}
                  style={[styles.chipBtn, categoryId === cat.id && { borderColor: cat.color, backgroundColor: hexToRgba(cat.color, 0.15) }]}>
                  <Text style={[styles.chipText, categoryId === cat.id && { color: cat.color }]}>{cat.name}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <PrimaryButton label={loading ? 'Saving…' : 'Add Transaction'} onPress={handleAdd} loading={loading} fullWidth style={{ marginTop: spacing.md }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function FinanceScreen() {
  const accountsQ = useAccounts();
  const txnQ      = useTransactions(30);
  const netWorthQ = useNetWorth();
  const [addOpen, setAddOpen] = useState(false);

  const accounts = accountsQ.data ?? [];
  const txns     = txnQ.data ?? [];
  const netWorth = netWorthQ.data ?? 0;

  const totalIncome  = txns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount_minor, 0);
  const totalExpense = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount_minor, 0);

  const isRefreshing = accountsQ.isFetching || txnQ.isFetching;
  const onRefresh    = () => { accountsQ.refetch(); txnQ.refetch(); netWorthQ.refetch(); };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Finance</Text>
        <Pressable style={styles.addBtn} onPress={() => setAddOpen(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={txns}
        keyExtractor={(t) => t.id}
        showsVerticalScrollIndicator={false}
        onRefresh={onRefresh}
        refreshing={isRefreshing}
        contentContainerStyle={styles.list}
        ListHeaderComponent={() => (
          <View style={{ gap: spacing.md }}>
            {/* Net worth */}
            <Card style={styles.netWorthCard}>
              <Text style={styles.nwLabel}>Net Worth</Text>
              <Text style={styles.nwValue}>{formatINR(BigInt(netWorth))}</Text>
              <View style={styles.nwRow}>
                <View style={styles.nwStat}>
                  <Ionicons name="arrow-up-circle" size={14} color={colors.success} />
                  <Text style={[styles.nwStatText, { color: colors.success }]}>{formatINR(BigInt(totalIncome))}</Text>
                </View>
                <View style={styles.nwStat}>
                  <Ionicons name="arrow-down-circle" size={14} color={colors.destructive} />
                  <Text style={[styles.nwStatText, { color: colors.destructive }]}>{formatINR(BigInt(totalExpense))}</Text>
                </View>
              </View>
            </Card>

            {/* Accounts */}
            <Text style={styles.sectionTitle}>Accounts</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.xs }}>
                {accounts.map((acc) => (
                  <Card key={acc.id} style={styles.accountCard}>
                    <View style={styles.accountIconWrap}>
                      <Ionicons
                        name={acc.account_type === 'credit' ? 'card-outline' : acc.account_type === 'investment' ? 'trending-up-outline' : 'wallet-outline'}
                        size={18} color={colors.primary}
                      />
                    </View>
                    <Text style={styles.accountName} numberOfLines={1}>{acc.name}</Text>
                    <Text style={[styles.accountBal, { color: acc.balance_minor >= 0 ? colors.foreground : colors.destructive }]}>
                      {formatINR(BigInt(acc.balance_minor))}
                    </Text>
                    <Badge label={acc.account_type} variant="muted" />
                  </Card>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.sectionTitle}>Recent Transactions</Text>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="receipt-outline" size={48} color={colors.mutedFg} />}
            title="No transactions yet"
            description="Start tracking your income and expenses."
            action={<PrimaryButton label="Add transaction" onPress={() => setAddOpen(true)} />}
          />
        }
        renderItem={({ item: txn }) => (
          <Card style={styles.txnCard}>
            <View style={[styles.txnIcon, { backgroundColor: hexToRgba(txn.category_color ?? colors.primary, 0.15) }]}>
              <Ionicons
                name={txn.type === 'income' ? 'arrow-up' : 'arrow-down'}
                size={16}
                color={txn.type === 'income' ? colors.success : colors.destructive}
              />
            </View>
            <View style={styles.txnInfo}>
              <Text style={styles.txnDesc} numberOfLines={1}>{txn.description ?? 'Transaction'}</Text>
              <Text style={styles.txnMeta}>{txn.category_name ?? 'Uncategorized'} · {txn.txn_date}</Text>
            </View>
            <Text style={[styles.txnAmount, { color: txn.type === 'income' ? colors.success : colors.destructive }]}>
              {txn.type === 'income' ? '+' : '-'}{formatINR(BigInt(txn.amount_minor))}
            </Text>
          </Card>
        )}
      />

      <AddTxnModal visible={addOpen} onClose={() => setAddOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  screenTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.foreground },
  addBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing['3xl'] },
  sectionTitle:{ fontSize: fontSize.base, fontWeight: '600', color: colors.foreground },

  netWorthCard: { padding: spacing.xl },
  nwLabel:     { fontSize: fontSize.xs, color: colors.mutedFg, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '600' },
  nwValue:     { fontSize: 30, fontWeight: '800', color: colors.foreground, marginTop: 4 },
  nwRow:       { flexDirection: 'row', gap: spacing.xl, marginTop: 8 },
  nwStat:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nwStatText:  { fontSize: fontSize.sm, fontWeight: '600' },

  accountCard:    { padding: spacing.md, width: 148, gap: spacing.sm },
  accountIconWrap:{ width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  accountName:    { fontSize: fontSize.sm, fontWeight: '600', color: colors.foreground },
  accountBal:     { fontSize: fontSize.base, fontWeight: '700' },

  txnCard:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  txnIcon:    { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txnInfo:    { flex: 1 },
  txnDesc:    { fontSize: fontSize.sm, fontWeight: '500', color: colors.foreground },
  txnMeta:    { fontSize: fontSize.xs, color: colors.mutedFg, marginTop: 2 },
  txnAmount:  { fontSize: fontSize.sm, fontWeight: '700' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle:     { fontSize: fontSize.lg, fontWeight: '700', color: colors.foreground },
  modalContent:   { padding: spacing.xl, gap: spacing.md },
  fieldLabel:     { fontSize: fontSize.sm, fontWeight: '500', color: colors.foreground },
  textInput:      { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 12, color: colors.foreground, fontSize: fontSize.base },
  typeRow:        { flexDirection: 'row', gap: spacing.sm },
  typeBtn:        { flex: 1, paddingVertical: 10, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  typeBtnText:    { fontSize: fontSize.sm, fontWeight: '600', color: colors.mutedFg },
  chipBtn:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipActive:     { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  chipText:       { fontSize: fontSize.sm, color: colors.mutedFg, fontWeight: '500' },
  chipTextActive: { color: colors.primary },
});
