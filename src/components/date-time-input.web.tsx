import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/tokens';

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
  return (
    <View>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, inputStyle]}
        value={value}
      />
      <Text style={styles.hint}>网页预览请手动输入；移动端可使用系统日期和时间选择器。</Text>
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
  hint: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    marginTop: spacing.xs,
  },
});
