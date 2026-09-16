import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra;
const cleanUrl = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return '';
    return value.trim().replace(/\/+$/, '');
  } catch { return ''; }
};

// Keep the established external API setting; backendUrl supports workspace installations.
export const apiOrigin = cleanUrl(extra?.apiUrl || extra?.backendUrl);
export const apiBaseUrl = apiOrigin ? `${apiOrigin.replace(/\/api$/, '')}/api` : '';
export const webOrigin = cleanUrl(extra?.webUrl);
export const configurationError = apiBaseUrl ? null : 'The app’s server address is missing or invalid. Please install a correctly configured build.';