import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { ToastProvider } from '@/src/context/ToastContext';
import { LiveOverlays } from '@/src/components/LiveOverlays';
import { PermissionRationale } from '@/src/components/PermissionRationale';
import { NotificationBridge } from '@/src/components/NotificationBridge';
import { AppErrorBoundary } from '@/src/components/AppErrorBoundary';
import { StartupState } from '@/src/components/StartupState';
import { useIconFonts } from '@/src/hooks/use-icon-fonts';
import '@/src/services/backgroundLocation';
import { colors } from '@/src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <StartupState error="NekSathi couldn’t open this screen. Please retry." onRetry={retry} />;
}
function Navigation() {
  const { user, bootstrapping, startupError, retryStartup } = useAuth();
  const ready = !bootstrapping && !startupError;
  return <>
    <StatusBar style="light" />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={ready && !user}><Stack.Screen name="(auth)" /></Stack.Protected>
      <Stack.Screen name="scan" /><Stack.Screen name="scan-report" />
      <Stack.Protected guard={ready && !!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="qr-detail" options={{ presentation: 'modal' }} />
        <Stack.Screen name="vehicle-detail" /><Stack.Screen name="vehicle-form" />
        <Stack.Screen name="permissions" />
        <Stack.Screen name="alert-detail" /><Stack.Screen name="alerts-inbox" /><Stack.Screen name="alerts" />
        <Stack.Screen name="check-in" /><Stack.Screen name="contacts" /><Stack.Screen name="decoy" />
        <Stack.Screen name="guardian-schedule" /><Stack.Screen name="incident-detail" /><Stack.Screen name="incidents-inbox" />
        <Stack.Screen name="receipts" /><Stack.Screen name="safe-zones" /><Stack.Screen name="scan-history" />
        <Stack.Screen name="sos-events" /><Stack.Screen name="vehicle-contacts" />
      </Stack.Protected>
    </Stack>
    {bootstrapping || startupError ? <View style={styles.startupOverlay} testID="startup-gate"><StartupState error={startupError} onRetry={retryStartup} /></View> : null}
    {ready && user ? <AppErrorBoundary><LiveOverlays key={user.id} /></AppErrorBoundary> : null}
    <NotificationBridge />
    <PermissionRationale />
  </>;
}
export default function RootLayout() {
  const [iconsLoaded, iconsError] = useIconFonts();
  const [fontsLoaded, fontsError] = useFonts({
    'ChakraPetch-Bold': require('../assets/fonts/ChakraPetch-Bold.ttf'),
    'ChakraPetch-SemiBold': require('../assets/fonts/ChakraPetch-SemiBold.ttf'),
    'ChakraPetch-Medium': require('../assets/fonts/ChakraPetch-Medium.ttf'),
    Outfit: require('../assets/fonts/Outfit-Variable.ttf'),
  });
  // The JS loading screen paints immediately; no network-dependent invisible splash.
  useEffect(() => { SplashScreen.hideAsync().catch(() => {}); }, []);
  if ((!iconsLoaded && !iconsError) || (!fontsLoaded && !fontsError)) return <StartupState />;
  return <GestureHandlerRootView style={styles.root}><AppErrorBoundary><KeyboardProvider>
    <SafeAreaProvider><ToastProvider><AuthProvider><Navigation /></AuthProvider></ToastProvider></SafeAreaProvider>
  </KeyboardProvider></AppErrorBoundary></GestureHandlerRootView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg }, startupOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, elevation: 100 } });