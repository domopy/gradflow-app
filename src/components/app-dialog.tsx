import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { Button } from '@/components/ui';
import { colors, radii, spacing, typography } from '@/theme/tokens';

interface AppDialogProps {
  visible: boolean;
  title: string;
  description: string;
  badge?: string;
  confirmLabel: string;
  confirmVariant?: 'primary' | 'danger';
  cancelLabel?: string;
  children?: ReactNode;
  dontRemind?: boolean;
  dontRemindLabel?: string;
  onCancel?: () => void;
  onConfirm: () => void;
  onToggleDontRemind?: () => void;
}

export function AppDialog({
  visible,
  title,
  description,
  badge = '提',
  confirmLabel,
  confirmVariant = 'primary',
  cancelLabel = '取消',
  children,
  dontRemind,
  dontRemindLabel,
  onCancel,
  onConfirm,
  onToggleDontRemind,
}: AppDialogProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.description}>{description}</Text>
            </View>
          </View>

          {children ? <View style={styles.content}>{children}</View> : null}

          {dontRemindLabel && onToggleDontRemind ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: Boolean(dontRemind) }}
              onPress={onToggleDontRemind}
              style={styles.checkRow}>
              <View style={[styles.checkbox, dontRemind && styles.checkboxActive]}>
                {dontRemind ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </View>
              <Text style={styles.checkText}>{dontRemindLabel}</Text>
            </Pressable>
          ) : null}

          <View style={styles.actions}>
            {onCancel ? (
              <Button
                label={cancelLabel}
                onPress={onCancel}
                style={styles.action as ViewStyle}
                variant="secondary"
              />
            ) : null}
            <Button
              label={confirmLabel}
              onPress={onConfirm}
              style={styles.action as ViewStyle}
              variant={confirmVariant}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.overlay,
  },
  dialog: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    backgroundColor: colors.primarySoft,
  },
  badgeText: {
    color: colors.primary,
    fontSize: typography.subheading,
    fontWeight: '900',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '900',
    marginBottom: spacing.sm,
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 23,
  },
  content: {
    marginTop: spacing.lg,
  },
  checkRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    backgroundColor: colors.white,
  },
  checkboxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkboxMark: {
    color: colors.white,
    fontSize: typography.caption,
    fontWeight: '900',
    lineHeight: 16,
  },
  checkText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  action: {
    flex: 1,
  },
});
