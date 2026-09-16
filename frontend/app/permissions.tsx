import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { notificationPermission, registerForPush } from '@/src/services/push';
import { openAppSettings, supportsNativePush } from '@/src/services/permissions';
import { requestLocation } from '@/src/utils/location';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { GlassCard } from '@/src/components/GlassCard';
import { NeonButton } from '@/src/components/NeonButton';
import { useAuth } from '@/src/context/AuthContext';
import { colors, fonts, spacing } from '@/src/theme';

type Status = { granted: boolean; canAskAgain: boolean } | null;
export default function Permissions() {
  const router = useRouter(), { user } = useAuth();
  const [camera, setCamera] = useState<Status>(null), [location, setLocation] = useState<Status>(null), [push, setPush] = useState<Status>(null);
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const check = useCallback(async () => {
    try {
      const results = await Promise.allSettled([Camera.getCameraPermissionsAsync(), Location.getForegroundPermissionsAsync(), notificationPermission()]);
      setCamera(results[0].status === 'fulfilled' ? results[0].value : null);
      setLocation(results[1].status === 'fulfilled' ? results[1].value : null);
      setPush(results[2].status === 'fulfilled' ? results[2].value : null);
      if (results.some(r => r.status === 'rejected')) setError('Some permission settings could not be read. You can retry safely.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void check(); const sub = AppState.addEventListener('change', s => { if (s === 'active') void check(); });
    return () => sub.remove();
  }, [check]);
  const enable = async (kind: string, status: Status) => {
    if (busy) return; setBusy(kind); setError('');
    try {
      if (status && !status.canAskAgain && !status.granted) {
        if (!(await openAppSettings())) setError('Open your device or browser settings to change this permission.');
      } else if (kind === 'camera') { router.push('/scan'); }
      else if (kind === 'location') { const result = await requestLocation(); if (result.error) setError(result.error); }
      else if (user && !(await registerForPush(user.id, true))) setError('Notifications were not enabled or could not be registered. Check permission and your connection, then retry.');
      await check();
    } catch { setError('Permission could not be updated. Please retry or open device Settings.'); }
    finally { setBusy(''); }
  };
  return <View style={styles.root} testID="permissions-screen"><ScreenHeader title="App permissions" subtitle="You stay in control" onBack={() => router.back()} />
    <ScrollView contentContainerStyle={styles.scroll}>
      {loading ? <ActivityIndicator testID="permissions-loading" color={colors.teal} /> : null}
      {[{ key: 'camera', label: 'Camera', why: 'Scan a QR code on a vehicle, tag, or card.', status: camera },
        { key: 'location', label: 'Location', why: 'Share your position when you use a safety feature.', status: location },
        { key: 'notifications', label: 'Notifications', why: 'Receive family and QR incident alerts on this phone.', status: push }].map(item => <GlassCard key={item.key} testID={`permission-${item.key}-card`} style={styles.card}>
          <Text testID={`permission-${item.key}-title`} style={styles.title}>{item.label}</Text>
          <Text testID={`permission-${item.key}-why`} style={styles.message}>{item.why}</Text>
          <Text testID={`permission-${item.key}-status`} style={styles.message}>{item.status?.granted ? 'Allowed' : item.key === 'notifications' && !supportsNativePush() ? 'Requires the installed app' : item.status ? item.status.canAskAgain ? 'Not allowed' : 'Disabled in Settings' : 'Status unavailable'}</Text>
          {!item.status?.granted && <NeonButton testID={`permission-${item.key}-enable`} label={item.status && !item.status.canAskAgain ? 'Open Settings' : item.key === 'camera' ? 'Open QR scanner' : 'Enable permission'} variant="ghost" onPress={() => enable(item.key, item.status)} loading={busy === item.key} disabled={!!busy || (item.key === 'notifications' && !supportsNativePush())} />}
        </GlassCard>)}
      <Text testID="permission-media-note" style={styles.message}>QR links are shared through your phone’s share sheet. No photo-library or storage permission is needed.</Text>
      {!!error && <Text testID="permissions-error" style={styles.error}>{error}</Text>}
      <NeonButton testID="permissions-refresh" label="Recheck permissions" onPress={() => { setError(''); void check(); }} variant="ghost" />
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg }, scroll: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl }, card: { gap: spacing.md }, title: { color: colors.text, fontFamily: fonts.displaySemi, fontSize: 22 }, message: { color: colors.textMuted, fontSize: 15, lineHeight: 22 }, error: { color: colors.red, fontSize: 15 } });