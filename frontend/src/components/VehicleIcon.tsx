import { MaterialCommunityIcons } from '@expo/vector-icons';
import { vehicleIconName } from '@/src/utils/vehicles';
import { colors } from '@/src/theme';

export function VehicleIcon({ vehicle, testID, color = colors.teal, size = 24 }: { vehicle: unknown; testID: string; color?: string; size?: number }) {
  const name = vehicleIconName(vehicle);
  return <MaterialCommunityIcons testID={testID} accessibilityLabel={`${name} vehicle`} name={name} color={color} size={size} />;
}