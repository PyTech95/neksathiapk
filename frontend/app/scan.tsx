import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { parseQrValue, listVehicles, resolveScannedQr } from '@/src/api/endpoints';
import { errMessage } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { openAppSettings } from '@/src/services/permissions';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Field } from '@/src/components/Field';
import { NeonButton } from '@/src/components/NeonButton';
import { colors, fonts, radius, spacing } from '@/src/theme';

export default function Scan() {
  const router = useRouter(), focused = useIsFocused(), { user } = useAuth();
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [manual, setManual] = useState(''), [cameraError, setCameraError] = useState(false);
  const scanned = useRef(false), alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const sub = AppState.addEventListener('change', s => { setActive(s === 'active'); if (s === 'active') { void getPermission().catch(() => setError('Could not recheck camera permission.')); setCameraError(false); } });
    return () => { alive.current = false; sub.remove(); };
  }, [getPermission]);
  const onScan = async (value: string) => {
    if (scanned.current) return;
    scanned.current = true; setBusy(true); setError('');
    try {
      const qrId = parseQrValue(value);
      if (!qrId) throw new Error('Enter or scan a valid NekSathi QR link or QR ID.');
      const resolved = await resolveScannedQr(qrId);
      if (resolved.kind === 'vehicle' && user) {
        const vehicles = await listVehicles().catch(() => []);
        const matches = vehicles.filter(v => v.qr_id === qrId);
        if (matches.length > 1) throw new Error('This QR has conflicting vehicle mappings. Contact support.');
        if (matches.length === 1 && alive.current) { router.replace({ pathname: '/vehicle-detail', params: { id: matches[0].id } }); return; }
      }
      if (alive.current) router.replace({ pathname: '/scan-report', params: { qrId } });
    } catch (e: any) {
      if (alive.current) setError([404, 410].includes(e?.response?.status) ? 'This QR is deleted, expired, or unassigned. Check the code and retry.' : errMessage(e));
    } finally { if (alive.current) setBusy(false); }
  };
  const request = async () => {
    setBusy(true); setError('');
    try {
      if (permission && !permission.canAskAgain) {
        if (!(await openAppSettings())) setError('Enable the camera in your device or browser settings.');
      } else await requestPermission();
    } catch { setError('Camera permission could not be requested. Please retry or open Settings.'); }
    finally { setBusy(false); }
  };
  return <View style={styles.root} testID="scan-screen"><ScreenHeader title="Scan a NekSathi QR" subtitle="Vehicles, tags & ICE cards" onBack={() => router.back()} accent={colors.teal} />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {!permission ? <ActivityIndicator testID="scan-loading" color={colors.teal} /> : !permission.granted ? <View testID="scan-permission" style={styles.content}>
        <Text testID="scan-permission-title" style={styles.title}>Camera access needed</Text>
        <Text testID="scan-permission-explanation" style={styles.message}>Use the camera only to scan a QR on a vehicle, bag or card. You can also paste its link below without camera access.</Text>
        <NeonButton testID={permission.canAskAgain ? 'scan-enable-camera' : 'scan-open-settings'} label={permission.canAskAgain ? 'Enable camera' : 'Open Settings'} icon={permission.canAskAgain ? 'camera' : 'settings'} onPress={request} loading={busy} />
      </View> : <View style={styles.cameraFrame}>
        {focused && active && !scanned.current && !cameraError ? <CameraView testID="scan-camera" style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => { void onScan(data); }} onMountError={() => { setCameraError(true); setError('The camera could not open. Paste the QR link below, or retry.'); }} /> : null}
        <View pointerEvents="none" style={styles.frame} />
      </View>}
      {busy ? <ActivityIndicator testID="scan-resolving" color={colors.teal} /> : null}
      {!!error && <><Text testID="scan-error" accessibilityRole="alert" style={styles.error}>{error}</Text><NeonButton testID="scan-retry" label="Try again" variant="ghost" onPress={() => { scanned.current = false; setCameraError(false); setError(''); }} /></>}
      <Field testID="scan-link-input" label="QR LINK OR ID" value={manual} onChangeText={setManual} placeholder="Paste a NekSathi scan link" autoCapitalize="none" autoCorrect={false} />
      <NeonButton testID="scan-open-link" label="Open QR" icon="arrow-right" onPress={() => { scanned.current = false; void onScan(manual); }} disabled={busy || !manual.trim()} />
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg }, content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl }, title: { fontFamily: fonts.displaySemi, color: colors.text, fontSize: 24 }, message: { color: colors.textMuted, fontSize: 16, lineHeight: 24 }, cameraFrame: { height: 290, borderRadius: radius.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }, frame: { width: 220, height: 220, borderWidth: 3, borderColor: colors.teal, borderRadius: radius.md }, error: { color: colors.red, fontSize: 15, lineHeight: 22 } });