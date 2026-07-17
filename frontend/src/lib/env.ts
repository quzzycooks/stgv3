export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:3000",
  wsUrl: (import.meta.env.VITE_WS_URL as string | undefined) ?? "http://localhost:3000",
  mapboxToken: import.meta.env.VITE_MAPBOX_TOKEN as string | undefined,
  isDev: import.meta.env.DEV,
};
