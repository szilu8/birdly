import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../lib/theme';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: '#8C9183',
        tabBarStyle: {
          backgroundColor: colors.black,
          borderTopWidth: 0,
          height: 70 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 10),
        },
        tabBarLabelStyle: { fontFamily: fonts.heavy, fontSize: 12, lineHeight: 16 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Főoldal', tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tabs.Screen name="aviary" options={{ title: 'Madárház', tabBarIcon: ({ focused }) => <TabIcon emoji="🪺" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }} />
    </Tabs>
  );
}
