import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppAlertHost } from '@/components/app-alert-host';
import { AppDataProvider } from '@/providers/app-data-provider';
import { ExtractionProvider } from '@/providers/extraction-provider';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  return (
    <AppDataProvider>
      <ExtractionProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="review" options={{ title: '识别结果' }} />
          <Stack.Screen name="item/editor" options={{ title: '事项' }} />
          <Stack.Screen name="item/[id]" options={{ title: '事项详情' }} />
        </Stack>
        <AppAlertHost />
      </ExtractionProvider>
    </AppDataProvider>
  );
}
