import axios from 'axios';
import { apiOrigin, configurationError } from './config';
import { record, text } from './normalizers';

export interface VehicleRules {
  vehicleTypes: string[];
  tagTypes: string[];
  speedMin?: number;
  speedMax?: number;
  speedDefault?: number;
  plateMaxLength?: number;
}
let pending: Promise<VehicleRules> | null = null;
const numeric = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : undefined;
const enumeration = (v: unknown): string[] => Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && !!x))] : [];

// The production website uses free-text make_model/color, enum type and numeric speed.
// Read its published FastAPI schema; never manufacture a catalog or copy website defaults.
export function loadVehicleRules(refresh = false): Promise<VehicleRules> {
  if (!pending || refresh) {
    pending = (async () => {
      if (configurationError) throw new Error(configurationError);
      const { data } = await axios.get(`${apiOrigin.replace(/\/api$/, '')}/openapi.json`, { timeout: 15000 });
      const schemas = record(record(record(data).components).schemas);
      const v = record(record(schemas.VehicleIn).properties), t = record(record(schemas.TagIn).properties);
      const speed = record(v.speed_limit_kmh);
      const result = {
        vehicleTypes: enumeration(record(v.vehicle_type).enum), tagTypes: enumeration(record(t.tag_type).enum),
        speedMin: numeric(speed.minimum), speedMax: numeric(speed.maximum), speedDefault: numeric(speed.default),
        plateMaxLength: numeric(record(v.number_plate).maxLength),
      };
      if (!result.vehicleTypes.length || !result.tagTypes.length) throw new Error('Vehicle options are unavailable from the server. Please retry.');
      return result;
    })().catch(error => { pending = null; throw error; });
  }
  return pending;
}
export const optionLabel = (value: string) => text(value).replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());