import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DateTimeInput } from '@/components/date-time-input';
import { Screen } from '@/components/screen';
import { Button, Card, EmptyState, SectionTitle } from '@/components/ui';
import { useExtraction } from '@/providers/extraction-provider';
import { useSchedule } from '@/providers/schedule-provider';
import {
  deleteImageFiles,
  persistImages,
} from '@/services/images/image-service';
import { colors, radii, spacing, typeMeta, typography } from '@/theme/tokens';
import {
  scheduleItemTypes,
  type ChangeType,
  type ScheduleItem,
  type ScheduleItemType,
} from '@/types/schedule';
import { formatDateTimeInput, parseDateTimeInput } from '@/utils/date';
import { findScheduleConflicts } from '@/utils/conflicts';
import { showAppAlert } from '@/utils/alerts';

interface CandidateDraft {
  selected: boolean;
  type: ScheduleItemType;
  title: string;
  course: string;
  startAtText: string;
  dueAtText: string;
  location: string;
  submissionMethod: string;
  requirementsText: string;
  sourceQuote: string;
  originalTimeText: string;
  confidence: number;
  uncertainFields: string[];
  changeType: ChangeType;
  relatedItemId: string | null;
  reminderMinutes: number | null | undefined;
}

const reminderOptions = [
  { label: '不提醒', value: null },
  { label: '提前5分钟', value: 5 },
  { label: '提前1小时', value: 60 },
  { label: '提前1天', value: 1440 },
] as const;

const changeReminderOptions = [
  { label: '保持原提醒', value: undefined },
  ...reminderOptions,
] as const;

export default function ReviewScreen() {
  const router = useRouter();
  const { session, setSession } = useExtraction();
  const { items, saveImportedItems } = useSchedule();
  const completedRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<CandidateDraft[]>(() =>
    session
      ? session.result.items.map((item) => ({
          selected: true,
          type: item.type,
          title: item.title,
          course: item.course ?? '',
          startAtText: formatDateTimeInput(item.startAt),
          dueAtText: formatDateTimeInput(item.dueAt),
          location: item.location ?? '',
          submissionMethod: item.submissionMethod ?? '',
          requirementsText: item.requirements.join('\n'),
          sourceQuote: item.sourceQuote,
          originalTimeText: item.originalTimeText ?? '',
          confidence: item.confidence,
          uncertainFields: item.uncertainFields,
          changeType: item.changeType,
          relatedItemId: item.relatedItemId,
          reminderMinutes:
            item.changeType === 'created' ? null : undefined,
        }))
      : [],
  );

  const selectedCount = useMemo(
    () => drafts.filter((draft) => draft.selected).length,
    [drafts],
  );

  useEffect(() => {
    const temporaryImageUris = session?.temporaryImageUris ?? [];
    return () => {
      if (!completedRef.current && temporaryImageUris.length) {
        void deleteImageFiles(temporaryImageUris);
      }
    };
  }, [session?.temporaryImageUris]);

  if (!session) {
    return (
      <Screen title="没有待确认内容">
        <EmptyState
          title="先导入一段通知"
          description="识别完成后，候选安排会在这里逐项核对。"
          action={<Button label="返回导入" onPress={() => router.dismissTo('/import')} />}
        />
      </Screen>
    );
  }
  const currentSession = session;

  function updateDraft(index: number, patch: Partial<CandidateDraft>) {
    setDrafts((current) =>
      current.map((draft, draftIndex) =>
        draftIndex === index ? { ...draft, ...patch } : draft,
      ),
    );
  }

  async function handleSave() {
    const selected = drafts.filter((draft) => draft.selected);
    if (selected.length === 0) {
      showAppAlert('没有选择事项', '请至少保留一项候选安排。');
      return;
    }

    const normalized = [];
    for (const draft of selected) {
      if (!draft.title.trim()) {
        showAppAlert('标题不能为空', '请检查所有已选择的候选事项。');
        return;
      }
      if (
        draft.changeType !== 'created' &&
        (!draft.relatedItemId ||
          !items.some((item) => item.id === draft.relatedItemId))
      ) {
        showAppAlert('请选择原事项', `“${draft.title}”是一条变更消息，需要关联已有安排。`);
        return;
      }
      const startAt = draft.startAtText.trim()
        ? parseDateTimeInput(draft.startAtText)
        : null;
      const dueAt = draft.dueAtText.trim()
        ? parseDateTimeInput(draft.dueAtText)
        : null;
      if (draft.startAtText.trim() && !startAt) {
        showAppAlert('开始时间格式不正确', `“${draft.title}”的开始时间需要使用YYYY-MM-DD HH:mm。`);
        return;
      }
      if (draft.dueAtText.trim() && !dueAt) {
        showAppAlert('截止时间格式不正确', `“${draft.title}”的截止时间需要使用YYYY-MM-DD HH:mm。`);
        return;
      }
      if (
        draft.changeType === 'created' &&
        draft.reminderMinutes !== null &&
        !startAt &&
        !dueAt
      ) {
        showAppAlert('无法设置提醒', `“${draft.title}”没有开始时间或截止时间。`);
        return;
      }
      normalized.push({ draft, startAt, dueAt });
    }

    setSaving(true);
    let persistedImageUris: string[] = [];
    try {
      if (
        currentSession.retainImages &&
        currentSession.temporaryImageUris?.length
      ) {
        persistedImageUris = await persistImages(currentSession.temporaryImageUris);
      }
      const saveResult = await saveImportedItems(
        {
          ...currentSession.source,
          imageUris: persistedImageUris,
        },
        normalized.map(({ draft, startAt, dueAt }) => ({
          type: draft.type,
          title: draft.title.trim(),
          course: draft.course.trim() || null,
          startAt,
          dueAt,
          location: draft.location.trim() || null,
          submissionMethod: draft.submissionMethod.trim() || null,
          requirements: draft.requirementsText
            .split(/\n/)
            .map((value) => value.trim())
            .filter(Boolean),
          sourceQuote: draft.sourceQuote,
          originalTimeText: draft.originalTimeText || null,
          confidence: draft.confidence,
          uncertainFields: draft.uncertainFields,
          changeType: draft.changeType,
          relatedItemId: draft.relatedItemId,
          reminderMinutes:
            draft.changeType === 'cancelled' ? null : draft.reminderMinutes,
          status:
            draft.changeType === 'cancelled'
              ? 'cancelled'
              : draft.uncertainFields.length
                ? 'pending_confirmation'
                : 'confirmed',
        })),
      );

      await deleteImageFiles(currentSession.temporaryImageUris ?? []);
      completedRef.current = true;
      setSession(null);
      const reminderMessage = saveResult.reminderFailureCount
        ? `其中${saveResult.reminderFailureCount}项提醒未能创建，请检查提醒时间和系统权限。`
        : '';
      showAppAlert(
        '已保存',
        `成功保存${selected.length}项安排。${reminderMessage}`,
        [
        { text: '查看今天', onPress: () => router.dismissTo('/') },
        ],
      );
    } catch (error) {
      await deleteImageFiles(persistedImageUris);
      showAppAlert('保存失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: `识别到${drafts.length}项安排` }} />
      <Screen eyebrow="逐项核对后再保存" title="识别结果">
        <Card style={styles.sourceCard}>
          <Text style={styles.sourceLabel}>原始通知</Text>
          <Text style={styles.sourceText}>{currentSession.request.text}</Text>
          {currentSession.temporaryImageUris?.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.sourceImages}>
              {currentSession.temporaryImageUris.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.sourceImage} />
              ))}
            </ScrollView>
          ) : null}
        </Card>

        <SectionTitle aside={<Text style={styles.selectedCount}>已选{selectedCount}项</Text>}>
          候选安排
        </SectionTitle>
        {drafts.map((draft, index) => (
          <CandidateCard
            key={`${draft.sourceQuote}-${index}`}
            draft={draft}
            existingItems={items}
            index={index}
            onUpdate={updateDraft}
          />
        ))}

        <Button
          disabled={selectedCount === 0}
          label={`保存${selectedCount}项安排`}
          loading={saving}
          onPress={handleSave}
          style={styles.saveButton}
        />
      </Screen>
    </>
  );
}

function CandidateCard({
  draft,
  existingItems,
  index,
  onUpdate,
}: {
  draft: CandidateDraft;
  existingItems: ReturnType<typeof useSchedule>['items'];
  index: number;
  onUpdate: (index: number, patch: Partial<CandidateDraft>) => void;
}) {
  const confidenceColor =
    draft.confidence >= 0.8
      ? colors.success
      : draft.confidence >= 0.6
        ? colors.warning
        : colors.danger;
  const conflictingItem = findDraftConflict(draft, index, existingItems);

  return (
    <Card style={[styles.candidate, draft.selected ? {} : styles.ignored]}>
      <View style={styles.candidateHeader}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: draft.selected }}
          onPress={() => onUpdate(index, { selected: !draft.selected })}
          style={[styles.checkbox, draft.selected && styles.checkboxSelected]}>
          {draft.selected && <Text style={styles.checkmark}>✓</Text>}
        </Pressable>
        <View style={styles.confidenceBlock}>
          <Text style={[styles.confidenceText, { color: confidenceColor }]}>
            {Math.round(draft.confidence * 100)}%置信度
          </Text>
          <View style={styles.confidenceTrack}>
            <View
              style={[
                styles.confidenceFill,
                {
                  width: `${Math.max(4, draft.confidence * 100)}%`,
                  backgroundColor: confidenceColor,
                },
              ]}
            />
          </View>
        </View>
        <Button
          label={draft.selected ? '忽略' : '恢复'}
          onPress={() => onUpdate(index, { selected: !draft.selected })}
          variant="ghost"
        />
      </View>

      <Text style={styles.fieldLabel}>事项类型</Text>
      <View style={styles.typeChips}>
        {scheduleItemTypes.map((type) => {
          const meta = typeMeta[type];
          const active = draft.type === type;
          return (
            <Pressable
              key={type}
              onPress={() => onUpdate(index, { type })}
              style={[
                styles.typeChip,
                active && { backgroundColor: meta.softColor, borderColor: meta.color },
              ]}>
              <Text style={[styles.typeChipText, active && { color: meta.color }]}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.fieldLabel}>消息性质</Text>
      <View style={styles.typeChips}>
        {changeTypeOptions.map((option) => {
          const active = draft.changeType === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() =>
                onUpdate(index, {
                  changeType: option.value,
                  relatedItemId:
                    option.value === 'created' ? null : draft.relatedItemId,
                  reminderMinutes:
                    option.value === 'created'
                      ? draft.reminderMinutes ?? null
                      : option.value === 'cancelled'
                        ? null
                        : draft.changeType === 'created'
                          ? undefined
                          : draft.reminderMinutes,
                })
              }
              style={[styles.typeChip, active && styles.changeChipActive]}>
              <Text style={[styles.typeChipText, active && styles.changeChipText]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {draft.changeType !== 'created' && (
        <View style={styles.changeTarget}>
          <Text style={styles.fieldLabel}>关联原事项</Text>
          <Text style={styles.changeHint}>确认后会更新原事项，并保留本次变更记录。</Text>
          <View style={styles.targetList}>
            {existingItems
              .filter((item) => item.status !== 'cancelled')
              .map((item) => {
                const active = draft.relatedItemId === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => onUpdate(index, { relatedItemId: item.id })}
                    style={[styles.targetOption, active && styles.targetOptionActive]}>
                    <Text
                      numberOfLines={2}
                      style={[styles.targetText, active && styles.targetTextActive]}>
                      {item.title}
                      {item.course ? ` · ${item.course}` : ''}
                    </Text>
                  </Pressable>
                );
              })}
          </View>
        </View>
      )}

      {conflictingItem && (
        <View style={styles.conflictBox}>
          <Text style={styles.conflictTitle}>时间冲突</Text>
          <Text style={styles.conflictText}>与“{conflictingItem.title}”的时间重叠，请核对。</Text>
        </View>
      )}

      <InputField
        label="标题"
        onChangeText={(title) => onUpdate(index, { title })}
        value={draft.title}
      />
      <InputField
        label="课程或项目"
        onChangeText={(course) => onUpdate(index, { course })}
        value={draft.course}
      />
      <InputField
        dateTime
        label="开始时间"
        onChangeText={(startAtText) => onUpdate(index, { startAtText })}
        placeholder="YYYY-MM-DD HH:mm"
        uncertain={draft.uncertainFields.includes('startAt')}
        value={draft.startAtText}
      />
      <InputField
        dateTime
        label="截止时间"
        onChangeText={(dueAtText) => onUpdate(index, { dueAtText })}
        placeholder="YYYY-MM-DD HH:mm"
        uncertain={draft.uncertainFields.includes('dueAt')}
        value={draft.dueAtText}
      />
      <>
        <Text style={styles.fieldLabel}>提醒时间</Text>
        {draft.changeType === 'cancelled' ? (
          <Text style={styles.reminderHint}>取消事项会同时关闭原有提醒。</Text>
        ) : (
          <View style={styles.reminderOptions}>
            {(draft.changeType === 'created'
              ? reminderOptions
              : changeReminderOptions
            ).map((option) => {
              const active = draft.reminderMinutes === option.value;
              return (
                <Pressable
                  key={option.label}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  onPress={() =>
                    onUpdate(index, { reminderMinutes: option.value })
                  }
                  style={[
                    styles.reminderOption,
                    active && styles.reminderOptionActive,
                  ]}>
                  <Text
                    style={[
                      styles.reminderOptionText,
                      active && styles.reminderOptionTextActive,
                    ]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </>
      <InputField
        label="地点"
        onChangeText={(location) => onUpdate(index, { location })}
        uncertain={draft.uncertainFields.includes('location')}
        value={draft.location}
      />
      <InputField
        label="提交方式"
        onChangeText={(submissionMethod) => onUpdate(index, { submissionMethod })}
        value={draft.submissionMethod}
      />
      <InputField
        label="准备事项或要求"
        multiline
        onChangeText={(requirementsText) => onUpdate(index, { requirementsText })}
        value={draft.requirementsText}
      />

      {draft.uncertainFields.length > 0 && (
        <View style={styles.uncertainBox}>
          <Text style={styles.uncertainTitle}>
            待确认：{draft.uncertainFields.join('、')}
          </Text>
          {draft.originalTimeText && (
            <Text style={styles.originalTime}>原始时间表达：{draft.originalTimeText}</Text>
          )}
          <Button
            label="我已核对这些字段"
            onPress={() => onUpdate(index, { uncertainFields: [] })}
            variant="secondary"
            style={styles.confirmButton}
          />
        </View>
      )}

      <View style={styles.evidence}>
        <Text style={styles.evidenceLabel}>原文证据</Text>
        <Text style={styles.evidenceText}>“{draft.sourceQuote}”</Text>
      </View>
    </Card>
  );
}

function findDraftConflict(
  draft: CandidateDraft,
  index: number,
  existingItems: ScheduleItem[],
): ScheduleItem | null {
  const startAt = parseDateTimeInput(draft.startAtText);
  if (!draft.selected || !startAt || draft.changeType === 'cancelled') {
    return null;
  }
  const id = `candidate-${index}`;
  const preview: ScheduleItem = {
    id,
    sourceId: null,
    relatedItemId: draft.relatedItemId,
    type: draft.type,
    title: draft.title,
    course: draft.course || null,
    startAt,
    dueAt: parseDateTimeInput(draft.dueAtText),
    location: draft.location || null,
    submissionMethod: draft.submissionMethod || null,
    requirements: [],
    sourceQuote: draft.sourceQuote,
    originalTimeText: draft.originalTimeText || null,
    confidence: draft.confidence,
    uncertainFields: draft.uncertainFields,
    changeType: draft.changeType,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const comparable = existingItems.filter(
    (item) => item.id !== draft.relatedItemId,
  );
  const conflict = findScheduleConflicts([...comparable, preview]).find(
    (candidate) => candidate.firstId === id || candidate.secondId === id,
  );
  if (!conflict) return null;
  const otherId = conflict.firstId === id ? conflict.secondId : conflict.firstId;
  return existingItems.find((item) => item.id === otherId) ?? null;
}

const changeTypeOptions: { value: ChangeType; label: string }[] = [
  { value: 'created', label: '新安排' },
  { value: 'rescheduled', label: '改期' },
  { value: 'extended', label: '延期' },
  { value: 'relocated', label: '换地点' },
  { value: 'cancelled', label: '取消' },
];

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  uncertain,
  dateTime,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  uncertain?: boolean;
  dateTime?: boolean;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {uncertain && <Text style={styles.uncertainTag}>待确认</Text>}
      </View>
      {dateTime ? (
        <DateTimeInput
          accessibilityLabel={label}
          inputStyle={uncertain ? styles.uncertainInput : undefined}
          onChangeText={onChangeText}
          placeholder={placeholder ?? '未填写'}
          value={value}
        />
      ) : (
        <TextInput
          multiline={multiline}
          onChangeText={onChangeText}
          placeholder={placeholder ?? '未填写'}
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            multiline && styles.multiline,
            uncertain && styles.uncertainInput,
          ]}
          textAlignVertical={multiline ? 'top' : 'center'}
          value={value}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sourceCard: {
    backgroundColor: colors.surfaceMuted,
  },
  sourceLabel: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  sourceText: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 23,
  },
  sourceImages: {
    marginTop: spacing.md,
  },
  sourceImage: {
    width: 96,
    height: 128,
    borderRadius: radii.sm,
    marginRight: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
  selectedCount: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '800',
  },
  candidate: {
    marginBottom: spacing.lg,
  },
  ignored: {
    opacity: 0.52,
  },
  candidateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontWeight: '900',
  },
  confidenceBlock: {
    flex: 1,
    marginRight: spacing.sm,
  },
  confidenceText: {
    fontSize: typography.caption,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  confidenceTrack: {
    height: 5,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: 5,
    borderRadius: 3,
  },
  typeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  reminderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  reminderHint: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  reminderOption: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  reminderOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  reminderOptionText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: '800',
  },
  reminderOptionTextActive: {
    color: colors.primary,
  },
  typeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  typeChipText: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: '800',
  },
  changeChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  changeChipText: {
    color: colors.accent,
  },
  changeTarget: {
    backgroundColor: colors.warningSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  conflictBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  conflictTitle: {
    color: colors.danger,
    fontSize: typography.caption,
    fontWeight: '900',
    marginBottom: spacing.xs,
  },
  conflictText: {
    color: colors.text,
    fontSize: typography.caption,
    lineHeight: 19,
  },
  changeHint: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  targetList: {
    gap: spacing.sm,
  },
  targetOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  targetOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  targetText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  targetTextActive: {
    color: colors.primary,
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  uncertainTag: {
    color: colors.warning,
    fontSize: typography.tiny,
    fontWeight: '800',
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    color: colors.text,
    fontSize: typography.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  multiline: {
    minHeight: 86,
  },
  uncertainInput: {
    borderColor: colors.warning,
    backgroundColor: colors.warningSoft,
  },
  uncertainBox: {
    backgroundColor: colors.warningSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  uncertainTitle: {
    color: colors.warning,
    fontSize: typography.caption,
    fontWeight: '900',
  },
  originalTime: {
    color: colors.textMuted,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  confirmButton: {
    marginTop: spacing.md,
  },
  evidence: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    padding: spacing.md,
  },
  evidenceLabel: {
    color: colors.primary,
    fontSize: typography.tiny,
    fontWeight: '900',
    marginBottom: spacing.xs,
  },
  evidenceText: {
    color: colors.text,
    fontSize: typography.caption,
    lineHeight: 19,
  },
  saveButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
});
