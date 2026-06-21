import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScheduleItemCard } from '@/components/schedule-item-card';
import { Screen } from '@/components/screen';
import { Button, Card, EmptyState, SectionTitle } from '@/components/ui';
import { useSchedule } from '@/providers/schedule-provider';
import { colors, spacing, typography } from '@/theme/tokens';
import type { ScheduleItem } from '@/types/schedule';
import { formatDayHeading } from '@/utils/date';
import { groupUpcomingItems } from '@/utils/schedule-groups';

export default function TodayScreen() {
  const router = useRouter();
  const { items, loading, setStatus } = useSchedule();
  const groups = groupUpcomingItems(items);
  const visibleCount =
    groups.today.length + groups.nextThreeDays.length + groups.thisWeek.length;

  function openItem(item: ScheduleItem) {
    router.push(`/item/${item.id}`);
  }

  function renderItems(groupItems: ScheduleItem[]) {
    return groupItems.map((item) => (
      <ScheduleItemCard
        key={item.id}
        item={item}
        onPress={() => openItem(item)}
        onToggleComplete={() =>
          setStatus(item.id, item.status === 'completed' ? 'confirmed' : 'completed')
        }
      />
    ));
  }

  return (
    <Screen
      eyebrow="研程 · GRADFLOW"
      title="今天"
      action={
        <Pressable
          accessibilityLabel="新建事项"
          onPress={() => router.push('/item/editor')}
          style={styles.addButton}>
          <Text style={styles.addButtonText}>＋</Text>
        </Pressable>
      }>
      <Text style={styles.date}>{formatDayHeading(new Date())}</Text>

      <Card style={styles.summary}>
        <View>
          <Text style={styles.summaryNumber}>{visibleCount}</Text>
          <Text style={styles.summaryLabel}>未来一周安排</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View>
          <Text style={styles.summaryNumber}>
            {items.filter((item) => item.status === 'pending_confirmation').length}
          </Text>
          <Text style={styles.summaryLabel}>待确认</Text>
        </View>
      </Card>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : items.length === 0 ? (
        <EmptyState
          title="日程还是一张白纸"
          description="可以手动添加，也可以从通知文字、聊天截图或纸面通知中提取。"
          action={<Button label="添加第一项安排" onPress={() => router.push('/item/editor')} />}
        />
      ) : (
        <>
          {groups.today.length > 0 && (
            <>
              <SectionTitle>今天要记得</SectionTitle>
              {renderItems(groups.today)}
            </>
          )}
          {groups.nextThreeDays.length > 0 && (
            <>
              <SectionTitle>三天内</SectionTitle>
              {renderItems(groups.nextThreeDays)}
            </>
          )}
          {groups.thisWeek.length > 0 && (
            <>
              <SectionTitle>本周随后</SectionTitle>
              {renderItems(groups.thisWeek)}
            </>
          )}
          {groups.today.length === 0 &&
            groups.nextThreeDays.length === 0 &&
            groups.thisWeek.length === 0 && (
              <EmptyState
                title="近一周没有安排"
                description="挺难得的清静。你仍可以在日历中查看更远的事项。"
              />
            )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: colors.white,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '400',
  },
  date: {
    color: colors.textMuted,
    fontSize: typography.body,
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.primarySoft,
    borderColor: '#D3DFEC',
    marginBottom: spacing.sm,
  },
  summaryNumber: {
    color: colors.primary,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  summaryDivider: {
    width: 1,
    height: 44,
    backgroundColor: '#CBD9E8',
  },
  loading: {
    marginTop: 80,
  },
});
