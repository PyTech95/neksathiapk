import { record, rows, text } from '@/src/api/normalizers';
import type { Vehicle, Tag } from '@/src/api/types';
import type { VehicleRules } from '@/src/api/vehicleMetadata';

export const plateInput = (value: string) => value.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
export const canonicalPlate = (value: string) => plateInput(value).replace(/\s/g, '');
export function plateError(value: string): string | null {
  const plate = canonicalPlate(value);
  // State/RTO, Delhi's longer series, and Bharat-series. Validation only on submit/blur.
  if (!/^(?:[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}|\d{2}BH\d{4}[A-Z]{1,2})$/.test(plate))
    return 'Enter a valid Indian registration, such as HR26AB1234 or DL 01 AB 1234.';
  return null;
}
export function speedError(value: string, rules: VehicleRules): string | null {
  if (!/^\d+$/.test(value.trim()) || !Number.isSafeInteger(Number(value))) return 'Enter a whole-number speed limit in km/h.';
  const speed = Number(value);
  if (rules.speedMin !== undefined && speed < rules.speedMin) return `Speed limit must be at least ${rules.speedMin} km/h.`;
  if (rules.speedMax !== undefined && speed > rules.speedMax) return `Speed limit must be no more than ${rules.speedMax} km/h.`;
  return null;
}
export function normalizeVehicle(value: unknown): Vehicle {
  const v = record(value);
  if (!text(v.id)) throw new Error('The server returned an incomplete vehicle. Please refresh.');
  return { ...v, id: v.id, number_plate: text(v.number_plate), vehicle_type: text(v.vehicle_type),
    make_model: text(v.make_model) || null, color: text(v.color) || null, qr_id: text(v.qr_id),
    speed_limit_kmh: typeof v.speed_limit_kmh === 'number' && Number.isFinite(v.speed_limit_kmh) ? v.speed_limit_kmh : null,
    lost_mode: v.lost_mode === true, created_at: text(v.created_at),
  } as Vehicle;
}
export function activeTag(value: unknown): boolean {
  const t = record(value);
  return t.deleted !== true && !t.deleted_at && t.active !== false && t.is_active !== false && !['deleted', 'inactive'].includes(text(t.status).toLowerCase());
}
export function vehicleTags(vehicle: Vehicle, all: Tag[]): Tag[] {
  const v = record(vehicle);
  const ids = Array.isArray(v.tag_ids) ? v.tag_ids : [];
  const embedded = rows<Tag>(v.tags);
  // Only explicit mappings; unrelated guardian tags must never be assigned to a vehicle.
  return rows<Tag>([...embedded, ...all.filter(t => ids.includes(t.id) || t.vehicle_id === vehicle.id || t.vehicle_ids?.includes(vehicle.id))]).filter(activeTag);
}
export const vehicleIconName = (value: unknown): 'car' | 'motorbike' | 'tractor' | 'truck' | 'shape-outline' => {
  const v = record(value);
  // Use the backend enum/code (not the display label); unknown IDs get a neutral icon.
  const type = text(v.vehicle_type_code || v.vehicle_type_id || v.vehicle_type).toLowerCase().replace(/[\s_-]/g, '');
  if (['bike', 'motorcycle', 'motorbike', 'scooter', 'twowheeler', '2wheeler'].includes(type)) return 'motorbike';
  if (type === 'car') return 'car';
  if (type === 'tractor') return 'tractor';
  if (['commercial', 'truck', 'bus'].includes(type)) return 'truck';
  return 'shape-outline';
};