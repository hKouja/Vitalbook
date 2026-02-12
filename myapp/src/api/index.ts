export const API_BASE = import.meta.env.VITE_API_BASE as string;

if (!API_BASE) {
  throw new Error("VITE_API_BASE is missing. Check myapp/.env and restart Vite.");
}
