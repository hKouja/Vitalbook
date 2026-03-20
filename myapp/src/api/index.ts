// auto target the same host the frontend is running on
// this can help with the issue I had at campus eduroam wifi

const envBase = (import.meta as any)?.env?.VITE_API_BASE as string | undefined;

export const API_BASE =
  (envBase && envBase.trim().length > 0)
    ? envBase.trim().replace(/\/+$/, "")
    : `http://${window.location.hostname}:4000`;
