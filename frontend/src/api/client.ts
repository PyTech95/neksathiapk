import { create, isAxiosError } from 'axios';

import { storage } from "@/src/utils/storage";
import { apiBaseUrl, configurationError } from './config';
import { diagnostic } from '@/src/utils/diagnostics';

export const TOKEN_KEY = "neksathi_token";

const baseURL = apiBaseUrl;

export const api = create({
  baseURL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

// Registered by AuthContext so the interceptor can force a logout on 401.
let onUnauthorized: ((token: string) => void) | null = null;
let sessionToken: string | null | undefined;
export const setClientToken = (token: string | null) => { sessionToken = token; };
export const isUsableToken = (token: unknown): token is string =>
  typeof token === 'string' && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
export const setUnauthorizedHandler = (fn: ((token: string) => void) | null) => {
  onUnauthorized = fn;
};

api.interceptors.request.use(async (config) => {
  if (configurationError) throw new Error(configurationError);
  const publicRequest = /^\/(?:public\/|auth\/(?:login|register|otp\/|forgot-password|reset-password))/.test(config.url ?? '');
  const token = publicRequest ? null : sessionToken === undefined ? await storage.secureGet(TOKEN_KEY, "") : sessionToken;
  if (isUsableToken(token)) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const sent = error?.config?.headers?.Authorization;
    if (error?.response?.status === 401 && typeof sent === 'string') {
      const token = sent.replace(/^Bearer /, '');
      if (token === sessionToken) onUnauthorized?.(token);
    }
    diagnostic('api-request-failed', error?.response?.status);
    return Promise.reject(error);
  },
);

// Normalise an axios error into a short human message.
export const errMessage = (e: unknown, fallback = "Something went wrong"): string => {
  const anyE = e as any;
  if (e instanceof Error && !isAxiosError(e)) return e.message || fallback;
  if (anyE?.code === "ECONNABORTED") return "The server is taking too long to respond. Please try again.";
  // No response object => network error / server unreachable.
  if (!anyE?.response) return "Can't reach the server. Please check your connection and try again shortly.";
  const status = anyE.response.status;
  const detail = anyE.response.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  if (status === 404 || status === 405) return "Service is temporarily unavailable. Please try again shortly.";
  if (status >= 500) return "The server ran into a problem. Please try again shortly.";
  if (anyE?.message) return anyE.message;
  return fallback;
};
