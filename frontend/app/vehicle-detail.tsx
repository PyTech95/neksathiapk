import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getVehicle, listVehicles, listTags, scanUrl, resolveScannedQr } from '@/src/api/endpoints';
import type { Vehicle, Tag } from '@/src/api/types';
import { errMessage } from '@/src/api/client';
import { vehicleTags } from '@/src/utils/vehicles';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { GlassCard } from '@/src/components/GlassCard';
import { NeonButton } from '@/src/components/NeonButton';
import { VehicleIcon } from '@/src/components/VehicleIcon';
import { TagChips } from '@/src/components/TagChips';
import { VerifiedQr } from '@/src/components/VerifiedQr';
import { colors, fonts, spacing } from '@/src/theme';

export default function VehicleDetail() {
  const { id: param } = useLocalSearchParams<{ id: string }>(), id = typeof param === 'string' ? param : '';
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null), [tags, setTags] = useState<Tag[]>([]);
  const [busy, setBusy] = useState(true), [error, setError] = useState(''), [qrError, setQrError] = useState(''), [qrOk, setQrOk] = useState(false);
  const load = useCallback(async () => {
    setBusy(true); setError(''); setQrOk(false); setQrError('');
    try {
      if (!id) throw new Error('Vehicle reference is missing. Return to your garage.');
      const v = await getVehicle(id); setVehicle(v);
      const all = await listVehicles();
      if (!v.qr_id || all.filter(item => item.qr_id === v.qr_id).length !== 1) {
        setQrError('No unique QR is assigned to this vehicle. Please contact support.');
      } else {
        try {
          const resolved = await resolveScannedQr(v.qr_id);
          if (resolved.kind !== 'vehicle' || resolved.item.number_plate !== v.number_plate) throw new Error('QR details do not match this vehicle.');
          setQrOk(true);
        } catch (e: any) { setQrError([404, 410].includes(e?.response?.status) ? 'This QR is no longer active.' : errMessage(e)); }
      }
      // No global tag catalog is fabricated: embedded mappings, if supplied, are preserved.
      if (v.tag_ids?.length || v.tags?.length) setTags(vehicleTags(v, await listTags()));
      else setTags(vehicleTags(v, []));
    } catch (e: any) { setError(e?.response?.status === 404 ? 'This vehicle was deleted or is no longer available to your account.' : errMessage(e)); }
    finally { setBusy(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const openQr = () => { if (vehicle && qrOk) router.push({ pathname: '/qr-detail', params: { qrId: vehicle.qr_id, vehicleId: vehicle.id, title: vehicle.number_plate } }); };
  return <View style={styles.root} testID="vehicle-detail-screen">
    <ScreenHeader title="Vehicle details" subtitle="Your garage · Smart QR" accent={colors.teal} onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/security')} />
    {busy && !vehicle ? <View style={styles.center}><ActivityIndicator testID="vehicle-detail-loading" color={colors.teal} /></View> : error ? <View style={styles.center}>
      <Text testID="vehicle-detail-error" style={styles.error}>{error}</Text><NeonButton testID="vehicle-detail-retry" label="Retry" onPress={load} />
    </View> : vehicle ? <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.teal} />}>
      <GlassCard style={styles.fields}>
        <View style={styles.heading}><VehicleIcon testID="vehicle-detail-type-icon" vehicle={vehicle} size={32} /><Text testID="vehicle-detail-plate" style={styles.title}>{vehicle.number_plate}</Text></View>
        <Detail label="Vehicle type" value={vehicle.vehicle_type} id="type" />
        <Detail label="Make & model" value={vehicle.make_model} id="model" />
        <Detail label="Vehicle colour" value={vehicle.color} id="color" />
        <Detail label="Speed limit" value={vehicle.speed_limit_kmh === null ? null : `${vehicle.speed_limit_kmh} km/h`} id="speed" />
        <Detail label="Lost mode" value={vehicle.lost_mode ? 'Active' : 'Off'} id="lost" />
        <Text style={styles.label} testID="vehicle-tags-title">Tags</Text>
        {tags.length ? <TagChips testID="vehicle-detail-tags" tags={tags} /> : <Text testID="vehicle-tags-empty" style={styles.help}>No vehicle tags supplied by your server. Guardian tags remain in the Tags tab.</Text>}
      </GlassCard>
      <NeonButton testID="vehicle-edit-button" label="Edit vehicle" icon="edit-2" variant="ghost" color={colors.teal} onPress={() => router.push({ pathname: '/vehicle-form', params: { id: vehicle.id } })} />
      <GlassCard style={styles.fields}>
        <Text testID="vehicle-qr-title" style={styles.title}>Vehicle Smart QR</Text>
        {busy ? <ActivityIndicator testID="vehicle-qr-loading" color={colors.teal} /> : qrOk ? <><VerifiedQr url={scanUrl(vehicle.qr_id)} testID="vehicle-detail-qr" /><NeonButton testID="vehicle-view-qr" label="View & share QR" icon="maximize" onPress={openQr} /></> : <>
          <Text testID="vehicle-qr-error" style={styles.error}>{qrError}</Text><NeonButton testID="vehicle-qr-retry" label="Retry QR verification" variant="ghost" onPress={load} />
        </>}
        <NeonButton testID="vehicle-scan-qr" label="Scan QR code" icon="camera" variant="ghost" onPress={() => router.push('/scan')} />
      </GlassCard>
      <NeonButton testID="vehicle-detail-family" label="Family members" icon="users" variant="ghost" color={colors.purple} onPress={() => router.push({ pathname: '/vehicle-contacts', params: { vehicleId: vehicle.id, plate: vehicle.number_plate } })} />
    </ScrollView> : null}
  </View>;
}
function Detail({ label, value, id }: { label: string; value: string | null; id: string }) {
  return <View style={styles.fields}><Text testID={`vehicle-detail-${id}-label`} style={styles.label}>{label}</Text><Text testID={`vehicle-detail-${id}`} style={styles.value}>{value || 'Not provided'}</Text></View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg }, center: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  scroll: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl }, fields: { gap: spacing.md },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, title: { flexShrink: 1, color: colors.text, fontFamily: fonts.displaySemi, fontSize: 24 },
  label: { color: colors.textDim, fontSize: 14 }, value: { color: colors.text, fontSize: 16 },
  help: { color: colors.textDim, fontSize: 14, lineHeight: 20 }, error: { color: colors.red, fontSize: 15, lineHeight: 22 },
});