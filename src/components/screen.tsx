import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/theme/tokens';

interface ScreenProps extends PropsWithChildren {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  scroll?: boolean;
}

export function Screen({ title, eyebrow, action, scroll = true, children }: ScreenProps) {
  const content = (
    <>
      {(title || eyebrow || action) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
            {title && <Text style={styles.title}>{title}</Text>}
          </View>
          {action}
        </View>
      )}
      {children}
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        <View style={styles.content}>{content}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
