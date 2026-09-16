import type { ConfigContext, ExpoConfig } from 'expo/config';

// Preserve app.json and the build system's project metadata. Never generate an EAS ID here.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'NekSathi',
  slug: config.slug ?? 'frontend',
  extra: {
    ...config.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL,
    webUrl: process.env.EXPO_PUBLIC_WEB_URL,
  },
});