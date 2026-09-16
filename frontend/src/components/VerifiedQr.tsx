import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, spacing } from '@/src/theme';

export function VerifiedQr({ url, testID }: { url: string; testID: string }) {
  const { width } = useWindowDimensions(), [failed, setFailed] = useState(false);
  if (!url || failed) return <Text testID={`${testID}-error`} style={styles.error}>The QR link is unavailable. Please retry or contact support.</Text>;
  return <View testID={testID} style={styles.center}><View style={styles.qr}>
    <QRCode value={url} size={Math.min(220, width - 112)} backgroundColor="#ffffff" color="#000000" onError={() => setFailed(true)} />
  </View></View>;
}
const styles = StyleSheet.create({ center: { alignItems: 'center' }, qr: { padding: spacing.md, borderRadius: spacing.md, backgroundColor: '#ffffff' }, error: { color: colors.red, fontSize: 14 } });