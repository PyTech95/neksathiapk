import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { addVehicle, getVehicle, listVehicles, updateVehicle } from '@/src/api/endpoints';
import type { Vehicle } from '@/src/api/types';
import { errMessage } from '@/src/api/client';
import { loadVehicleRules, optionLabel, VehicleRules } from '@/src/api/vehicleMetadata';
import { canonicalPlate, plateError, plateInput, speedError } from '@/src/utils/vehicles';
import { Field } from '@/src/components/Field';
import { NeonButton } from '@/src/components/NeonButton';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { SearchSelect } from '@/src/components/SearchSelect';
import { GlassCard } from '@/src/components/GlassCard';
import { useToast } from '@/src/context/ToastContext';
import { colors, fonts, spacing } from '@/src/theme';

export default function VehicleForm() {
  const { id: param } = useLocalSearchParams<{ id?: string }>(), id = typeof param === 'string' ? param : '';
  const router = useRouter(), toast = useToast();
  const [rules, setRules] = useState<VehicleRules | null>(null), [original, setOriginal] = useState<Vehicle | null>(null);
  const [plate, setPlate] = useState(''), [type, setType] = useState(''), [model, setModel] = useState('');
  const [color, setColor] = useState(''), [speed, setSpeed] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(''), [error, setError] = useState(''), [registrationError, setRegistrationError] = useState('');
  const lock = useRef(false), hydrated = useRef(false), mounted = useRef(true), savedId = useRef('');
  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const [r, vehicle] = await Promise.all([loadVehicleRules(true), id ? getVehicle(id) : Promise.resolve(null)]);
      if (!mounted.current) return;
      setRules(r); setOriginal(vehicle);
      if (!hydrated.current) {
        setPlate(vehicle?.number_plate ?? ''); setType(vehicle?.vehicle_type ?? ''); setModel(vehicle?.make_model ?? '');
        setColor(vehicle?.color ?? ''); setSpeed(String(vehicle?.speed_limit_kmh ?? r.speedDefault ?? ''));
        hydrated.current = true;
      }
    } catch (e) { if (mounted.current) setLoadError(errMessage(e)); }
    finally { if (mounted.current) setLoading(false); }
  }, [id]);
  useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; }; }, [load]);

  const save = async () => {
    if (!rules || lock.current) return;
    const validation = plateError(plate) || (!rules.vehicleTypes.includes(type) ? 'Select a vehicle type from the server list.' : null) || speedError(speed, rules);
    if (validation) { setError(validation); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      const number_plate = canonicalPlate(plate);
      const vehicles = await listVehicles(); // also reconciles a previously timed-out create before retry
      if (vehicles.some(v => v.id !== (id || savedId.current) && canonicalPlate(v.number_plate) === number_plate)) throw new Error('This registration is already in your garage. Open the existing vehicle to edit it.');
      const payload = { number_plate, vehicle_type: type, make_model: model.trim() || null, color: color.trim() || null,
        speed_limit_kmh: Number(speed.trim()), ...(original ? { photo_base64: original.photo_base64 ?? null } : {}) };
      const target = id || savedId.current;
      const saved = target ? await updateVehicle(target, payload) : await addVehicle(payload);
      savedId.current = saved.id;
      // Never generate/reassign qr_id on the client; backend links it to this record.
      if (mounted.current) {
        toast(id ? 'Vehicle updated' : 'Vehicle added with its Smart QR', 'success');
        router.replace({ pathname: '/vehicle-detail', params: { id: saved.id } });
      }
    } catch (e) { if (mounted.current) setError(errMessage(e)); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  return <View style={styles.root} testID="vehicle-form-screen">
    <ScreenHeader title={id ? 'Edit vehicle' : 'Add vehicle'} subtitle="Synced with your website garage" accent={colors.teal} onBack={() => { if (!busy) router.back(); }} />
    {loading ? <View style={styles.center}><ActivityIndicator testID="vehicle-form-loading" color={colors.teal} /></View> : loadError ? <View style={styles.center}>
      <Text testID="vehicle-form-load-error" style={styles.error}>{loadError}</Text><NeonButton testID="vehicle-form-retry" label="Retry" onPress={load} />
    </View> : <KeyboardAwareScrollView testID="vehicle-form-scroll" contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bottomOffset={24}>
      <GlassCard style={styles.fields}>
        <Field testID="vehicle-plate-input" label="REGISTRATION NUMBER" placeholder="HR26AB1234" value={plate} onChangeText={v => { setPlate(plateInput(v)); setRegistrationError(''); }} onBlur={() => { setPlate(v => v.trim()); if (plate) setRegistrationError(plateError(plate) || ''); }} autoCapitalize="characters" autoCorrect={false} editable={!busy} />
        {!!registrationError && <Text testID="vehicle-plate-error" accessibilityRole="alert" style={styles.error}>{registrationError}</Text>}
        <Text testID="vehicle-plate-help" style={styles.help}>English letters and numbers. Spaces are removed when saved.</Text>
        <SearchSelect testID="vehicle-type-select" label="Vehicle type" value={type} options={(rules?.vehicleTypes ?? []).map(v => ({ id: v, label: optionLabel(v) }))} onChange={setType} disabled={busy} />
        <Field testID="vehicle-model-input" label="MAKE & MODEL" placeholder="Enter make and model" value={model} onChangeText={setModel} editable={!busy} />
        <Text testID="vehicle-model-help" style={styles.help}>Uses the website’s combined Make & model field. Your current server does not provide separate make/model lists.</Text>
        <Field testID="vehicle-color-input" label="VEHICLE COLOUR" placeholder="Enter colour" value={color} onChangeText={setColor} editable={!busy} />
        <Field testID="vehicle-speed-input" label="SPEED LIMIT (km/h)" placeholder="Enter speed limit" value={speed} onChangeText={setSpeed} keyboardType="number-pad" editable={!busy} />
        <Text testID="vehicle-speed-rules" style={styles.help}>{rules?.speedMin !== undefined && rules?.speedMax !== undefined ? `Allowed by your server: ${rules.speedMin}–${rules.speedMax} km/h.` : 'Enter a valid whole-number speed in km/h.'}</Text>
      </GlassCard>
      {!!error && <Text testID="vehicle-form-error" accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <NeonButton testID="vehicle-save-button" label={id ? 'Save changes' : 'Add vehicle'} icon="check" color={colors.teal} onPress={save} loading={busy} />
    </KeyboardAwareScrollView>}
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg }, center: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.xl },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.xl }, fields: { gap: spacing.lg },
  help: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textDim }, error: { fontSize: 15, lineHeight: 22, color: colors.red },
});