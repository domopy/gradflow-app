import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { MonthCalendar } from '@/components/month-calendar';
import { ScheduleItemCard } from '@/components/schedule-item-card';
import { Screen } from '@/components/screen';
import { EmptyState, SectionTitle } from '@/components/ui';
import { useSchedule } from '@/providers/schedule-provider';
import { formatDayHeading, itemsForDate } from '@/utils/date';
import { colors, radii, spacing, typeMeta, typography } from '@/theme/tokens';
import { scheduleItemTypes, type ScheduleItemType } from '@/types/schedule';
import { conflictIds } from '@/utils/conflicts';

export default function CalendarScreen() {
  const router = useRouter();
  const { items } = useSchedule();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [month, setMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [typeFilter, setTypeFilter] = useState<ScheduleItemType | 'all'>('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const courses = [...new Set(items.map((item) => item.course).filter(Boolean))] as string[];
  const filteredItems = items.filter(
    (item) =>
      (typeFilter === 'all' || item.type === typeFilter) &&
      (courseFilter === 'all' || item.course === courseFilter),
  );
  const dayItems = itemsForDate(filteredItems, selectedDate);
  const conflicting = conflictIds(items);

  return (
    <Screen eyebrow="按日期查看" title="日历">
      <MonthCalendar
        month={month}
        selectedDate={selectedDate}
        items={filteredItems}
        onChangeMonth={setMonth}
        onSelectDate={(date) => {
          setSelectedDate(date);
          if (
            date.getFullYear() !== month.getFullYear() ||
            date.getMonth() !== month.getMonth()
          ) {
            setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
          }
        }}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filters}>
        <FilterChip
          active={typeFilter === 'all'}
          label="全部类型"
          onPress={() => setTypeFilter('all')}
        />
        {scheduleItemTypes.map((type) => (
          <FilterChip
            key={type}
            active={typeFilter === type}
            label={typeMeta[type].label}
            onPress={() => setTypeFilter(type)}
          />
        ))}
      </ScrollView>
      {courses.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterChip
            active={courseFilter === 'all'}
            label="全部课程"
            onPress={() => setCourseFilter('all')}
          />
          {courses.map((course) => (
            <FilterChip
              key={course}
              active={courseFilter === course}
              label={course}
              onPress={() => setCourseFilter(course)}
            />
          ))}
        </ScrollView>
      )}
      <SectionTitle>{formatDayHeading(selectedDate)}</SectionTitle>
      {dayItems.length ? (
        dayItems.map((item) => (
          <ScheduleItemCard
            key={item.id}
            item={item}
            hasConflict={conflicting.has(item.id)}
            onPress={() => router.push(`/item/${item.id}`)}
          />
        ))
      ) : (
        <EmptyState title="这一天没有安排" description="点右下方导入页，可以手动添加一项安排。" />
      )}
    </Screen>
  );
}

function FilterChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filters: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  filterChip: {
    minHeight: 36,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  filterText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  filterTextActive: {
    color: colors.primary,
  },
});
