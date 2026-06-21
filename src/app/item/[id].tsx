import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppDialog } from '@/components/app-dialog';
import { Screen } from '@/components/screen';
import { Button, Card, SectionTitle } from '@/components/ui';
import { useSchedule } from '@/providers/schedule-provider';
import { addItemToSystemCalendar } from '@/services/calendar/calendar-service';
import { colors, radii, spacing, typeMeta, typography } from '@/theme/tokens';
import type { Source } from '@/types/source';
import type { Reminder, ScheduleChange } from '@/types/schedule';
import { conflictIds } from '@/utils/conflicts';
import { formatDateTime } from '@/utils/date';
import { showAppAlert } from '@/utils/alerts';

export default function ItemDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    items,
    loading,
    getChanges,
    getReminder,
    getSource,
    removeItem,
    setStatus,
  } = useSchedule();
  const item = items.find((candidate) => candidate.id === id);
  const [source, setSource] = useState<Source | null>(null);
  const [changes, setChanges] = useState<ScheduleChange[]>([]);
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [calendarDialog, setCalendarDialog] = useState<{
    title: string;
    description: string;
    badge: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    if (!item?.sourceId) {
      return () => {
        active = false;
      };
    }
    getSource(item.sourceId).then((nextSource) => {
      if (active) {
        setSource(nextSource);
      }
    });
    return () => {
      active = false;
    };
  }, [getSource, item?.sourceId]);
  useEffect(() => {
    let active = true;
    if (item) {
      Promise.all([getChanges(item.id), getReminder(item.id)]).then(
        ([nextChanges, nextReminder]) => {
          if (active) {
            setChanges(nextChanges);
            setReminder(nextReminder);
          }
        },
      );
    }
    return () => {
      active = false;
    };
  }, [getChanges, getReminder, item]);
  const visibleSource = source?.id === item?.sourceId ? source : null;

  if (loading) {
    return (
      <Screen title="正在读取">
        <Text style={styles.muted}>正在从本地数据库加载事项…</Text>
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen title="事项不存在">
        <Card>
          <Text style={styles.muted}>它可能已被删除，或数据库仍在加载。</Text>
          <Button label="返回首页" onPress={() => router.dismissTo('/')} style={styles.topGap} />
        </Card>
      </Screen>
    );
  }

  const currentItem = item;
  const meta = typeMeta[item.type];
  const hasConflict = conflictIds(items).has(item.id);

  function confirmDelete() {
    showAppAlert('删除这项安排？', '关联的本地提醒也会一并取消。', [
      { text: '保留', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await removeItem(currentItem.id);
          router.dismissTo('/');
        },
      },
    ]);
  }

  async function addToCalendar() {
    try {
      await addItemToSystemCalendar(currentItem);
      setCalendarDialog({
        title: '已写入系统日历',
        description: '你可以在手机日历中继续调整时间、地点和提醒。',
        badge: '成',
      });
    } catch (error) {
      setCalendarDialog({
        title: '暂时无法写入日历',
        description: error instanceof Error ? error.message : '请检查日历权限后重试',
        badge: '日',
      });
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: item.title }} />
      <Screen>
        <View style={styles.typeLine}>
          <View style={[styles.typeBadge, { backgroundColor: meta.softColor }]}>
            <Text style={[styles.typeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={styles.status}>
            {item.status === 'completed'
              ? '已完成'
              : item.status === 'cancelled'
                ? '已取消'
              : item.status === 'pending_confirmation'
                ? '待确认'
                : '已确认'}
          </Text>
          {hasConflict && <Text style={styles.conflictStatus}>时间冲突</Text>}
        </View>
        <Text style={styles.title}>{item.title}</Text>
        {item.course && <Text style={styles.course}>{item.course}</Text>}

        <Card style={styles.detailCard}>
          <DetailRow label="开始" value={formatDateTime(item.startAt)} />
          <DetailRow label="截止" value={formatDateTime(item.dueAt)} />
          <DetailRow label="地点" value={item.location ?? '未填写'} />
          <DetailRow label="提交方式" value={item.submissionMethod ?? '未填写'} />
          <DetailRow label="提醒" value={describeReminder(item, reminder)} last />
        </Card>

        {item.requirements.length > 0 && (
          <>
            <SectionTitle>准备事项与要求</SectionTitle>
            <Card>
              {item.requirements.map((requirement) => (
                <View key={requirement} style={styles.requirement}>
                  <View style={[styles.requirementDot, { backgroundColor: meta.color }]} />
                  <Text style={styles.requirementText}>{requirement}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {item.sourceQuote && (
          <>
            <SectionTitle>原文证据</SectionTitle>
            <Card style={styles.evidenceCard}>
              <Text style={styles.evidenceText}>“{item.sourceQuote}”</Text>
              {item.confidence != null && (
                <Text style={styles.evidenceMeta}>
                  AI置信度 {Math.round(item.confidence * 100)}%
                </Text>
              )}
              {item.uncertainFields.length > 0 && (
                <Text style={styles.uncertain}>
                  待确认字段：{item.uncertainFields.join('、')}
                </Text>
              )}
            </Card>
          </>
        )}

        {visibleSource?.imageUris.length ? (
          <>
            <SectionTitle>来源图片</SectionTitle>
            <Card>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {visibleSource.imageUris.map((uri) => (
                  <Image key={uri} source={{ uri }} style={styles.sourceImage} />
                ))}
              </ScrollView>
              <Text style={styles.imageHint}>图片为识别时保留的压缩副本，仅存储在当前设备。</Text>
            </Card>
          </>
        ) : null}

        {changes.length > 0 && (
          <>
            <SectionTitle>变更记录</SectionTitle>
            {changes.map((change) => (
              <Card key={change.id} style={styles.changeCard}>
                <Text style={styles.changeTitle}>
                  {changeLabels[change.changeType]} · {formatDateTime(change.createdAt)}
                </Text>
                <Text style={styles.changeText}>{describeChange(change)}</Text>
              </Card>
            ))}
          </>
        )}

        <SectionTitle>操作</SectionTitle>
        <Button
          label={
            item.status === 'completed'
              ? '恢复为未完成'
              : item.status === 'cancelled'
                ? '恢复为已确认'
                : '标记为完成'
          }
          onPress={() =>
            setStatus(
              item.id,
              item.status === 'completed' || item.status === 'cancelled'
                ? 'confirmed'
                : 'completed',
            )
          }
          variant="secondary"
          style={styles.actionButton}
        />
        <Button
          label="编辑事项"
          onPress={() => router.push({ pathname: '/item/editor', params: { id: item.id } })}
          variant="secondary"
          style={styles.actionButton}
        />
        <Button
          label="写入系统日历"
          onPress={addToCalendar}
          style={styles.actionButton}
        />
        <Button
          label="删除事项"
          onPress={confirmDelete}
          variant="danger"
          style={styles.actionButton}
        />
        <AppDialog
          badge={calendarDialog?.badge}
          confirmLabel="知道了"
          description={calendarDialog?.description ?? ''}
          onConfirm={() => setCalendarDialog(null)}
          title={calendarDialog?.title ?? ''}
          visible={calendarDialog !== null}
        />
      </Screen>
    </>
  );
}

const changeLabels = {
  rescheduled: '已改期',
  relocated: '已换地点',
  extended: '已延期',
  cancelled: '已取消',
} as const;

function describeChange(change: ScheduleChange): string {
  if (change.changeType === 'relocated') {
    return `${change.beforeSnapshot.location ?? '未填写'} → ${change.afterSnapshot.location ?? '未填写'}`;
  }
  if (change.changeType === 'cancelled') {
    return '该事项已被后续通知取消';
  }
  const before = change.changeType === 'extended'
    ? change.beforeSnapshot.dueAt
    : change.beforeSnapshot.startAt ?? change.beforeSnapshot.dueAt;
  const after = change.changeType === 'extended'
    ? change.afterSnapshot.dueAt
    : change.afterSnapshot.startAt ?? change.afterSnapshot.dueAt;
  return `${formatDateTime(before)} → ${formatDateTime(after)}`;
}

function DetailRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, last && styles.lastRow]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function describeReminder(
  item: NonNullable<ReturnType<typeof useSchedule>['items'][number]>,
  reminder: Reminder | null,
): string {
  if (!reminder) return '未设置';
  const target = item.startAt ?? item.dueAt;
  if (!target) return '已设置';
  const minutes = Math.max(
    0,
    Math.round(
      (new Date(target).getTime() - new Date(reminder.remindAt).getTime()) /
        60_000,
    ),
  );
  if (minutes >= 1440 && minutes % 1440 === 0) {
    return `提前${minutes / 1440}天`;
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    return `提前${minutes / 60}小时`;
  }
  return `提前${minutes}分钟`;
}

const styles = StyleSheet.create({
  typeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  typeBadge: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  typeText: {
    fontSize: typography.caption,
    fontWeight: '900',
  },
  status: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  conflictStatus: {
    color: colors.danger,
    fontSize: typography.caption,
    fontWeight: '900',
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    lineHeight: 38,
    fontWeight: '900',
    marginBottom: spacing.sm,
  },
  course: {
    color: colors.textMuted,
    fontSize: typography.body,
    marginBottom: spacing.xl,
  },
  detailCard: {
    marginTop: spacing.lg,
  },
  detailRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    width: 76,
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  detailValue: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  requirementDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
    marginRight: spacing.md,
  },
  requirementText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },
  actionButton: {
    marginBottom: spacing.md,
  },
  evidenceCard: {
    backgroundColor: colors.primarySoft,
    borderColor: '#D3DFEC',
  },
  evidenceText: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 23,
  },
  evidenceMeta: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  uncertain: {
    color: colors.warning,
    fontSize: typography.caption,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  sourceImage: {
    width: 132,
    height: 176,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    marginRight: spacing.md,
  },
  imageHint: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 19,
    marginTop: spacing.md,
  },
  changeCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.accentSoft,
  },
  changeTitle: {
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: '900',
    marginBottom: spacing.sm,
  },
  changeText: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  topGap: {
    marginTop: spacing.lg,
  },
});
