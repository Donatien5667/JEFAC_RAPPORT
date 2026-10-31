import type { AppState } from "./types";

export function creerEtatVide(): AppState {
  return {
    version: 4,
    modeDonnees: "reel",
    installationComplete: false,
    doyenne: { id: "doyenne", nom: "Mon doyenné", ville: "Kinshasa" },
    reglage: {
      prixMensuel: 6000,
      prixAnnuel: 60000,
      joursGrace: 7,
      numeroPaiement: "0853993269",
      titulaire: "Liomba Donatien",
      operateur: "",
    },
    paroisses: [],
    utilisateurs: [],
    jeunes: [],
    themes: [],
    rapports: [],
    presences: [],
    passations: [],
    abonnements: [],
    paiements: [],
    notifications: [],
    journal: [],
    communiques: [],
    apparences: {},
    currentUserId: null,
  };
}

// Preserve existing records during upgrades; demo removal always requires confirmation.
export function migrerEtat(etat: AppState): AppState {
  return {
    ...creerEtatVide(),
    ...etat,
    version: 4,
    modeDonnees: etat.modeDonnees ?? "exemple",
    installationComplete: etat.utilisateurs.some(
      (u) => u.role === "responsable",
    ),
    utilisateurs: etat.utilisateurs.map((u) => ({
      ...u,
      motDePasseInitialEnClair: undefined,
    })),
    communiques: etat.communiques ?? [],
    apparences: Object.fromEntries(
      etat.utilisateurs.map((u) => [u.id, { mode: "clair", couleur: "rouge" }]),
    ),
  };
}
