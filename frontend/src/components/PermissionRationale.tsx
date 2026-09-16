import { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { permissionCopy, PermissionExplanation, setPermissionPresenter } from '@/src/services/permissions';
import { GlassCard } from './GlassCard';
import { NeonButton } from './NeonButton';
import { colors, fonts, spacing } from '@/src/theme';

export function PermissionRationale() {
  const [request, setRequest] = useState<PermissionExplanation | null>(null);
  const active = useRef<PermissionExplanation | null>(null);
  const finish = (allowed: boolean) => {
    active.current?.resolve(allowed); active.current = null; setRequest(null);
  };
  useEffect(() => {
    setPermissionPresenter(next => { active.current?.resolve(false); active.current = next; setRequest(next); });
    return () => { active.current?.resolve(false); setPermissionPresenter(null); };
  }, []);
  if (!request) return null;
  const copy = permissionCopy[request.reason];
  return <Modal testID="permission-rationale-modal" transparent animationType="fade" visible onRequestClose={() => finish(false)}>
    <View style={styles.backdrop}><GlassCard style={styles.card}>
      <Text testID="permission-rationale-title" style={styles.title}>{copy.title}</Text>
      <Text testID="permission-rationale-message" style={styles.message}>{copy.message}</Text>
      <NeonButton testID="permission-rationale-continue" label="Continue" onPress={() => finish(true)} />
      <NeonButton testID="permission-rationale-cancel" label="Not now" variant="ghost" onPress={() => finish(false)} />
    </GlassCard></View>
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.glass },
  card: { gap: spacing.lg }, title: { fontFamily: fonts.displaySemi, fontSize: 22, color: colors.text },
  message: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.textMuted },
});