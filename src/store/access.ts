import type { AppState, Utilisateur } from "@/lib/types";
import { creerEtatVide } from "@/lib/initial";

const adminOnly = new Set([
  "creerCompteParAdmin",
  "supprimerCompte",
  "basculerStatutCompte",
  "reinitialiserMotDePasse",
  "rouvrirRapport",
  "confirmerPaiement",
  "refuserPaiement",
  "annulerPaiement",
  "enregistrerPaiementRecu",
  "ajouterParoisse",
  "basculerAbonnement",
  "modifierReglage",
  "modifierDoyenne",
  "ajouterTheme",
  "basculerTheme",
  "enregistrerCommunique",
  "archiverCommunique",
  "retirerDonneesExemple",
]);
const allowed = new Set([
  ...adminOnly,
  "changerMotDePasse",
  "changerPhotoProfil",
  "validerCompte",
  "refuserCompte",
  "retirerCompte",
  "ajouterJeune",
  "modifierJeune",
  "supprimerJeune",
  "deciderPassation",
  "assurerRapport",
  "majRapport",
  "majFiche",
  "definirPresence",
  "validerAppel",
  "envoyerRapport",
  "declarerPaiement",
  "marquerNotification",
  "toutMarquerLu",
  "lireCommunique",
]);

// Check every command before it reaches the shared domain, not just the visible buttons.
export function autoriserAction(
  s: AppState,
  action: string,
  args: unknown[],
): boolean {
  const user = s.utilisateurs.find(
    (u) => u.id === s.currentUserId && u.statut === "actif",
  );
  if (!user || !allowed.has(action)) return false;
  if (adminOnly.has(action)) return user.role === "responsable";
  if (["changerMotDePasse", "changerPhotoProfil"].includes(action))
    return args[0] === user.id;
  if (["toutMarquerLu", "lireCommunique"].includes(action)) return true;
  if (action === "marquerNotification")
    return s.notifications.some(
      (n) => n.id === args[0] && n.userId === user.id,
    );
  if (["validerCompte", "refuserCompte", "retirerCompte"].includes(action)) {
    const target = s.utilisateurs.find((u) => u.id === args[0]);
    return (
      !!target &&
      target.role !== "responsable" &&
      (user.role === "responsable" ||
        (user.role === "membre" && target.role === "charge") ||
        (user.role === "charge" &&
          target.paroisseId === user.paroisseId &&
          ["adjoint", "cp"].includes(target.role)))
    );
  }
  if (!user.paroisseId || !["charge", "adjoint", "cp"].includes(user.role))
    return false;
  if (["ajouterJeune", "declarerPaiement"].includes(action))
    return (args[0] as { paroisseId?: string })?.paroisseId === user.paroisseId;
  if (["modifierJeune", "supprimerJeune", "deciderPassation"].includes(action))
    return s.jeunes.some(
      (j) => j.id === args[0] && j.paroisseId === user.paroisseId,
    );
  if (action === "assurerRapport") return args[0] === user.paroisseId;
  const rapport = s.rapports.find((r) => r.id === args[0]);
  if (
    !rapport ||
    rapport.paroisseId !== user.paroisseId ||
    rapport.statut === "envoye"
  )
    return false;
  if (action === "definirPresence")
    return (
      typeof args[2] === "boolean" &&
      s.jeunes.some((j) => j.id === args[1] && j.paroisseId === user.paroisseId)
    );
  return true;
}

export function etatVisible(s: AppState, uid: string | null): AppState {
  const user = s.utilisateurs.find((u) => u.id === uid && u.statut === "actif");
  const configured = s.utilisateurs.some((u) => u.role === "responsable");
  if (!user)
    return {
      ...creerEtatVide(),
      installationComplete: configured,
      doyenne: s.doyenne,
    };
  const dean = ["responsable", "membre"].includes(user.role);
  const own = (r: { paroisseId: string | null }) =>
    dean || r.paroisseId === user.paroisseId;
  const rapports = s.rapports.filter(own);
  const clean = (u: Utilisateur): Utilisateur => ({
    ...u,
    motDePasse: "",
    motDePasseInitial: undefined,
    motDePasseInitialEnClair: undefined,
  });
  return {
    ...s,
    currentUserId: uid,
    installationComplete: configured,
    utilisateurs: s.utilisateurs
      .filter(
        (u) =>
          dean ||
          u.id === uid ||
          (user.paroisseId && u.paroisseId === user.paroisseId),
      )
      .map(clean),
    paroisses: s.paroisses.filter((p) => dean || p.id === user.paroisseId),
    jeunes: s.jeunes.filter(own),
    rapports,
    abonnements: s.abonnements.filter(own),
    paiements: s.paiements.filter(own),
    passations: s.passations.filter(own),
    presences: s.presences.filter((p) =>
      rapports.some((r) => r.id === p.rapportId),
    ),
    notifications: s.notifications.filter((n) => n.userId === uid),
    journal: user.role === "responsable" ? s.journal : [],
    apparences: {},
    communiques: s.communiques
      .filter((c) => user.role === "responsable" || c.statut === "publie")
      .map((c) => ({
        ...c,
        lusPar:
          user.role === "responsable"
            ? c.lusPar
            : c.lusPar.filter((id) => id === uid),
      })),
  };
}
