import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { colors, spacing, typography } from '@/theme/tokens';

const tabs = [
  { name: 'index', title: '今天', icon: '⌂' },
  { name: 'calendar', title: '日历', icon: '□' },
  { name: 'import', title: '导入', icon: '＋' },
  { name: 'settings', title: '设置', icon: '⚙' },
] as const;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
      }}>
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => (
              <Text style={[styles.icon, { color }]}>{tab.icon}</Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 72,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
  },
  label: {
    fontSize: typography.tiny,
    fontWeight: '700',
  },
  icon: {
    fontSize: 22,
    fontWeight: '800',
  },
});
