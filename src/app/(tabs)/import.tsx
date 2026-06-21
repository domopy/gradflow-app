import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppDialog } from '@/components/app-dialog';
import { DateTimeInput } from '@/components/date-time-input';
import { Screen } from '@/components/screen';
import { Button, Card, SectionTitle } from '@/components/ui';
import { useExtraction } from '@/providers/extraction-provider';
import { useSchedule } from '@/providers/schedule-provider';
import { loadAiConfig } from '@/services/ai/config';
import { extractScheduleFromText } from '@/services/ai/deepseek-client';
import {
  compressImages,
  deleteImageFiles,
  pickImages,
  takePhoto,
} from '@/services/images/image-service';
import { loadImageRetentionPolicy } from '@/services/images/image-settings';
import { loadEasyOcrConfig } from '@/services/ocr/easyocr-config';
import { extractTextFromImages } from '@/services/ocr/ocr-service';
import {
  saveSkipImageImportConfirm,
  shouldSkipImageImportConfirm,
} from '@/services/preferences/prompt-preferences';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import type { ImportImage } from '@/types/image-import';
import { showAppAlert } from '@/utils/alerts';
import { formatDateTimeInput, parseDateTimeInput } from '@/utils/date';

const exampleText =
  '明天下午3点在实验楼507组会，每个人准备5页以内PPT。机器学习作业延期到下周五。';

export default function ImportScreen() {
  const router = useRouter();
  const { setSession } = useExtraction();
  const { items } = useSchedule();
  const [text, setText] = useState('');
  const [messageDate, setMessageDate] = useState(() =>
    formatDateTimeInput(new Date().toISOString()),
  );
  const [images, setImages] = useState<ImportImage[]>([]);
  const [parsingMode, setParsingMode] = useState<'text' | 'image' | null>(null);
  const [stage, setStage] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [imageConfirmVisible, setImageConfirmVisible] = useState(false);
  const [skipImageConfirm, setSkipImageConfirm] = useState(false);
  const imageConfirmResolver = useRef<((confirmed: boolean) => void) | null>(null);

  useEffect(() => {
    if (parsingMode === null) return;
    const interval = setInterval(
      () => setElapsedSeconds((current) => current + 1),
      1_000,
    );
    return () => clearInterval(interval);
  }, [parsingMode]);

  async function handleParse() {
    if (!text.trim()) {
      showAppAlert('请粘贴通知文字', '可以是一条消息，也可以是包含多项安排的一段通知。');
      return;
    }
    const parsedMessageDate = parseDateTimeInput(messageDate);
    if (!parsedMessageDate) {
      showAppAlert('消息时间格式不正确', '请按“2026-06-21 15:00”的格式填写。');
      return;
    }

    setElapsedSeconds(0);
    setParsingMode('text');
    setStage('正在连接DeepSeek…');
    try {
      const config = await loadAiConfig();
      const request = {
        text: text.trim(),
        messageDate: parsedMessageDate,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        existingItems: toExtractionItems(items),
      };
      setStage('DeepSeek正在整理日程…');
      const result = await extractScheduleFromText(config, request);
      if (result.items.length === 0) {
        showAppAlert('没有发现明确安排', '模型没有从这段文字中提取出可确认的日程。');
        return;
      }
      setSession({
        request,
        result,
        source: {
          type: 'text',
          originalText: request.text,
          messageDate: request.messageDate,
        },
      });
      router.push('/review');
    } catch (error) {
      showAppAlert('识别失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setStage('');
      setParsingMode(null);
    }
  }

  async function handlePickImages() {
    try {
      const picked = await pickImages();
      setImages((current) => {
        const merged = [...current];
        for (const image of picked) {
          if (!merged.some((existing) => existing.uri === image.uri)) {
            merged.push(image);
          }
        }
        if (merged.length > 5) {
          showAppAlert('最多选择5张图片', '已保留前5张图片。');
        }
        return merged.slice(0, 5);
      });
    } catch (error) {
      showAppAlert('无法选择图片', error instanceof Error ? error.message : '请稍后重试');
    }
  }

  async function handleTakePhoto() {
    try {
      const photo = await takePhoto();
      if (photo) {
        setImages((current) => [...current, photo].slice(0, 5));
      }
    } catch (error) {
      showAppAlert('无法拍照', error instanceof Error ? error.message : '请检查相机权限');
    }
  }

  async function handleParseImages() {
    if (images.length === 0) {
      showAppAlert('请先选择图片', '支持一次选择或拍摄最多5张通知截图。');
      return;
    }
    const parsedMessageDate = parseDateTimeInput(messageDate);
    if (!parsedMessageDate) {
      showAppAlert('消息时间格式不正确', '请按“2026-06-21 15:00”的格式填写。');
      return;
    }
    if (!(await confirmImageImport())) {
      return;
    }

    let temporaryImageUris: string[] = [];
    let failureStage: 'ocr' | 'ai' = 'ocr';
    setElapsedSeconds(0);
    setParsingMode('image');
    try {
      setStage('正在压缩图片…');
      temporaryImageUris = await compressImages(images);
      setStage('正在上传EasyOCR…');
      const easyOcrConfig = await loadEasyOcrConfig();
      const recognizedText = await extractTextFromImages(
        temporaryImageUris,
        easyOcrConfig,
        (current, total) => setStage(`EasyOCR识别中 ${current}/${total}…`),
      );
      if (!recognizedText.trim()) {
        throw new Error('没有从图片中识别到文字，请尝试更清晰的截图');
      }
      if (recognizedText.length > 30_000) {
        throw new Error('识别文字过长，请减少图片数量后重试');
      }

      setStage('正在让DeepSeek整理日程…');
      failureStage = 'ai';
      const config = await loadAiConfig();
      const request = {
        text: recognizedText,
        messageDate: parsedMessageDate,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        existingItems: toExtractionItems(items),
      };
      const result = await extractScheduleFromText(config, request);
      if (result.items.length === 0) {
        throw new Error('没有从图片文字中发现明确安排');
      }

      const retentionPolicy = await loadImageRetentionPolicy();
      setSession({
        request,
        result,
        source: {
          type: 'image',
          originalText: recognizedText,
          messageDate: parsedMessageDate,
        },
        temporaryImageUris,
        retainImages: retentionPolicy === 'keep_compressed',
      });
      temporaryImageUris = [];
      router.push('/review');
    } catch (error) {
      showAppAlert(
        failureStage === 'ai' ? '日程整理失败' : '图片识别失败',
        error instanceof Error ? error.message : '请稍后重试',
      );
    } finally {
      await deleteImageFiles(temporaryImageUris);
      setStage('');
      setParsingMode(null);
    }
  }

  async function confirmImageImport(): Promise<boolean> {
    if (await shouldSkipImageImportConfirm()) {
      return true;
    }
    setSkipImageConfirm(false);
    setImageConfirmVisible(true);
    return new Promise((resolve) => {
      imageConfirmResolver.current = resolve;
    });
  }

  function resolveImageConfirm(confirmed: boolean) {
    setImageConfirmVisible(false);
    const resolve = imageConfirmResolver.current;
    imageConfirmResolver.current = null;
    resolve?.(confirmed);
  }

  async function handleImageConfirmContinue() {
    if (skipImageConfirm) {
      try {
        await saveSkipImageImportConfirm(true);
      } catch {
        // 偏好保存失败不阻断本次用户已确认的导入流程。
      }
    }
    resolveImageConfirm(true);
  }

  return (
    <Screen eyebrow="把通知变成日程" title="导入">
      <SectionTitle>聊天截图或纸面通知</SectionTitle>
      <Card>
        <View style={styles.imageActions}>
          <Button
            disabled={parsingMode !== null}
            label="从相册选择"
            onPress={handlePickImages}
            style={styles.imageAction}
            variant="secondary"
          />
          <Button
            disabled={parsingMode !== null || images.length >= 5}
            label="拍摄通知"
            onPress={handleTakePhoto}
            style={styles.imageAction}
            variant="secondary"
          />
        </View>
        {images.length > 0 ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imageList}>
              {images.map((image, index) => (
                <View key={image.id} style={styles.imagePreviewWrap}>
                  <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                  <Pressable
                    accessibilityLabel={`移除第${index + 1}张图片`}
                    onPress={() =>
                      setImages((current) =>
                        current.filter((candidate) => candidate.id !== image.id),
                      )
                    }
                    style={styles.removeImage}>
                    <Text style={styles.removeImageText}>×</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            <Text style={styles.imageCount}>已选择{images.length}/5张</Text>
          </>
        ) : (
          <Text style={styles.emptyImages}>图片只会在你主动选择后读取。</Text>
        )}
        <View style={styles.cloudOcrNotice}>
          <Text style={styles.cloudOcrTitle}>EasyOCR云识别</Text>
          <Text style={styles.cloudOcrText}>
            压缩图片会上传EasyOCR；识别文字随后发送DeepSeek。两步都需要你主动确认。
          </Text>
        </View>
        {parsingMode === 'image' && (
          <RecognitionProgress
            elapsedSeconds={elapsedSeconds}
            service={getImageProgressService(stage)}
            stage={stage}
          />
        )}
        <Button
          disabled={images.length === 0 || parsingMode !== null}
          label="识别图片中的安排"
          loading={parsingMode === 'image'}
          onPress={handleParseImages}
          style={styles.imageParseButton}
        />
      </Card>

      <SectionTitle>或粘贴文字</SectionTitle>
      <Card style={styles.editorCard}>
        <View style={styles.editorHeader}>
          <Text style={styles.label}>通知或聊天文字</Text>
          {text.length > 0 && (
            <Pressable
              accessibilityLabel="清空通知文字"
              accessibilityRole="button"
              disabled={parsingMode !== null}
              hitSlop={8}
              onPress={() => setText('')}
              style={({ pressed }) => [
                styles.clearTextButton,
                pressed && styles.clearTextButtonPressed,
                parsingMode !== null && styles.clearTextButtonDisabled,
              ]}>
              <Text style={styles.clearTextIcon}>×</Text>
            </Pressable>
          )}
        </View>
        <TextInput
          multiline
          onChangeText={setText}
          placeholder={exampleText}
          placeholderTextColor={colors.textMuted}
          style={styles.textArea}
          textAlignVertical="top"
          value={text}
        />
        <View style={styles.helperRow}>
          <Text style={styles.helper}>不会自动保存，识别后必须逐项确认</Text>
          <Text style={styles.count}>{text.length}/6000</Text>
        </View>
      </Card>

      <SectionTitle>相对时间基准</SectionTitle>
      <Card>
        <Text style={styles.label}>消息发送时间</Text>
        <DateTimeInput
          accessibilityLabel="消息发送时间"
          onChangeText={setMessageDate}
          placeholder="2026-06-21 15:00"
          value={messageDate}
        />
        <Text style={styles.explanation}>
          “明天”“下周五”等表达会结合该时间和设备时区解析。
        </Text>
      </Card>

      <View style={styles.privacy}>
        <Text style={styles.privacyIcon}>↗</Text>
        <Text style={styles.privacyText}>
          点击后，以上文字会发送到你在设置中配置的DeepSeek服务。
        </Text>
      </View>

      {parsingMode === 'text' && (
        <RecognitionProgress
          elapsedSeconds={elapsedSeconds}
          service="DeepSeek"
          stage={stage}
        />
      )}
      <Button
        disabled={text.length > 6000 || parsingMode !== null}
        label="开始识别"
        loading={parsingMode === 'text'}
        onPress={handleParse}
        style={styles.parseButton}
      />
      <Button
        label="手动添加"
        onPress={() => router.push('/item/editor')}
        variant="ghost"
      />

      <AppDialog
        badge="隐"
        confirmLabel="继续识别"
        description="研程会先上传压缩后的图片到EasyOCR，再把识别出的文字发送到你配置的DeepSeek服务。"
        dontRemind={skipImageConfirm}
        dontRemindLabel="以后识别图片时不再提醒"
        onCancel={() => resolveImageConfirm(false)}
        onConfirm={handleImageConfirmContinue}
        onToggleDontRemind={() => setSkipImageConfirm((current) => !current)}
        title="开始识别图片？"
        visible={imageConfirmVisible}>
        <View style={styles.dialogFacts}>
          <Text style={styles.dialogFact}>图片只会在你点击继续后上传。</Text>
          <Text style={styles.dialogFact}>候选日程仍需你逐项确认后才会保存。</Text>
        </View>
      </AppDialog>
    </Screen>
  );
}

function RecognitionProgress({
  elapsedSeconds,
  service,
  stage,
}: {
  elapsedSeconds: number;
  service: string;
  stage: string;
}) {
  return (
    <View style={styles.progressStatus}>
      <ActivityIndicator color={colors.primary} size="small" />
      <View style={styles.progressCopy}>
        <Text style={styles.progressStage}>{stage || '正在处理…'}</Text>
        <Text style={styles.progressMeta}>
          当前阶段：{service} · 已等待{elapsedSeconds}秒
        </Text>
      </View>
    </View>
  );
}

function getImageProgressService(stage: string): string {
  if (stage.includes('DeepSeek')) return 'DeepSeek';
  if (stage.includes('EasyOCR') || stage.includes('上传')) return 'EasyOCR';
  return '本机图片处理';
}

function toExtractionItems(items: ReturnType<typeof useSchedule>['items']) {
  return items
    .filter((item) => item.status !== 'cancelled')
    .slice(0, 100)
    .map(({ id, title, course, startAt, dueAt, location }) => ({
      id,
      title,
      course,
      startAt,
      dueAt,
      location,
    }));
}

const styles = StyleSheet.create({
  editorCard: {
    paddingBottom: spacing.md,
  },
  imageActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  imageAction: {
    flex: 1,
  },
  imageList: {
    marginTop: spacing.lg,
  },
  imagePreviewWrap: {
    position: 'relative',
    marginRight: spacing.md,
  },
  imagePreview: {
    width: 112,
    height: 150,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  removeImage: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: colors.white,
    fontSize: 20,
    lineHeight: 22,
  },
  imageCount: {
    color: colors.textMuted,
    fontSize: typography.caption,
    marginTop: spacing.sm,
  },
  emptyImages: {
    color: colors.textMuted,
    fontSize: typography.caption,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  cloudOcrNotice: {
    backgroundColor: colors.successSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  cloudOcrTitle: {
    color: colors.success,
    fontSize: typography.caption,
    fontWeight: '900',
    marginBottom: spacing.xs,
  },
  cloudOcrText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 19,
  },
  imageParseButton: {
    marginTop: spacing.md,
  },
  label: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  editorHeader: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearTextButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.sm,
  },
  clearTextButtonPressed: {
    backgroundColor: colors.dangerSoft,
  },
  clearTextButtonDisabled: {
    opacity: 0.45,
  },
  clearTextIcon: {
    color: colors.textMuted,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '700',
  },
  textArea: {
    minHeight: 210,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 23,
    padding: spacing.lg,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    color: colors.text,
    fontSize: typography.body,
    paddingHorizontal: spacing.lg,
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  helper: {
    flex: 1,
    color: colors.textMuted,
    fontSize: typography.tiny,
  },
  count: {
    color: colors.textMuted,
    fontSize: typography.tiny,
  },
  explanation: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  privacyIcon: {
    color: colors.warning,
    fontSize: 20,
    fontWeight: '900',
    marginRight: spacing.sm,
  },
  privacyText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 19,
  },
  parseButton: {
    marginTop: spacing.md,
  },
  progressStatus: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.lg,
  },
  progressCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  progressStage: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: '900',
    marginBottom: spacing.xs,
  },
  progressMeta: {
    color: colors.textMuted,
    fontSize: typography.tiny,
  },
  dialogFacts: {
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    gap: spacing.sm,
  },
  dialogFact: {
    color: colors.text,
    fontSize: typography.caption,
    lineHeight: 19,
  },
});
