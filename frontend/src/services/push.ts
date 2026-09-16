import { Platform } from 'react-native';
import { registerPush } from '@/src/api/endpoints';
import { diagnostic } from '@/src/utils/diagnostics';
import { explainPermission, supportsNativePush } from './permissions';

export async function notificationPermission() {
  if (!supportsNativePush()) return null;
  const Notifications = await import('expo-notifications');
  return Notifications.getPermissionsAsync();
}
export async function configureNotificationChannel() {
  if (!supportsNativePush()) return;
  const Notifications = await import('expo-notifications');
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', {
    name: 'Safety alerts', importance: Notifications.AndroidImportance.MAX, sound: 'default',
  });
}
// Silent on launch. Prompting is allowed only through an explicit feature action.
export async function registerForPush(userId: string, request = false): Promise<boolean> {
  if (!supportsNativePush()) return false;
  try {
    const Notifications = await import('expo-notifications');
    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) {
      if (!request || !permission.canAskAgain || !(await explainPermission('notifications'))) return false;
      await configureNotificationChannel();
      permission = await Notifications.requestPermissionsAsync();
    }
    if (!permission.granted) return false;
    await configureNotificationChannel();
    const token = await Notifications.getDevicePushTokenAsync();
    await registerPush(userId, Platform.OS, String(token.data));
    return true;
  } catch {
    diagnostic('notification-registration-failed');
    return false;
  }
}