import { Linking, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export type PermissionReason = 'location' | 'background-location' | 'notifications' | 'microphone';
export interface PermissionExplanation { reason: PermissionReason; resolve: (allowed: boolean) => void }
let presenter: ((request: PermissionExplanation) => void) | null = null;
export const setPermissionPresenter = (fn: typeof presenter) => { presenter = fn; };
export const explainPermission = (reason: PermissionReason): Promise<boolean> =>
  new Promise(resolve => { if (presenter) presenter({ reason, resolve }); else resolve(false); });
export const supportsNativePush = () => Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
export async function openAppSettings(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try { await Linking.openSettings(); return true; } catch { return false; }
}
export const permissionCopy: Record<PermissionReason, { title: string; message: string }> = {
  location: { title: 'Share your location?', message: 'NekSathi uses your location for the safety feature you selected. You can continue without granting access and enable it later.' },
  'background-location': { title: 'Keep Guardian sharing?', message: 'Guardian shares your position with family while the app is closed. On the next screen, choose “Allow all the time”. You can turn Guardian off in Safety.' },
  notifications: { title: 'Receive safety notifications?', message: 'Allow notifications to receive family and QR incident alerts on this phone. Denying permission will not prevent you from using the app.' },
  microphone: { title: 'Use your microphone?', message: 'Your microphone is used only for the voice call you accept. It is released when the call ends.' },
};