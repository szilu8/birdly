import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../lib/theme';

/** Lebegő "kép küldése" gomb a Főoldalon és a Madárházban. */
export function SendFab() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Kép küldése"
      onPress={() => router.push('/send')}
      style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.94 }] }]}
    >
      <Text style={styles.icon}>📷</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.cream,
    elevation: 6,
    shadowColor: colors.orangeDeep,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  icon: { fontSize: 26 },
});
