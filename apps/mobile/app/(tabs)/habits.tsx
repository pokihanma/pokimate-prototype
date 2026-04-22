import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  RefreshControl, Alert, TextInput, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useHabits, useCheckins, useUpsertCheckin, useCreateHabit, useDeleteHabit, type Habit } from '@/hooks/useHabits';
import { scheduleHabitReminder, cancelHabitReminder } from '@/notifications/reminders';
import { Card, EmptyState, ProgressBar, PrimaryButton, GhostButton, Badge } from '@/components/ui';
import { colors, fontSize, spacing, radius, hexToRgba, presetColors } from '@/theme';

function todayStr() { return new Date().toISOString().slice(0, 10); }

const ICON_OPTIONS = [
  { key: 'checkbox-outline', label: 'Check' },
  { key: 'barbell-outline', label: 'Gym' },
  { key: 'book-outline', label: 'Read' },
  { key: 'water-outline', label: 'Water' },
  { key: 'moon-outline', label: 'Sleep' },
  { key: 'sunny-outline', label: 'Morning' },
  { key: 'bicycle-outline', label: 'Bike' },
  { key: 'heart-outline', label: 'Health' },
  { key: 'musical-notes-outline', label: 'Music' },
  { key: 'pencil-outline', label: 'Write' },
  { key: 'nutrition-outline', label: 'Food' },
  { key: 'walk-outline', label: 'Walk' },
  { key: 'flask-outline', label: 'Study' },
  { key: 'leaf-outline', label: 'Nature' },
];

// ── Animated check button ─────────────────────────────────────────────────────
function CheckButton({ done, pending, onPress, color }: {
  done: boolean; pending: boolean; onPress: () => void; color: string;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSequence(withSpring(0.8), withSpring(1.1), withSpring(1));
    onPress();
  };

  return (
    <Animated.View style={animStyle}>
      <Pressable onPress={handlePress} disabled={pending} style={styles.checkBtn}>
        <Ionicons
          name={done ? 'checkmark-circle' : 'ellipse-outline'}
          size={32}
          color={done ? color : colors.mutedFg}
        />
      </Pressable>
    </Animated.View>
  );
}

// ── Habit card ────────────────────────────────────────────────────────────────
function HabitCard({ habit, done, pending, onCheck, onDelete }: {
  habit: Habit; done: boolean; pending: boolean;
  onCheck: () => void; onDelete: () => void;
}) {
  return (
    <Card
      style={[
        styles.habitCard,
        done && { borderColor: hexToRgba(habit.color, 0.4), backgroundColor: hexToRgba(habit.color, 0.06) },
      ]}
    >
      <View style={[styles.habitIconWrap, { backgroundColor: hexToRgba(habit.color, done ? 0.2 : 0.12) }]}>
        <Ionicons
          name={(habit.icon || 'checkbox-outline') as any}
          size={22}
          color={habit.color}
        />
      </View>
      <View style={styles.habitInfo}>
        <Text style={[styles.habitName, done && { color: habit.color }]} numberOfLines={1}>
          {habit.name}
        </Text>
        <Text style={styles.habitFreq}>{habit.frequency}</Text>
      </View>
      <Pressable
        onPress={() => Alert.alert('Delete habit', `Delete "${habit.name}"?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: onDelete },
        ])}
        style={styles.deleteBtn}
      >
        <Ionicons name="trash-outline" size={16} color={colors.mutedFg} />
      </Pressable>
      <CheckButton done={done} pending={pending} onPress={onCheck} color={habit.color} />
    </Card>
  );
}

// ── Add habit modal ───────────────────────────────────────────────────────────
function AddHabitModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const createMutation = useCreateHabit();
  const [name, setName]         = useState('');
  const [icon, setIcon]         = useState('checkbox-outline');
  const [color, setColor]       = useState(presetColors[0]);
  const [reminder, setReminder] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const id = await createMutation.mutateAsync({
        name: name.trim(), icon, color,
        reminder_time: reminder || undefined,
        reminder_enabled: reminder ? 1 : 0,
      });
      if (reminder) await scheduleHabitReminder(id, name.trim(), reminder);
      setName(''); setIcon('checkbox-outline'); setColor(presetColors[0]); setReminder('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Habit</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color={colors.foreground} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Morning workout"
            placeholderTextColor={colors.mutedFg}
            value={name} onChangeText={setName}
          />

          <Text style={styles.fieldLabel}>Icon</Text>
          <View style={styles.iconGrid}>
            {ICON_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => setIcon(opt.key)}
                style={[styles.iconOpt, icon === opt.key && { borderColor: color, backgroundColor: hexToRgba(color, 0.15) }]}
              >
                <Ionicons name={opt.key as any} size={20} color={icon === opt.key ? color : colors.mutedFg} />
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Color</Text>
          <View style={styles.colorRow}>
            {presetColors.map((c) => (
              <Pressable key={c} onPress={() => setColor(c)}
                style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Daily Reminder (optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="HH:MM (e.g. 07:30)"
            placeholderTextColor={colors.mutedFg}
            value={reminder} onChangeText={setReminder}
            keyboardType="numbers-and-punctuation"
          />

          <PrimaryButton label={submitting ? 'Creating…' : 'Create Habit'} onPress={handleCreate} loading={submitting} fullWidth style={styles.createBtn} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function HabitsScreen() {
  const today       = todayStr();
  const habitsQ     = useHabits();
  const checkinsQ   = useCheckins(today, today);
  const upsert      = useUpsertCheckin();
  const deleteHabit = useDeleteHabit();

  const [pending,    setPending]    = useState<Set<string>>(new Set());
  const [modalOpen,  setModalOpen]  = useState(false);

  const habits   = habitsQ.data ?? [];
  const checkins = checkinsQ.data ?? [];
  const doneToday = checkins.filter((c) => c.status === 'done').length;

  const isRefreshing = habitsQ.isFetching || checkinsQ.isFetching;
  const onRefresh    = () => { habitsQ.refetch(); checkinsQ.refetch(); };

  const handleCheck = useCallback(async (habit: Habit) => {
    const current = checkins.find((c) => c.habit_id === habit.id)?.status;
    const next = current === 'done' ? 'missed' : 'done';
    setPending((s) => new Set(s).add(habit.id));
    try {
      await upsert.mutateAsync({ habitId: habit.id, status: next });
    } finally {
      setPending((s) => { const n = new Set(s); n.delete(habit.id); return n; });
    }
  }, [checkins, upsert]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Habits</Text>
          <Text style={styles.screenSub}>{doneToday}/{habits.length} done today</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => setModalOpen(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {/* Progress */}
      {habits.length > 0 && (
        <View style={styles.progressWrap}>
          <ProgressBar progress={habits.length > 0 ? doneToday / habits.length : 0} height={6} />
        </View>
      )}

      <FlatList
        data={habits}
        keyExtractor={(h) => h.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="checkbox-outline" size={48} color={colors.mutedFg} />}
            title="No habits yet"
            description="Build consistency one habit at a time."
            action={<PrimaryButton label="Add your first habit" onPress={() => setModalOpen(true)} />}
          />
        }
        renderItem={({ item: habit }) => {
          const done = checkins.some((c) => c.habit_id === habit.id && c.status === 'done');
          return (
            <HabitCard
              habit={habit}
              done={done}
              pending={pending.has(habit.id)}
              onCheck={() => handleCheck(habit)}
              onDelete={() => deleteHabit.mutate(habit.id)}
            />
          );
        }}
      />

      <AddHabitModal visible={modalOpen} onClose={() => setModalOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  screenTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.foreground },
  screenSub:   { fontSize: fontSize.sm, color: colors.mutedFg, marginTop: 2 },
  addBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  progressWrap:{ paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  list:        { padding: spacing.xl, gap: spacing.sm, paddingTop: spacing.sm },

  habitCard:    { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  habitIconWrap:{ width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  habitInfo:    { flex: 1 },
  habitName:    { fontSize: fontSize.base, fontWeight: '600', color: colors.foreground },
  habitFreq:    { fontSize: fontSize.xs, color: colors.mutedFg, marginTop: 2, textTransform: 'capitalize' },
  deleteBtn:    { padding: spacing.sm },
  checkBtn:     { padding: 4 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle:     { fontSize: fontSize.lg, fontWeight: '700', color: colors.foreground },
  modalContent:   { padding: spacing.xl, gap: spacing.md },
  fieldLabel:     { fontSize: fontSize.sm, fontWeight: '500', color: colors.foreground },
  textInput:      { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 12, color: colors.foreground, fontSize: fontSize.base },
  iconGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconOpt:        { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  colorRow:       { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  colorDot:       { width: 32, height: 32, borderRadius: 16 },
  colorDotActive: { borderWidth: 3, borderColor: '#fff' },
  createBtn:      { marginTop: spacing.md },
});
