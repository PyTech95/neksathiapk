import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useRootNavigationState, useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { registerForPush } from '@/src/services/push';
import { supportsNativePush } from '@/src/services/permissions';
import { diagnostic } from '@/src/utils/diagnostics';
import { record, text } from '@/src/api/normalizers';

const processed = new Set<string>();
export function NotificationBridge() {
  const { user, bootstrapping, startupError } = useAuth();
  const userId = user?.id;
  const navigation = useRootNavigationState(), router = useRouter();
  useEffect(() => {
    if (!userId || bootstrapping || startupError || !navigation?.key || !supportsNativePush()) return;
    let active = true;
    let tap: { remove: () => void } | undefined;
    const open = (response: any) => {
      if (!active || !response) return;
      const id = text(response.notification?.request?.identifier);
      if (id && processed.has(id)) return;
      if (id) processed.add(id);
      const data = record(response.notification?.request?.content?.data);
      const incident = text(data.incident_id || data.incidentId || data.incident);
      const alert = text(data.alert_id);
      const url = text(data.deeplink || data.action_url || data.url);
      const incidentMatch = url.match(/\/(?:incident|i)\/([\w-]+)/);
      const scanMatch = url.match(/\/scan\/([\w-]+)/);
      if (incident || incidentMatch) router.push({ pathname: '/incident-detail', params: { id: incident || incidentMatch![1] } });
      else if (alert) router.push({ pathname: '/alert-detail', params: { id: alert } });
      else if (scanMatch) router.push({ pathname: '/scan-report', params: { qrId: scanMatch[1] } });
      else if (url === '/(tabs)/family' || url === '/family') router.push('/(tabs)/family');
      else router.push('/incidents-inbox');
    };
    void (async () => {
      const Notifications = await import('expo-notifications');
      if (!active) return;
      Notifications.setNotificationHandler({ handleNotification: async () => ({
        shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true,
      }) });
      tap = Notifications.addNotificationResponseReceivedListener(open);
      const response = await Notifications.getLastNotificationResponseAsync();
      open(response);
      if (response && active) await Notifications.clearLastNotificationResponseAsync();
      if (active) await registerForPush(userId);
    })().catch(() => diagnostic('notification-setup-failed'));
    const resume = AppState.addEventListener('change', state => {
      if (state === 'active') void registerForPush(userId);
    });
    return () => { active = false; tap?.remove(); resume.remove(); };
  }, [userId, bootstrapping, startupError, navigation?.key, router]);
  return null;
}