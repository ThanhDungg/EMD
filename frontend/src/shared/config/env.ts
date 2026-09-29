// Centralized env config cho frontend (Vite yêu cầu prefix VITE_)
// Segment: shared/config — infrastructure, không chứa business logic
export const env = {
  appName: import.meta.env.VITE_APP_NAME ?? 'EMD Frontend',
  appEnv: import.meta.env.VITE_APP_ENV ?? 'development',
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  port: Number(import.meta.env.VITE_PORT ?? 5173),
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;

export type Env = typeof env;
