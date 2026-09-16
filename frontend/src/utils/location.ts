import * as Battery from "expo-battery";
import * as Location from "expo-location";
import { explainPermission } from '@/src/services/permissions';

export interface Coords {
  latitude: number;
  longitude: number;
}

export interface LocationResult {
  coords?: Coords;
  error?: string;
  blocked?: boolean; // permanently denied — offer Open Settings
}

// Contextual foreground-location request with full permission-state handling.
export async function requestLocation(interactive = true): Promise<LocationResult> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    let status = current.status;
    let canAskAgain = current.canAskAgain;

    if (status !== Location.PermissionStatus.GRANTED) {
      if (!canAskAgain) return { error: 'Location is disabled. Enable it in Android Settings.', blocked: true };
      if (!interactive || !(await explainPermission('location'))) return { error: 'Location was not shared. You can enable it when needed.' };
      const req = await Location.requestForegroundPermissionsAsync();
      status = req.status;
      canAskAgain = req.canAskAgain;
    }

    if (status !== Location.PermissionStatus.GRANTED) {
      return { error: "Location permission is needed to share your position.", blocked: !canAskAgain };
    }

    if (!(await Location.hasServicesEnabledAsync())) return { error: 'Turn on Location services on your device, then retry.' };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 15000); }),
    ]).finally(() => { if (timer) clearTimeout(timer); });
    return { coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } };
  } catch {
    return { error: "Could not get your current location." };
  }
}

export async function getBatteryPercent(): Promise<number | undefined> {
  try {
    const level = await Battery.getBatteryLevelAsync();
    if (level < 0) return undefined;
    return Math.round(level * 100);
  } catch {
    return undefined;
  }
}
