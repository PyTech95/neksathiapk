import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/src/theme';

export function StartupState({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  return <View testID={error ? 'startup-error-screen' : 'boot-splash'} style={styles.root}>
    <Text testID="startup-brand" style={styles.brand}>Nek<Text style={styles.accent}>Sathi</Text></Text>
    <Text testID="startup-message" accessibilityRole={error ? 'alert' : 'text'} style={styles.message}>
      {error || 'Getting your safety companion ready…'}
    </Text>
    {error ? <Pressable testID="startup-retry-button" accessibilityRole="button" onPress={onRetry} style={styles.button}>
      <Text style={styles.label}>Retry</Text>
    </Pressable> : <ActivityIndicator testID="startup-loading" color={colors.teal} />}
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.xl },
  brand: { color: colors.text, fontWeight: '700', fontSize: 34 }, accent: { color: colors.teal },
  message: { color: colors.textMuted, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  button: { minHeight: 48, paddingHorizontal: 32, justifyContent: 'center', borderRadius: 24, backgroundColor: colors.teal },
  label: { color: colors.bg, fontWeight: '700', fontSize: 16 },
});