import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typeMeta, typography } from '@/theme/tokens';
import type { ScheduleItem } from '@/types/schedule';
import { formatDateTime, isOverdue } from '@/utils/date';

interface ScheduleItemCardProps {
  item: ScheduleItem;
  onPress: () => void;
  onToggleComplete?: () => void;
  hasConflict?: boolean;
}

export function ScheduleItemCard({
  item,
  onPress,
  onToggleComplete,
  hasConflict,
}: ScheduleItemCardProps) {
  const meta = typeMeta[item.type];
  const completed = item.status === 'completed';
  const overdue = isOverdue(item);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderLeftColor: meta.color },
        pressed && styles.pressed,
      ]}>
      {onToggleComplete && (
        <Pressable
          accessibilityLabel={completed ? '标记为未完成' : '标记为完成'}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: completed }}
          hitSlop={10}
          onPress={(event) => {
            event.stopPropagation();
            onToggleComplete();
          }}
          style={[styles.checkbox, completed && { backgroundColor: meta.color, borderColor: meta.color }]}>
          {completed && <Text style={styles.checkmark}>✓</Text>}
        </Pressable>
      )}

      <View style={styles.content}>
        <View style={styles.topLine}>
          <View style={[styles.typeBadge, { backgroundColor: meta.softColor }]}>
            <Text style={[styles.typeLabel, { color: meta.color }]}>{meta.label}</Text>
          </View>
          {item.status === 'pending_confirmation' && (
            <Text style={styles.pending}>待确认</Text>
          )}
          {overdue && <Text style={styles.overdue}>已逾期</Text>}
          {hasConflict && <Text style={styles.conflict}>时间冲突</Text>}
          {item.changeType !== 'created' && (
            <Text style={styles.changed}>{changeLabels[item.changeType]}</Text>
          )}
        </View>
        <Text numberOfLines={2} style={[styles.title, completed && styles.completed]}>
          {item.title}
        </Text>
        <Text style={styles.time}>
          {item.dueAt ? `截止 ${formatDateTime(item.dueAt)}` : formatDateTime(item.startAt)}
        </Text>
        {item.course && (
          <Text numberOfLines={1} style={styles.meta}>
            {item.course}
          </Text>
        )}
        {item.location && (
          <Text numberOfLines={1} style={styles.meta}>
            📍 {item.location}
          </Text>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 116,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 5,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  pressed: {
    opacity: 0.78,
  },
  checkbox: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkmark: {
    color: colors.white,
    fontWeight: '900',
  },
  content: {
    flex: 1,
  },
  topLine: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  typeBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  typeLabel: {
    fontSize: typography.tiny,
    fontWeight: '800',
  },
  pending: {
    color: colors.warning,
    fontSize: typography.tiny,
    fontWeight: '800',
  },
  overdue: {
    color: colors.danger,
    fontSize: typography.tiny,
    fontWeight: '800',
  },
  conflict: {
    color: colors.danger,
    fontSize: typography.tiny,
    fontWeight: '900',
  },
  changed: {
    color: colors.accent,
    fontSize: typography.tiny,
    fontWeight: '900',
  },
  title: {
    color: colors.text,
    fontSize: typography.subheading,
    fontWeight: '800',
    lineHeight: 23,
    marginBottom: spacing.xs,
  },
  completed: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  time: {
    color: colors.textMuted,
    fontSize: typography.caption,
    marginBottom: spacing.xs,
  },
  meta: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 30,
    marginLeft: spacing.sm,
  },
});

const changeLabels = {
  rescheduled: '已改期',
  relocated: '已换地点',
  extended: '已延期',
  cancelled: '已取消',
} as const;
