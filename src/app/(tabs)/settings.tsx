import { useEffect, useState } from 'react';
import {
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/screen';
import { Button, Card, SectionTitle } from '@/components/ui';
import {
  defaultAiConfig,
  loadAiConfig,
  saveAiConfig,
} from '@/services/ai/config';
import { testAiConnection } from '@/services/ai/deepseek-client';
import {
  loadImageRetentionPolicy,
  saveImageRetentionPolicy,
} from '@/services/images/image-settings';
import {
  defaultEasyOcrConfig,
  loadEasyOcrConfig,
  saveEasyOcrConfig,
} from '@/services/ocr/easyocr-config';
import { saveSkipImageImportConfirm } from '@/services/preferences/prompt-preferences';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import type { ImageRetentionPolicy } from '@/types/image-import';
import { useSchedule } from '@/providers/schedule-provider';
import { showAppAlert } from '@/utils/alerts';

export default function SettingsScreen() {
  const { exportBackup, restoreBackup } = useSchedule();
  const [baseUrl, setBaseUrl] = useState(defaultAiConfig.baseUrl);
  const [model, setModel] = useState(defaultAiConfig.model);
  const [apiKey, setApiKey] = useState('');
  const [easyOcrBaseUrl, setEasyOcrBaseUrl] = useState(
    defaultEasyOcrConfig.baseUrl,
  );
  const [easyOcrAccessKey, setEasyOcrAccessKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingEasyOcr, setSavingEasyOcr] = useState(false);
  const [testing, setTesting] = useState(false);
  const [imageRetention, setImageRetention] =
    useState<ImageRetentionPolicy>('delete_after_parse');
  const [backupText, setBackupText] = useState('');
  const [backupBusy, setBackupBusy] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadAiConfig(),
      loadImageRetentionPolicy(),
      loadEasyOcrConfig(),
    ]).then(
      ([config, retentionPolicy, easyOcrConfig]) => {
        if (active) {
          setBaseUrl(config.baseUrl);
          setModel(config.model);
          setApiKey(config.apiKey);
          setImageRetention(retentionPolicy);
          setEasyOcrBaseUrl(easyOcrConfig.baseUrl);
          setEasyOcrAccessKey(easyOcrConfig.accessKey);
        }
      },
    );
    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    if (!baseUrl.trim() || !model.trim()) {
      showAppAlert('配置不完整', '请填写DeepSeek服务地址和模型。');
      return;
    }
    setSaving(true);
    try {
      await saveAiConfig({ baseUrl, model, apiKey });
      showAppAlert('已保存', 'DeepSeek配置已保存到当前设备。');
    } catch (error) {
      showAppAlert('保存失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEasyOcr() {
    if (!easyOcrBaseUrl.trim()) {
      showAppAlert('配置不完整', '请填写EasyOCR服务地址。');
      return;
    }
    setSavingEasyOcr(true);
    try {
      await saveEasyOcrConfig({
        baseUrl: easyOcrBaseUrl,
        accessKey: easyOcrAccessKey,
      });
      showAppAlert('已保存', 'EasyOCR配置已保存到当前设备。');
    } catch (error) {
      showAppAlert('保存失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setSavingEasyOcr(false);
    }
  }

  async function handleRetentionChange(policy: ImageRetentionPolicy) {
    setImageRetention(policy);
    try {
      await saveImageRetentionPolicy(policy);
    } catch (error) {
      showAppAlert('保存失败', error instanceof Error ? error.message : '请稍后重试');
    }
  }

  async function handleRestorePrompts() {
    try {
      await saveSkipImageImportConfirm(false);
      showAppAlert('提示已恢复', '下次识别图片时会重新显示上传与隐私确认。');
    } catch (error) {
      showAppAlert('恢复失败', error instanceof Error ? error.message : '请稍后重试');
    }
  }

  async function handleTest() {
    if (!apiKey.trim()) {
      showAppAlert('缺少API Key', '请先填写DeepSeek API Key。');
      return;
    }
    setTesting(true);
    try {
      const config = { baseUrl, model, apiKey };
      await saveAiConfig(config);
      await testAiConnection(config);
      showAppAlert('连接成功', 'DeepSeek接口可用，配置已保存。');
    } catch (error) {
      showAppAlert('连接失败', error instanceof Error ? error.message : '请检查配置');
    } finally {
      setTesting(false);
    }
  }

  async function handleExportBackup() {
    setBackupBusy(true);
    try {
      const json = await exportBackup();
      setBackupText(json);
      await Share.share({
        title: `研程备份-${new Date().toISOString().slice(0, 10)}.json`,
        message: json,
      });
    } catch (error) {
      showAppAlert('导出失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setBackupBusy(false);
    }
  }

  function confirmRestoreBackup() {
    if (!backupText.trim()) {
      showAppAlert('请粘贴备份JSON', '恢复会替换当前设备上的全部日程。');
      return;
    }
    showAppAlert(
      '替换当前全部数据？',
      '恢复前请先导出当前数据。现有日程、提醒和本地来源图片会被清理。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认恢复',
          style: 'destructive',
          onPress: async () => {
            setBackupBusy(true);
            try {
              const count = await restoreBackup(backupText);
              showAppAlert('恢复完成', `已恢复${count}项日程。系统提醒需要重新设置。`);
            } catch (error) {
              showAppAlert('恢复失败', error instanceof Error ? error.message : '请检查备份');
            } finally {
              setBackupBusy(false);
            }
          },
        },
      ],
    );
  }

  return (
    <Screen eyebrow="本地优先 · BYOK" title="设置">
      <SectionTitle>DeepSeek AI</SectionTitle>
      <Card>
        <Field label="服务地址">
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setBaseUrl}
            placeholder="https://api.deepseek.com"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={baseUrl}
          />
        </Field>
        <Field label="模型">
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setModel}
            placeholder="deepseek-v4-flash"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={model}
          />
        </Field>
        <Field label="API Key" last>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setApiKey}
            placeholder="sk-..."
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            style={styles.input}
            value={apiKey}
          />
        </Field>
        <Text style={styles.hint}>
          API Key仅保存在本机SecureStore，不写入SQLite、日志或导出文件。
        </Text>
        <View style={styles.buttons}>
          <Button
            label="保存配置"
            loading={saving}
            onPress={handleSave}
            style={styles.button}
          />
          <Button
            label="测试连接"
            loading={testing}
            onPress={handleTest}
            style={styles.button}
            variant="secondary"
          />
        </View>
      </Card>

      <SectionTitle>EasyOCR云识别</SectionTitle>
      <Card>
        <Field label="服务地址">
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setEasyOcrBaseUrl}
            placeholder="https://console.easyocr.org"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={easyOcrBaseUrl}
          />
        </Field>
        <Field label="Access Key" last>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setEasyOcrAccessKey}
            placeholder="EasyOCR Access Key"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            style={styles.input}
            value={easyOcrAccessKey}
          />
        </Field>
        <Text style={styles.hint}>
          Access Key仅保存在本机SecureStore。图片识别会消耗EasyOCR账户额度。
        </Text>
        <Button
          label="保存配置"
          loading={savingEasyOcr}
          onPress={handleSaveEasyOcr}
        />
      </Card>

      <SectionTitle>图片保留策略</SectionTitle>
      <Card>
        <RetentionOption
          active={imageRetention === 'delete_after_parse'}
          description="完成OCR和确认后删除临时图片，只保留识别文字与原文证据。"
          label="识别后删除（推荐）"
          onPress={() => handleRetentionChange('delete_after_parse')}
        />
        <RetentionOption
          active={imageRetention === 'keep_compressed'}
          description="在应用目录保留压缩副本，可在事项详情查看；删除最后一个关联事项时一并清理。"
          label="保留压缩副本"
          onPress={() => handleRetentionChange('keep_compressed')}
          last
        />
      </Card>

      <SectionTitle>日程默认值</SectionTitle>
      <Card>
        <SettingRow label="默认时区" value="跟随设备" />
        <SettingRow label="默认提醒" value="手动选择" />
        <SettingRow label="数据位置" value="仅当前设备" last />
      </Card>

      <SectionTitle>JSON备份与恢复</SectionTitle>
      <Card>
        <Text style={styles.backupText}>
          备份包含结构化日程和证据文字，不包含API Key、系统提醒标识和来源图片。
        </Text>
        <View style={styles.buttons}>
          <Button
            label="导出并分享"
            loading={backupBusy}
            onPress={handleExportBackup}
            style={styles.button}
          />
          <Button
            label="恢复此JSON"
            disabled={!backupText.trim()}
            onPress={confirmRestoreBackup}
            style={styles.button}
            variant="danger"
          />
        </View>
        <TextInput
          multiline
          onChangeText={setBackupText}
          placeholder="在这里粘贴研程导出的JSON备份"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.backupInput]}
          textAlignVertical="top"
          value={backupText}
        />
      </Card>

      <SectionTitle>隐私</SectionTitle>
      <Card>
        <Text style={styles.privacyTitle}>发送前由你决定</Text>
        <Text style={styles.privacyText}>
          你确认后，压缩图片会上传EasyOCR；识别文字随后发送DeepSeek。候选结果仍需逐项确认后才会保存。
        </Text>
        <Button
          label="恢复已关闭的提示"
          onPress={handleRestorePrompts}
          style={styles.restorePromptsButton}
          variant="secondary"
        />
      </Card>

      <SectionTitle>版本</SectionTitle>
      <Card>
        <SettingRow label="研程 GradFlow" value="v0.5.0" last />
      </Card>
    </Screen>
  );
}

function RetentionOption({
  active,
  description,
  label,
  last = false,
  onPress,
}: {
  active: boolean;
  description: string;
  label: string;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={[styles.retentionOption, last && styles.lastRetentionOption]}>
      <View style={[styles.radio, active && styles.radioActive]}>
        {active && <View style={styles.radioDot} />}
      </View>
      <View style={styles.retentionCopy}>
        <Text style={styles.retentionLabel}>{label}</Text>
        <Text style={styles.retentionDescription}>{description}</Text>
      </View>
    </Pressable>
  );
}

function Field({
  label,
  last,
  children,
}: {
  label: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.field, last && styles.lastField]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function SettingRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.lastRow]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.lg,
  },
  lastField: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    color: colors.text,
    fontSize: typography.body,
    paddingHorizontal: spacing.md,
  },
  hint: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  label: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  value: {
    color: colors.textMuted,
    fontSize: typography.body,
  },
  privacyTitle: {
    color: colors.text,
    fontSize: typography.subheading,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  privacyText: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 23,
  },
  restorePromptsButton: {
    marginTop: spacing.lg,
  },
  retentionOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  lastRetentionOption: {
    borderBottomWidth: 0,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  radioActive: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  retentionCopy: {
    flex: 1,
  },
  retentionLabel: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  retentionDescription: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 19,
  },
  backupText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  backupInput: {
    minHeight: 150,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
});
