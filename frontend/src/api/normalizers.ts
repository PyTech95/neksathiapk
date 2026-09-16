import type { User } from './types';

export const text = (v: unknown, fallback = ''): string => typeof v === 'string' ? v : fallback;
export const record = (v: unknown): Record<string, any> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : {};
export function rows<T>(data: unknown): T[] {
  const obj = record(data);
  const list = Array.isArray(data) ? data : [obj.items, obj.results, obj.data].find(Array.isArray) ?? [];
  const seen = new Set<string>();
  return list.filter((item: unknown) => {
    const row = record(item), id = text(row.id || row.call_id);
    if (!id || seen.has(id)) return false;
    seen.add(id); return true;
  });
}
export function normalizeUser(value: unknown): User {
  const u = record(value), prefs = record(u.notify_prefs);
  if (!text(u.id)) throw new Error('The server returned an incomplete account. Please retry.');
  return { ...u, id: u.id, name: text(u.name), email: text(u.email), phone: text(u.phone),
    notify_prefs: { ...prefs, whatsapp: prefs.whatsapp === true, email: prefs.email === true,
      push: prefs.push === true, incident_alerts: prefs.incident_alerts === true,
      speed_alerts: prefs.speed_alerts === true, marketing: prefs.marketing === true, ringtone: text(prefs.ringtone) },
  } as User;
}