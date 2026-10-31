import { useSyncExternalStore } from "react";
import type { AppState } from "@/lib/types";
import { creerEtatVide, migrerEtat } from "@/lib/initial";
import { chargerEtat, sauverEtat } from "@/db/database";
import {
  API_BASE,
  API_CONFIGURED,
  getConnection,
  setConnection,
} from "@/db/connection";
import {
  creerDomaine,
  type ActionsMetier,
  type ResultatAction,
} from "./domain";
import { autoriserAction, etatVisible } from "./access";

export type { ResultatAction } from "./domain";
type Response = ResultatAction & {
  state?: AppState;
  doitChangerMdp?: boolean;
  motDePasseInitial?: boolean;
};
let state = creerEtatVide();
let confirmedState = state;
let sequence = 0;
const optimistic = new Map<number, { action: string; args: unknown[] }>();
let localState = creerEtatVide();
let shared = false;
let ready: Promise<void> | null = null;
let queue: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();
const channel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("jefac-updates")
    : null;

function publish(next: AppState) {
  confirmedState = next;
  state = next;
  for (const { action, args } of optimistic.values()) {
    if (action === "majRapport")
      state = {
        ...state,
        rapports: state.rapports.map((r) =>
          r.id === args[0] ? { ...r, ...(args[1] as object) } : r,
        ),
      };
    if (action === "majFiche")
      state = {
        ...state,
        rapports: state.rapports.map((r) =>
          r.id === args[0]
            ? {
                ...r,
                fiches: r.fiches.map((f) =>
                  f.tranche === args[1] ? { ...f, ...(args[2] as object) } : f,
                ),
              }
            : r,
        ),
      };
  }
  listeners.forEach((fn) => fn());
}
export function getState() {
  return state;
}
export function useAppState() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    getState,
    getState,
  );
}

async function request(path: string, data?: unknown): Promise<Response> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: data === undefined ? "GET" : "POST",
    credentials: "include",
    cache: "no-store",
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error("Serveur partagé indisponible.");
  const result = (await response.json()) as Response;
  if (response.status === 401)
    publish({ ...creerEtatVide(), installationComplete: true });
  if (response.status >= 500)
    throw new Error(
      "Le serveur ne répond pas. Votre saisie n'a pas été envoyée.",
    );
  return result;
}

export function initialiserBase(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    try {
      const response = await fetch(`${API_BASE}/api/health`, {
        signal: AbortSignal.timeout(3500),
        credentials: "include",
        cache: "no-store",
      });
      const health = response.headers
        .get("content-type")
        ?.includes("application/json")
        ? await response.json()
        : null;
      if (health?.service !== "jefac") throw new Error("no-api");
      shared = true;
      localStorage.setItem("jefac-server-connected", "1");
      const result = await request("/api/state");
      if (!result.state)
        throw new Error("Impossible de lire les données partagées.");
      publish(result.state);
      setConnection({ mode: "serveur", message: "Base partagée connectée" });
      setInterval(() => {
        if (
          document.visibilityState === "visible" &&
          getConnection().pending === 0
        )
          void actualiser();
      }, 12000);
      window.addEventListener("focus", () => {
        if (getConnection().pending === 0) void actualiser();
      });
    } catch {
      if (
        API_CONFIGURED ||
        localStorage.getItem("jefac-server-connected") === "1"
      ) {
        setConnection({
          mode: "erreur",
          message: "Serveur inaccessible. Réessayez sans effacer vos données.",
        });
        return;
      }
      try {
        const stored = await chargerEtat();
        localState = stored ? migrerEtat(stored) : creerEtatVide();
        localState.currentUserId = sessionStorage.getItem("jefac-user");
        publish(etatVisible(localState, localState.currentUserId));
        setConnection({
          mode: "local",
          message: "Sur cet appareil uniquement",
        });
      } catch {
        setConnection({
          mode: "erreur",
          message:
            "Le stockage local ne peut pas être lu. Ne l'effacez pas ; contactez l'assistance pour préserver vos données.",
        });
      }
    }
  })();
  return ready;
}

export async function actualiser() {
  if (!shared) return;
  try {
    const result = await request("/api/state");
    if (result.state && getConnection().pending === 0) publish(result.state);
    setConnection({ mode: "serveur", message: "Base partagée connectée" });
  } catch {
    setConnection({
      message: "Connexion interrompue. Réessayez avant de quitter.",
    });
  }
}

async function run(
  action: keyof ActionsMetier,
  args: unknown[],
): Promise<Response> {
  try {
    if (shared) {
      let result: Response;
      if (action === "connexion")
        result = await request("/api/login", {
          telephone: args[0],
          mdp: args[1],
          admin: args[2],
        });
      else if (action === "configurerInstallation")
        result = await request("/api/setup", args[0]);
      else if (action === "deconnexion")
        result = await request("/api/logout", {});
      else result = await request("/api/action", { action, args });
      if (result.state) publish(result.state);
      return result;
    }
    if (
      !["connexion", "deconnexion", "configurerInstallation"].includes(
        action,
      ) &&
      !autoriserAction(localState, action, args)
    )
      return { ok: false, message: "Vous n'avez pas accès à cette action." };
    // Reload the latest local revision so tabs do not overwrite each other's publications.
    const stored = await chargerEtat();
    if (stored)
      localState = {
        ...migrerEtat(stored),
        currentUserId: localState.currentUserId,
      };
    if (
      !["connexion", "deconnexion", "configurerInstallation"].includes(
        action,
      ) &&
      !autoriserAction(localState, action, args)
    )
      return {
        ok: false,
        message: "Votre accès à cette action n'est plus disponible.",
      };
    const domain = creerDomaine(localState);
    const fn = (
      domain.actions as unknown as Record<
        string,
        (...values: unknown[]) => unknown
      >
    )[action];
    const raw = fn(...args) as Response | undefined;
    const result =
      raw && "ok" in raw ? raw : { ok: true, message: "Enregistré." };
    if (!result.ok) return result;
    const next = domain.getState();
    await sauverEtat({ ...next, currentUserId: null });
    localState = next;
    if (next.currentUserId)
      sessionStorage.setItem("jefac-user", next.currentUserId);
    else sessionStorage.removeItem("jefac-user");
    publish(etatVisible(next, next.currentUserId));
    channel?.postMessage("updated");
    return result;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Enregistrement impossible. Réessayez.";
    window.dispatchEvent(new CustomEvent("jefac-error", { detail: message }));
    return { ok: false, message };
  }
}

type ClientActions = {
  [K in keyof ActionsMetier]: (
    ...args: Parameters<ActionsMetier[K]>
  ) => Promise<Response>;
};
export const actions = new Proxy({} as ClientActions, {
  get(_target, action: keyof ActionsMetier) {
    return (...args: unknown[]) => {
      const commandId = ++sequence;
      if (["majRapport", "majFiche"].includes(action)) {
        optimistic.set(commandId, { action, args });
        publish(confirmedState);
      }
      setConnection({ pending: getConnection().pending + 1 });
      const task = queue.then(() => run(action, args));
      queue = task.catch(() => undefined);
      return task.finally(() => {
        optimistic.delete(commandId);
        publish(confirmedState);
        setConnection({ pending: Math.max(0, getConnection().pending - 1) });
      });
    };
  },
});

if (channel)
  channel.onmessage = async () => {
    if (shared || getConnection().pending > 0) return;
    const stored = await chargerEtat();
    if (stored) {
      localState = {
        ...migrerEtat(stored),
        currentUserId: sessionStorage.getItem("jefac-user"),
      };
      publish(etatVisible(localState, localState.currentUserId));
    }
  };

export async function sauvegarderDonnees() {
  if (shared) {
    const res = await fetch(`${API_BASE}/api/backup`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Sauvegarde refusée.");
    download(
      await res.blob(),
      `jefac-${new Date().toISOString().slice(0, 10)}.sqlite`,
    );
  } else {
    download(
      new Blob(
        [JSON.stringify({ ...localState, currentUserId: null }, null, 2)],
        { type: "application/json" },
      ),
      `jefac-${new Date().toISOString().slice(0, 10)}.json`,
    );
  }
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
