import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { getVehicle, resolveScannedQr, scanUrl } from '@/src/api/endpoints';
import { errMessage } from '@/src/api/client';
import { GlassCard } from '@/src/components/GlassCard';
import { NeonButton } from '@/src/components/NeonButton';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { VerifiedQr } from '@/src/components/VerifiedQr';
import { useToast } from '@/src/context/ToastContext';
import { colors, fonts, spacing } from '@/src/theme';

export default function QrDetail() {
  const router = useRouter(), toast = useToast();
  const params = useLocalSearchParams<{ qrId: string; vehicleId?: string }>();
  const qrId = typeof params.qrId === 'string' ? params.qrId : '';
  const [title, setTitle] = useState(''), [subtitle, setSubtitle] = useState(''), [error, setError] = useState('');
  const [loading, setLoading] = useState(true), [action, setAction] = useState('');
  const url = scanUrl(qrId);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (!url) throw new Error('The QR link is missing or the website address is not configured.');
      const { kind, item } = await resolveScannedQr(qrId);
      if (typeof params.vehicleId === 'string') {
        const vehicle = await getVehicle(params.vehicleId);
        if (vehicle.qr_id !== qrId || kind !== 'vehicle') throw new Error('This QR is no longer linked to this vehicle.');
      }
      setTitle(item.number_plate || item.name || item.display_name || 'NekSathi item');
      setSubtitle(item.vehicle_type || item.tag_type || item.title || kind);
    } catch (e: any) { setError([404, 410].includes(e?.response?.status) ? 'This QR is deleted, expired, or unassigned. Please check its record.' : errMessage(e)); }
    finally { setLoading(false); }
  }, [qrId, url, params.vehicleId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const share = async (copy = false) => {
    if (action || !url || error || loading) return;
    setAction(copy ? 'copy' : 'share');
    try {
      if (copy) { await Clipboard.setStringAsync(url); toast('Scan link copied', 'success'); }
      else await Share.share({ title: `NekSathi · ${title}`, message: `${title}\nScan or open this link to reach the owner privately:\n${url}` });
    } catch { toast('Could not share this QR link. Please retry.', 'error'); }
    finally { setAction(''); }
  };
  return <View style={styles.root} testID="qr-detail-screen">
    <ScreenHeader title="Smart QR" subtitle="Verified with your server" accent={colors.teal} onBack={() => router.back()} />
    <ScrollView contentContainerStyle={styles.content}>
      {loading ? <ActivityIndicator testID="qr-loading" color={colors.teal} /> : error ? <>
        <Text testID="qr-error" accessibilityRole="alert" style={styles.error}>{error}</Text><NeonButton testID="qr-retry" label="Retry" onPress={load} />
      </> : <>
        <GlassCard style={styles.card}><VerifiedQr url={url} testID="qr-code" />
          <Text testID="qr-title" style={styles.title}>{title}</Text><Text testID="qr-subtitle" style={styles.subtitle}>{subtitle}</Text>
          <Text testID="qr-help" style={styles.subtitle}>Anyone can scan this to reach the owner privately — no app needed.</Text>
        </GlassCard>
        <NeonButton testID="qr-share-button" label="Share QR link" icon="share-2" onPress={() => share()} loading={action === 'share'} disabled={!!action} />
        <NeonButton testID="qr-copy-button" label="Copy scan link" variant="ghost" icon="copy" onPress={() => share(true)} loading={action === 'copy'} disabled={!!action} />
        <NeonButton testID="qr-scan-button" label="Scan QR code" variant="ghost" icon="camera" onPress={() => router.push('/scan')} />
      </>}
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg }, content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.xl }, card: { gap: spacing.lg }, title: { color: colors.text, fontFamily: fonts.displaySemi, fontSize: 28, textAlign: 'center' }, subtitle: { color: colors.textDim, fontSize: 15, lineHeight: 22, textAlign: 'center' }, error: { color: colors.red, fontSize: 16, textAlign: 'center' } });