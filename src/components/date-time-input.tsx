import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/tokens';
import {
  commitDateTimeSelection,
  dateTimeInputToDate,
  mergeDateTimeSelection,
  parseDateTimeInput,
} from '@/utils/date';
import { showAppAlert } from '@/utils/alerts';

interface DateTimeInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  inputStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

export function DateTimeInput({
  value,
  onChangeText,
  placeholder = 'YYYY-MM-DD HH:mm',
  inputStyle,
  accessibilityLabel,
}: DateTimeInputProps) {
  const [mode, setMode] = useState<'date' | 'time' | null>(null);
  const [draft, setDraft] = useState(() => dateTimeInputToDate(value));

  function openPicker(nextMode: 'date' | 'time') {
    // 每次打开都重新读取文本，避免选择器覆盖用户刚刚手动修改的另一部分。
    if (value.trim() && !parseDateTimeInput(value)) {
      showAppAlert(
        '时间格式尚未完成',
        '请先按“YYYY-MM-DD HH:mm”完成输入，或清空后再使用选择器。',
      );
      return;
    }
    const current = dateTimeInputToDate(value);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: nextMode,
        is24Hour: true,
        onChange: (event, selected) => {
          if (event.type === 'set' && selected) {
            const merged = mergeDateTimeSelection(current, selected, nextMode);
            onChangeText(commitDateTimeSelection(value, merged, true));
          }
        },
      });
      return;
    }
    setDraft(current);
    setMode(nextMode);
  }

  function confirmSelection() {
    onChangeText(commitDateTimeSelection(value, draft, true));
    setMode(null);
  }

  return (
    <View>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        inputMode="text"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, inputStyle]}
        value={value}
      />
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => openPicker('date')}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <Text style={styles.actionText}>选日期</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => openPicker('time')}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <Text style={styles.actionText}>选时间</Text>
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setMode(null)}
        transparent
        visible={mode !== null}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.title}>
              {mode === 'date' ? '选择日期' : '选择时间'}
            </Text>
            {mode && (
              <DateTimePicker
                display="spinner"
                is24Hour
                locale="zh-CN"
                mode={mode}
                onChange={(_, selected) => {
                  if (selected) {
                    setDraft((current) =>
                      mergeDateTimeSelection(current, selected, mode),
                    );
                  }
                }}
                value={draft}
              />
            )}
            <View style={styles.dialogActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setMode(null)}
                style={[styles.dialogButton, styles.cancelButton]}>
                <Text style={styles.cancelText}>取消</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={confirmSelection}
                style={[styles.dialogButton, styles.confirmButton]}>
                <Text style={styles.confirmText}>确认</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  action: {
    minHeight: 40,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
  },
  actionText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.72,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.overlay,
  },
  dialog: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: typography.subheading,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dialogButton: {
    minHeight: 46,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  cancelText: {
    color: colors.text,
    fontWeight: '800',
  },
  confirmText: {
    color: colors.white,
    fontWeight: '800',
  },
});
