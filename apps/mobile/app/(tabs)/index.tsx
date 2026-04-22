import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { useAccounts, useTransactions, useNetWorth } from '@/hooks/useFinance';
import { useHabits, useCheckins } from '@/hooks/useHabits';
import { useGoals } from '@/hooks/useGoals';
import { KpiCard, Card, Badge, ProgressBar } from '@/components/ui';
import { colors, fontSize, spacing, radius, hexToRgba } from '@/theme';
import { formatINR } from '@pokimate/shared';

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function DashboardScreen() {
  const user         = useAuthStore((s) => s.user);
  const today        = todayStr();

  const accountsQ    = useAccounts();
  const netWorthQ    = useNetWorth();
  const txnQ         = useTransactions(5);
  const habitsQ      = useHabits();
  const checkinsQ    = useCheckins(today, today);
  const goalsQ       = useGoals();

  const isRefreshing = [accountsQ, netWorthQ, txnQ, habitsQ, checkinsQ, goalsQ].some((q) => q.isFetching);

  const onRefresh = () => {
    accountsQ.refetch(); netWorthQ.refetch(); txnQ.refetch();
    habitsQ.refetch(); checkinsQ.refetch(); goalsQ.refetch();
  };

  const habits      = habitsQ.data ?? [];
  const checkins    = checkinsQ.data ?? [];
  const goals       = (goalsQ.data ?? []).filter((g) => g.is_active);
  const txns        = txnQ.data ?? [];
  const netWorth    = netWorthQ.data ?? 0;

  const doneToday   = checkins.filter((c) => c.status === 'done').length;
  const activeGoals = goals.filter((g) => {
    if (g.goal_type === 'money') return (g.current_amount_minor ?? 0) < (g.target_amount_minor ?? 1);
    return (g.current_value ?? 0) < (g.target_value ?? 1);
  }).length;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{user?.display_name ?? user?.username} 👋</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.display_name ?? user?.username ?? 'U').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Net worth */}
        <Card style={styles.netWorthCard}>
          <Text style={styles.netWorthLabel}>Net Worth</Text>
          <Text style={styles.netWorthValue}>{formatINR(BigInt(netWorth))}</Text>
          <View style={styles.netWorthRow}>
            <Ionicons name="trending-up" size={14} color={colors.success} />
            <Text style={styles.netWorthSub}> Across {accountsQ.data?.length ?? 0} accounts</Text>
          </View>
        </Card>

        {/* KPI row */}
        <View style={styles.kpiRow}>
          <KpiCard
            label="Habits Today"
            value={`${doneToday}/${habits.length}`}
            sub="completed"
            accent={doneToday === habits.length && habits.length > 0 ? colors.success : undefined}
            icon={<Ionicons name="checkbox" size={16} color={colors.primary} />}
          />
          <KpiCard
            label="Active Goals"
            value={String(activeGoals)}
            sub="in progress"
            icon={<Ionicons name="trophy" size={16} color={colors.warning} />}
          />
        </View>

        {/* Today's habits */}
        {habits.length > 0 && (
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Habits</Text>
              <Badge
                label={`${doneToday}/${habits.length}`}
                variant={doneToday === habits.length ? 'success' : 'muted'}
              />
            </View>
            <ProgressBar progress={habits.length > 0 ? doneToday / habits.length : 0} />
            <View style={styles.habitList}>
              {habits.slice(0, 4).map((habit) => {
                const done = checkins.some((c) => c.habit_id === habit.id && c.status === 'done');
                return (
                  <View key={habit.id} style={styles.habitRow}>
                    <View style={[styles.habitDot, { backgroundColor: hexToRgba(habit.color, 0.2) }]}>
                      <Ionicons
                        name={done ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={done ? habit.color : colors.mutedFg}
                      />
                    </View>
                    <Text style={[styles.habitName, done && { color: colors.mutedFg, textDecorationLine: 'line-through' }]}>
                      {habit.name}
                    </Text>
                    {done && <Ionicons name="checkmark" size={14} color={colors.success} />}
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {/* Recent transactions */}
        {txns.length > 0 && (
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
            </View>
            {txns.map((txn) => (
              <View key={txn.id} style={styles.txnRow}>
                <View style={[styles.txnIcon, { backgroundColor: hexToRgba(txn.category_color ?? colors.primary, 0.15) }]}>
                  <Ionicons name="receipt-outline" size={16} color={txn.category_color ?? colors.primary} />
                </View>
                <View style={styles.txnInfo}>
                  <Text style={styles.txnDesc} numberOfLines={1}>{txn.description ?? 'Transaction'}</Text>
                  <Text style={styles.txnDate}>{txn.txn_date}</Text>
                </View>
                <Text style={[styles.txnAmount, { color: txn.type === 'income' ? colors.success : colors.destructive }]}>
                  {txn.type === 'income' ? '+' : '-'}{formatINR(BigInt(txn.amount_minor))}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Goals progress */}
        {goals.length > 0 && (
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Goals</Text>
            </View>
            {goals.slice(0, 3).map((goal) => {
              const progress = goal.goal_type === 'money'
                ? (goal.current_amount_minor ?? 0) / Math.max(goal.target_amount_minor ?? 1, 1)
                : (goal.current_value ?? 0) / Math.max(goal.target_value ?? 1, 1);
              return (
                <View key={goal.id} style={styles.goalRow}>
                  <View style={[styles.goalDot, { backgroundColor: hexToRgba(goal.color, 0.2) }]}>
                    <Ionicons name="flag-outline" size={14} color={goal.color} />
                  </View>
                  <View style={styles.goalInfo}>
                    <View style={styles.goalTitleRow}>
                      <Text style={styles.goalName} numberOfLines={1}>{goal.title}</Text>
                      <Text style={styles.goalPct}>{Math.round(progress * 100)}%</Text>
                    </View>
                    <ProgressBar progress={progress} color={goal.color} height={4} />
                  </View>
                </View>
              );
            })}
          </Card>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  scroll:  { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing['3xl'] },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  greeting:    { fontSize: fontSize.sm, color: colors.mutedFg },
  name:        { fontSize: fontSize.xl, fontWeight: '700', color: colors.foreground },
  avatar:      { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { color: '#fff', fontWeight: '700', fontSize: fontSize.base },

  netWorthCard:  { padding: spacing.xl },
  netWorthLabel: { fontSize: fontSize.xs, color: colors.mutedFg, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '600' },
  netWorthValue: { fontSize: 34, fontWeight: '800', color: colors.foreground, marginTop: 4, letterSpacing: -0.5 },
  netWorthRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  netWorthSub:   { fontSize: fontSize.xs, color: colors.mutedFg },

  kpiRow: { flexDirection: 'row', gap: spacing.md },

  section:       { padding: spacing.lg, gap: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle:  { fontSize: fontSize.base, fontWeight: '600', color: colors.foreground },

  habitList: { gap: 10, marginTop: 4 },
  habitRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  habitDot:  { width: 30, height: 30, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  habitName: { flex: 1, fontSize: fontSize.sm, color: colors.foreground },

  txnRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  txnIcon:   { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  txnInfo:   { flex: 1 },
  txnDesc:   { fontSize: fontSize.sm, fontWeight: '500', color: colors.foreground },
  txnDate:   { fontSize: fontSize.xs, color: colors.mutedFg, marginTop: 1 },
  txnAmount: { fontSize: fontSize.sm, fontWeight: '600' },

  goalRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  goalDot:      { width: 30, height: 30, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  goalInfo:     { flex: 1, gap: 5 },
  goalTitleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  goalName:     { fontSize: fontSize.sm, fontWeight: '500', color: colors.foreground, flex: 1 },
  goalPct:      { fontSize: fontSize.xs, color: colors.mutedFg },
});
