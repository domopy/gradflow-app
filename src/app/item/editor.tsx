import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DateTimeInput } from '@/components/date-time-input';
import { Screen } from '@/components/screen';
import { Button, SectionTitle } from '@/components/ui';
import { useSchedule } from '@/providers/schedule-provider';
import { scheduleItemInputSchema } from '@/schemas/schedule';
import { colors, radii, spacing, typeMeta, typography } from '@/theme/tokens';
import {
  scheduleItemTypes,
  type ScheduleItemType,
} from '@/types/schedule';
import { formatDateTimeInput, parseDateTimeInput } from '@/utils/date';
import { showAppAlert } from '@/utils/alerts';
import { isExpoGo } from '@/utils/runtime';

const reminderOptions = [
  { label: '不提醒', value: null },
  { label: '提前5分钟', value: 5 },
  { label: '提前1小时', value: 60 },
  { label: '提前1天', value: 1440 },
] as const;

function nextWholeHour(): string {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return formatDateTimeInput(date.toISOString());
}

export default function ItemEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getItem, getReminder, saveItem } = useSchedule();
  const editing = Boolean(id);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<ScheduleItemType>('meeting');
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('');
  const [hasStart, setHasStart] = useState(true);
  const [startAt, setStartAt] = useState(nextWholeHour);
  const [hasDue, setHasDue] = useState(false);
  const [dueAt, setDueAt] = useState('');
  const [location, setLocation] = useState('');
  const [submissionMethod, setSubmissionMethod] = useState('');
  const [requirements, setRequirements] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number | null | undefined>(
    editing ? undefined : null,
  );

  useEffect(() => {
    if (!id) {
      return;
    }
    Promise.all([getItem(id), getReminder(id)])
      .then(([item, reminder]) => {
        if (!item) {
          showAppAlert('事项不存在', '它可能已被删除。', [
            { text: '返回', onPress: () => router.back() },
          ]);
          return;
        }
        setType(item.type);
        setTitle(item.title);
        setCourse(item.course ?? '');
        setHasStart(Boolean(item.startAt));
        setStartAt(formatDateTimeInput(item.startAt));
        setHasDue(Boolean(item.dueAt));
        setDueAt(formatDateTimeInput(item.dueAt));
        setLocation(item.location ?? '');
        setSubmissionMethod(item.submissionMethod ?? '');
        setRequirements(item.requirements.join('\n'));
        if (reminder) {
          const target = item.startAt ?? item.dueAt;
          setReminderMinutes(
            target
              ? Math.max(
                  0,
                  Math.round(
                    (new Date(target).getTime() -
                      new Date(reminder.remindAt).getTime()) /
                      60_000,
                  ),
                )
              : null,
          );
        } else {
          setReminderMinutes(null);
        }
      })
      .finally(() => setLoading(false));
  }, [getItem, getReminder, id, router]);

  const selectedReminderLabel = useMemo(() => {
    if (reminderMinutes === undefined) {
      return '保持当前提醒';
    }
    return (
      reminderOptions.find((option) => option.value === reminderMinutes)?.label ??
      (reminderMinutes === null ? '不提醒' : `提前${reminderMinutes}分钟`)
    );
  }, [reminderMinutes]);

  async function handleSave() {
    const parsedStart = hasStart ? parseDateTimeInput(startAt) : null;
    const parsedDue = hasDue ? parseDateTimeInput(dueAt) : null;

    if (hasStart && !parsedStart) {
      showAppAlert('开始时间格式不正确', '请按“2026-06-21 15:00”的格式填写。');
      return;
    }
    if (hasDue && !parsedDue) {
      showAppAlert('截止时间格式不正确', '请按“2026-06-21 15:00”的格式填写。');
      return;
    }

    const result = scheduleItemInputSchema.safeParse({
      type,
      title,
      course,
      startAt: parsedStart,
      dueAt: parsedDue,
      location,
      submissionMethod,
      requirements: requirements
        .split(/[\n；;]/)
        .map((value) => value.trim())
        .filter(Boolean),
      status: 'confirmed',
      reminderMinutes,
    });

    if (!result.success) {
      showAppAlert('还需要补充一点', result.error.issues[0]?.message ?? '请检查输入内容');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveItem(result.data, id);
      const finishNavigation = () => {
        if (editing && router.canGoBack()) {
          router.back();
        } else {
          router.replace(`/item/${saved.id}`);
        }
      };
      if (saved.reminderScheduled === false) {
        showAppAlert(
          '事项已保存',
          isExpoGo()
            ? 'Expo Go不支持当前本地提醒模块。请使用重新构建的Development Build或Release版本测试。'
            : '提醒未创建。请确认提醒时间仍在未来，并在系统设置中允许通知、“闹钟和提醒”及后台运行。',
          [{ text: '知道了', onPress: finishNavigation }],
        );
      } else {
        finishNavigation();
      }
    } catch (error) {
      showAppAlert('保存失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: editing ? '编辑事项' : '新建事项' }} />
      <Screen eyebrow={editing ? '修正安排' : '记下一件重要的事'} title={editing ? '编辑事项' : '新建事项'}>
        {loading ? (
          <Text style={styles.loading}>正在读取…</Text>
        ) : (
          <>
            <Field label="标题" required>
              <TextInput
                accessibilityLabel="事项标题"
                maxLength={100}
                onChangeText={setTitle}
                placeholder="例如：课题组组会"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={title}
              />
            </Field>

            <SectionTitle>事项类型</SectionTitle>
            <View style={styles.chips}>
              {scheduleItemTypes.map((itemType) => {
                const meta = typeMeta[itemType];
                const selected = type === itemType;
                return (
                  <Pressable
                    key={itemType}
                    onPress={() => setType(itemType)}
                    style={[
                      styles.chip,
                      selected && { backgroundColor: meta.softColor, borderColor: meta.color },
                    ]}>
                    <Text style={[styles.chipText, selected && { color: meta.color }]}>
                      {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Field label="课程或项目">
              <TextInput
                onChangeText={setCourse}
                placeholder="选填"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={course}
              />
            </Field>

            <ToggleField label="开始时间" enabled={hasStart} onChange={setHasStart}>
              <DateTimeInput
                accessibilityLabel="开始时间"
                onChangeText={setStartAt}
                placeholder="2026-06-21 15:00"
                value={startAt}
              />
            </ToggleField>

            <ToggleField label="截止时间" enabled={hasDue} onChange={setHasDue}>
              <DateTimeInput
                accessibilityLabel="截止时间"
                onChangeText={setDueAt}
                placeholder="2026-06-25 23:59"
                value={dueAt}
              />
            </ToggleField>

            <Field label="地点">
              <TextInput
                onChangeText={setLocation}
                placeholder="例如：实验楼507"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={location}
              />
            </Field>

            <Field label="提交方式">
              <TextInput
                onChangeText={setSubmissionMethod}
                placeholder="例如：课程平台"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={submissionMethod}
              />
            </Field>

            <Field label="准备事项或要求">
              <TextInput
                multiline
                onChangeText={setRequirements}
                placeholder="每行一项，例如：准备5页以内PPT"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.multiline]}
                textAlignVertical="top"
                value={requirements}
              />
            </Field>

            <SectionTitle
              aside={<Text style={styles.reminderCurrent}>{selectedReminderLabel}</Text>}>
              本地提醒
            </SectionTitle>
            {editing && reminderMinutes === undefined && (
              <Button
                label="保持当前提醒"
                onPress={() => setReminderMinutes(undefined)}
                variant="secondary"
                style={styles.reminderButton}
              />
            )}
            <View style={styles.reminderRow}>
              {reminderOptions.map((option) => (
                <Pressable
                  key={option.label}
                  onPress={() => setReminderMinutes(option.value)}
                  style={[
                    styles.reminderOption,
                    reminderMinutes === option.value && styles.reminderOptionSelected,
                  ]}>
                  <Text
                    style={[
                      styles.reminderText,
                      reminderMinutes === option.value && styles.reminderTextSelected,
                    ]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Button
              label={editing ? '保存修改' : '保存事项'}
              loading={saving}
              onPress={handleSave}
              style={styles.saveButton}
            />
          </>
        )}
      </Screen>
    </>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

function ToggleField({
  label,
  enabled,
  onChange,
  children,
}: {
  label: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.toggleLabel}>
        <Text style={styles.label}>{label}</Text>
        <Switch
          trackColor={{ false: colors.border, true: colors.primarySoft }}
          thumbColor={enabled ? colors.primary : colors.textMuted}
          onValueChange={onChange}
          value={enabled}
        />
      </View>
      {enabled && children}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    color: colors.textMuted,
    fontSize: typography.body,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.danger,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: typography.body,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  multiline: {
    minHeight: 108,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  chip: {
    minWidth: 70,
    minHeight: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: '800',
  },
  toggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderCurrent: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  reminderButton: {
    marginBottom: spacing.sm,
  },
  reminderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reminderOption: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  reminderOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  reminderText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  reminderTextSelected: {
    color: colors.primary,
  },
  saveButton: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
});
