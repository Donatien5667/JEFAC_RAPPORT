import { useSyncExternalStore } from "react";

export type ConnectionInfo = {
  mode: "chargement" | "local" | "serveur" | "erreur";
  message: string;
  pending: number;
};
let info: ConnectionInfo = {
  mode: "chargement",
  message: "Connexion…",
  pending: 0,
};
const listeners = new Set<() => void>();
export function setConnection(patch: Partial<ConnectionInfo>) {
  info = { ...info, ...patch };
  listeners.forEach((fn) => fn());
}
export function getConnection() {
  return info;
}
export function useConnection() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => info,
  );
}

const env = (import.meta as ImportMeta & { env: Record<string, string> }).env;
export const API_BASE = (env.VITE_API_URL || "").replace(/\/$/, "");
export const API_CONFIGURED = !!env.VITE_API_URL;
