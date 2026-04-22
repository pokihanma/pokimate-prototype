import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Modal, ScrollView, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGoals, useCreateGoal, useAddDeposit, useDeleteGoal, type Goal } from '@/hooks/useGoals';
import { scheduleGoalReminder } from '@/notifications/reminders';
import { formatINR } from '@pokimate/shared';
import { Card, EmptyState, ProgressBar, PrimaryButton, Badge } from '@/components/ui';
import { colors, fontSize, spacing, radius, hexToRgba, presetColors } from '@/theme';

const REWARD_EMOJIS = ['🎁','👟','🚴','📱','👜','🎮','✈️','🏆','🍕','🎬','📚','💎','🛵','⌚','🎸','🎧'];

function paise(n: number) { return Math.round(n * 100); }

// ── Goal card ─────────────────────────────────────────────────────────────────
function GoalCard({ goal, onDeposit, onDelete }: {
  goal: Goal; onDeposit: () => void; onDelete: () => void;
}) {
  const isMoney    = goal.goal_type === 'money';
  const current    = isMoney ? (goal.current_amount_minor ?? 0) : (goal.current_value ?? 0);
  const target     = isMoney ? (goal.target_amount_minor ?? 1) : (goal.target_value ?? 1);
  const progress   = Math.min(current / Math.max(target, 1), 1);
  const isComplete = progress >= 1;

  return (
    <Card style={styles.goalCard}>
      {/* Top row */}
      <View style={styles.goalTop}>
        <View style={[styles.goalIcon, { backgroundColor: hexToRgba(goal.color, 0.18) }]}>
          <Ionicons name="flag-outline" size={20} color={goal.color} />
        </View>
        <View style={styles.goalMeta}>
          <Text style={styles.goalTitle} numberOfLines={1}>{goal.title}</Text>
          {goal.target_date && (
            <Text style={styles.goalDate}>
              <Ionicons name="calendar-outline" size={11} color={colors.mutedFg} /> {goal.target_date}
            </Text>
          )}
        </View>
        <Pressable onPress={onDelete} style={{ padding: spacing.sm }}>
          <Ionicons name="trash-outline" size={15} color={colors.mutedFg} />
        </Pressable>
      </View>

      {/* Progress */}
      <View style={styles.goalProgress}>
        <View style={styles.goalAmounts}>
          <Text style={styles.goalCurrent}>
            {isMoney ? formatINR(BigInt(current)) : `${current} ${goal.unit_label ?? ''}`}
          </Text>
          <Text style={styles.goalTarget}>
            / {isMoney ? formatINR(BigInt(target)) : `${target} ${goal.unit_label ?? ''}`}
          </Text>
        </View>
        <Text style={[styles.goalPct, { color: goal.color }]}>{Math.round(progress * 100)}%</Text>
      </View>
      <ProgressBar progress={progress} color={isComplete ? colors.success : goal.color} height={6} />

      {/* Reward badge */}
      {goal.reward_title && (
        <View style={styles.rewardBadge}>
          <Text style={styles.rewardEmoji}>{goal.reward_emoji ?? '🎁'}</Text>
          <Text style={styles.rewardText}>{goal.reward_title}</Text>
          {isComplete && <Ionicons name="trophy" size={13} color={colors.warning} />}
        </View>
      )}

      {/* Reminder */}
      {goal.reminder_date && !isComplete && (
        <View style={styles.reminderRow}>
          <Ionicons name="notifications-outline" size={12} color={colors.mutedFg} />
          <Text style={styles.reminderText}>{goal.reminder_date} at {goal.reminder_time ?? '09:00'}</Text>
        </View>
      )}

      {/* Deposit button for money goals */}
      {isMoney && !isComplete && (
        <Pressable style={[styles.depositBtn, { borderColor: hexToRgba(goal.color, 0.4) }]} onPress={onDeposit}>
          <Ionicons name="add-circle-outline" size={15} color={goal.color} />
          <Text style={[styles.depositText, { color: goal.color }]}>Add Money</Text>
        </Pressable>
      )}

      {isComplete && (
        <View style={styles.completedBanner}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.completedText}>Goal Completed!</Text>
        </View>
      )}
    </Card>
  );
}

// ── Deposit modal ─────────────────────────────────────────────────────────────
function DepositModal({ goal, visible, onClose }: { goal: Goal | null; visible: boolean; onClose: () => void }) {
  const addDeposit = useAddDeposit();
  const [amount, setAmount]   = useState('');
  const [note, setNote]       = useState('');
  const [loading, setLoading] = useState(false);

  const handleDeposit = async () => {
    const n = parseFloat(amount);
    if (!n || n <= 0 || !goal) return;
    setLoading(true);
    try {
      await addDeposit.mutateAsync({ goalId: goal.id, amountMinor: paise(n), note });
      setAmount(''); setNote('');
      onClose();
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Money</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color={colors.foreground} /></Pressable>
        </View>
        <View style={styles.modalContent}>
          <Text style={styles.fieldLabel}>Amount (₹)</Text>
          <TextInput style={styles.textInput} placeholder="0.00" placeholderTextColor={colors.mutedFg}
            value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <Text style={styles.fieldLabel}>Note (optional)</Text>
          <TextInput style={styles.textInput} placeholder="e.g. Monthly savings" placeholderTextColor={colors.mutedFg}
            value={note} onChangeText={setNote} />
          <PrimaryButton label={loading ? 'Saving…' : 'Add Deposit'} onPress={handleDeposit} loading={loading} fullWidth style={{ marginTop: spacing.md }} />
        </View>
      </View>
    </Modal>
  );
}

// ── Add goal modal ────────────────────────────────────────────────────────────
function AddGoalModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const createGoal = useCreateGoal();
  const [title, setTitle]         = useState('');
  const [type, setType]           = useState<'money' | 'activity'>('money');
  const [targetAmt, setTargetAmt] = useState('');
  const [targetVal, setTargetVal] = useState('');
  const [unit, setUnit]           = useState('');
  const [targetDate, setDate]     = useState('');
  const [color, setColor]         = useState(presetColors[0]);
  const [rewardTitle, setReward]  = useState('');
  const [rewardEmoji, setEmoji]   = useState('🎁');
  const [reminderDate, setRDate]  = useState('');
  const [loading, setLoading]     = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const goalId = await createGoal.mutateAsync({
        title: title.trim(), goal_type: type, color, icon: 'flag-outline',
        target_amount_minor: type === 'money' ? paise(parseFloat(targetAmt) || 0) : undefined,
        target_value: type === 'activity' ? parseFloat(targetVal) || undefined : undefined,
        unit_label: unit || undefined, target_date: targetDate || undefined,
        reward_title: rewardTitle || undefined,
        reward_emoji: rewardTitle ? rewardEmoji : undefined,
        reminder_date: reminderDate || undefined,
      });
      if (reminderDate) await scheduleGoalReminder(goalId, title.trim(), reminderDate);
      onClose();
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Goal</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color={colors.foreground} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput style={styles.textInput} placeholder="e.g. Buy a bike" placeholderTextColor={colors.mutedFg} value={title} onChangeText={setTitle} />

          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.typeRow}>
            {(['money', 'activity'] as const).map((t) => (
              <Pressable key={t} onPress={() => setType(t)}
                style={[styles.typeBtn, type === t && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                <Text style={[styles.typeBtnText, type === t && { color: '#fff' }]}>
                  {t === 'money' ? '💰 Money' : '🎯 Activity'}
                </Text>
              </Pressable>
            ))}
          </View>

          {type === 'money' ? (
            <>
              <Text style={styles.fieldLabel}>Target Amount (₹)</Text>
              <TextInput style={styles.textInput} placeholder="50000" placeholderTextColor={colors.mutedFg} value={targetAmt} onChangeText={setTargetAmt} keyboardType="decimal-pad" />
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Target Value</Text>
              <TextInput style={styles.textInput} placeholder="100" placeholderTextColor={colors.mutedFg} value={targetVal} onChangeText={setTargetVal} keyboardType="decimal-pad" />
              <Text style={styles.fieldLabel}>Unit</Text>
              <TextInput style={styles.textInput} placeholder="km / pages / sessions" placeholderTextColor={colors.mutedFg} value={unit} onChangeText={setUnit} />
            </>
          )}

          <Text style={styles.fieldLabel}>Target Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.textInput} placeholder="2025-12-31" placeholderTextColor={colors.mutedFg} value={targetDate} onChangeText={setDate} />

          <Text style={styles.fieldLabel}>Color</Text>
          <View style={styles.colorRow}>
            {presetColors.map((c) => (
              <Pressable key={c} onPress={() => setColor(c)} style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]} />
            ))}
          </View>

          {/* Reward */}
          <View style={styles.sectionBox}>
            <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>🎁 Reward (optional)</Text>
            <TextInput style={styles.textInput} placeholder="e.g. New running shoes" placeholderTextColor={colors.mutedFg} value={rewardTitle} onChangeText={setReward} />
            {rewardTitle ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.emojiRow}>
                  {REWARD_EMOJIS.map((e) => (
                    <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.emojiBtn, rewardEmoji === e && { backgroundColor: colors.primaryMuted }]}>
                      <Text style={{ fontSize: 22 }}>{e}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            ) : null}
          </View>

          {/* Reminder */}
          <View style={styles.sectionBox}>
            <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>🔔 Reminder (optional)</Text>
            <TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedFg} value={reminderDate} onChangeText={setRDate} />
          </View>

          <PrimaryButton label={loading ? 'Creating…' : 'Create Goal'} onPress={handleCreate} loading={loading} fullWidth style={{ marginTop: spacing.md }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function GoalsScreen() {
  const goalsQ    = useGoals();
  const deleteGoal = useDeleteGoal();
  const [addOpen, setAddOpen]       = useState(false);
  const [depositGoal, setDepGoal]   = useState<Goal | null>(null);

  const goals    = goalsQ.data ?? [];
  const active   = goals.filter((g) => g.is_active);
  const complete = active.filter((g) => {
    const p = g.goal_type === 'money'
      ? (g.current_amount_minor ?? 0) / Math.max(g.target_amount_minor ?? 1, 1)
      : (g.current_value ?? 0) / Math.max(g.target_value ?? 1, 1);
    return p >= 1;
  }).length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Goals</Text>
          <Text style={styles.screenSub}>{complete}/{active.length} completed</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => setAddOpen(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={active}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <View style={{ marginTop: -20 }} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="trophy-outline" size={48} color={colors.mutedFg} />}
            title="No goals yet"
            description="Set a goal and track your progress."
            action={<PrimaryButton label="Add your first goal" onPress={() => setAddOpen(true)} />}
          />
        }
        renderItem={({ item: goal }) => (
          <GoalCard
            goal={goal}
            onDeposit={() => setDepGoal(goal)}
            onDelete={() => Alert.alert('Delete goal', `Delete "${goal.title}"?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deleteGoal.mutate(goal.id) },
            ])}
          />
        )}
      />

      <AddGoalModal visible={addOpen} onClose={() => setAddOpen(false)} />
      <DepositModal goal={depositGoal} visible={!!depositGoal} onClose={() => setDepGoal(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  screenTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.foreground },
  screenSub:   { fontSize: fontSize.sm, color: colors.mutedFg, marginTop: 2 },
  addBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.xl, gap: spacing.md },

  goalCard:    { padding: spacing.lg, gap: spacing.md },
  goalTop:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  goalIcon:    { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  goalMeta:    { flex: 1 },
  goalTitle:   { fontSize: fontSize.base, fontWeight: '600', color: colors.foreground },
  goalDate:    { fontSize: fontSize.xs, color: colors.mutedFg, marginTop: 2 },
  goalProgress:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  goalAmounts: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  goalCurrent: { fontSize: fontSize.base, fontWeight: '700', color: colors.foreground },
  goalTarget:  { fontSize: fontSize.sm, color: colors.mutedFg },
  goalPct:     { fontSize: fontSize.sm, fontWeight: '600' },

  rewardBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.warningMuted, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 5, alignSelf: 'flex-start' },
  rewardEmoji:   { fontSize: 14 },
  rewardText:    { fontSize: fontSize.xs, color: colors.warning, fontWeight: '500' },
  reminderRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reminderText:  { fontSize: fontSize.xs, color: colors.mutedFg },
  depositBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.lg, paddingVertical: 10 },
  depositText:   { fontSize: fontSize.sm, fontWeight: '600' },
  completedBanner:{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.successMuted, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8 },
  completedText: { fontSize: fontSize.sm, color: colors.success, fontWeight: '600' },

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
  colorRow:       { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  colorDot:       { width: 32, height: 32, borderRadius: 16 },
  colorDotActive: { borderWidth: 3, borderColor: '#fff' },
  sectionBox:     { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  emojiRow:       { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  emojiBtn:       { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
