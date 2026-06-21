import { SQLiteProvider } from 'expo-sqlite';
import type { PropsWithChildren } from 'react';
import { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { migrateDatabase } from '@/db/migrations';
import { ScheduleProvider } from '@/providers/schedule-provider';
import { colors } from '@/theme/tokens';

export function AppDataProvider({ children }: PropsWithChildren) {
  return (
    <Suspense
      fallback={
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      }>
      <SQLiteProvider databaseName="gradflow.db" onInit={migrateDatabase} useSuspense>
        <ScheduleProvider>{children}</ScheduleProvider>
      </SQLiteProvider>
    </Suspense>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
