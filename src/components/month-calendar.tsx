import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typeMeta, typography } from '@/theme/tokens';
import type { ScheduleItem } from '@/types/schedule';
import { buildMonthDays, itemDateKey, toDateKey } from '@/utils/date';

interface MonthCalendarProps {
  month: Date;
  selectedDate: Date;
  items: ScheduleItem[];
  onSelectDate: (date: Date) => void;
  onChangeMonth: (date: Date) => void;
}

const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日'];

export function MonthCalendar({
  month,
  selectedDate,
  items,
  onSelectDate,
  onChangeMonth,
}: MonthCalendarProps) {
  const days = buildMonthDays(month.getFullYear(), month.getMonth());
  const selectedKey = toDateKey(selectedDate);
  const todayKey = toDateKey(new Date());
  const typesByDate = new Map<string, ScheduleItem['type'][]>();

  for (const item of items) {
    const key = itemDateKey(item);
    if (!key || item.status === 'cancelled') {
      continue;
    }
    const types = typesByDate.get(key) ?? [];
    if (!types.includes(item.type)) {
      types.push(item.type);
    }
    typesByDate.set(key, types);
  }

  return (
    <View style={styles.container}>
      <View style={styles.monthHeader}>
        <Pressable
          accessibilityLabel="上个月"
          hitSlop={10}
          onPress={() =>
            onChangeMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }>
          <Text style={styles.arrow}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>
          {month.getFullYear()}年{month.getMonth() + 1}月
        </Text>
        <Pressable
          accessibilityLabel="下个月"
          hitSlop={10}
          onPress={() =>
            onChangeMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {weekdayLabels.map((label) => (
          <View key={label} style={styles.cell}>
            <Text style={styles.weekday}>{label}</Text>
          </View>
        ))}
        {days.map(({ date, inCurrentMonth }) => {
          const key = toDateKey(date);
          const selected = key === selectedKey;
          const today = key === todayKey;
          const types = typesByDate.get(key) ?? [];
          return (
            <Pressable
              key={key}
              accessibilityLabel={`${date.getMonth() + 1}月${date.getDate()}日`}
              onPress={() => onSelectDate(date)}
              style={styles.cell}>
              <View
                style={[
                  styles.dayCircle,
                  selected && styles.selectedDay,
                  today && !selected && styles.today,
                ]}>
                <Text
                  style={[
                    styles.dayText,
                    !inCurrentMonth && styles.outsideMonth,
                    selected && styles.selectedDayText,
                  ]}>
                  {date.getDate()}
                </Text>
              </View>
              <View style={styles.dots}>
                {types.slice(0, 3).map((type) => (
                  <View
                    key={type}
                    style={[styles.dot, { backgroundColor: typeMeta[type].color }]}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  monthHeader: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  monthTitle: {
    color: colors.text,
    fontSize: typography.subheading,
    fontWeight: '800',
  },
  arrow: {
    color: colors.primary,
    fontSize: 32,
    paddingHorizontal: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.2857%',
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekday: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDay: {
    backgroundColor: colors.primary,
  },
  today: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dayText: {
    color: colors.text,
    fontSize: typography.body,
  },
  outsideMonth: {
    color: '#B7B2AA',
  },
  selectedDayText: {
    color: colors.white,
    fontWeight: '800',
  },
  dots: {
    height: 6,
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
