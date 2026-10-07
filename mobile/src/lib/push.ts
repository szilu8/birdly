import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { colors } from './theme';
import { supabase } from './supabase';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Engedélyt kér, lekéri az Expo push tokent és elmenti a szerverre.
 * Visszatérési érték: sikerült-e bekapcsolni az értesítéseket.
 */
export async function registerForPush(userId: string): Promise<boolean> {
  if (Platform.OS === 'web' || !Device.isDevice) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'birdly',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: colors.orange,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return false;

  const id = projectId();
  if (!id) {
    console.warn('Push: hiányzik az EAS projectId (app.json → extra.eas.projectId)');
    return false;
  }
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  const { error } = await supabase
    .from('push_tokens')
    .upsert({ user_id: userId, token, updated_at: new Date().toISOString() });
  if (error) {
    console.warn('Push token mentése sikertelen', error);
    return false;
  }
  return true;
}

export async function unregisterPush(userId: string) {
  await supabase.from('push_tokens').delete().eq('user_id', userId);
}
