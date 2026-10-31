import {
  TRANCHES,
  type Abonnement,
  type AppState,
  type EtatAbo,
  type Jeune,
  type Notification,
  type Paiement,
  type Paroisse,
  type Presence,
  type Rapport,
  type Tranche,
  type Utilisateur,
} from "@/lib/types";
import {
  addDays,
  age,
  aujourdhui,
  fromISODate,
  joursEntre,
  toISODate,
  trancheInfo,
  tranchePourAge,
} from "@/lib/utils";

export const userCourant = (s: AppState): Utilisateur | null =>
  s.utilisateurs.find((u) => u.id === s.currentUserId) ?? null;

export const estDoyenne = (u: Utilisateur | null): boolean =>
  !!u && (u.role === "responsable" || u.role === "membre");

export const estResponsable = (u: Utilisateur | null): boolean =>
  !!u && u.role === "responsable";

export const peutGererJeunes = (u: Utilisateur | null): boolean =>
  !!u && (u.role === "charge" || u.role === "adjoint" || u.role === "cp");

export const nomParoisse = (s: AppState, id?: string | null): string =>
  s.paroisses.find((p) => p.id === id)?.nom ?? "Paroisse";

export const nomUtilisateur = (s: AppState, id?: string | null): string =>
  s.utilisateurs.find((u) => u.id === id)?.nom ?? "—";

export const paroissesVisibles = (
  s: AppState,
  u: Utilisateur | null,
): Paroisse[] =>
  estDoyenne(u)
    ? s.paroisses
    : s.paroisses.filter((p) => p.id === u?.paroisseId);

export const paroisseDe = (
  s: AppState,
  u: Utilisateur | null,
): Paroisse | undefined => s.paroisses.find((p) => p.id === u?.paroisseId);

export const jeunesDe = (s: AppState, paroisseId?: string | null): Jeune[] =>
  s.jeunes
    .filter((j) => j.paroisseId === paroisseId)
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

export const jeunesTranche = (
  s: AppState,
  paroisseId: string | null,
  tranche: Tranche,
): Jeune[] => jeunesDe(s, paroisseId).filter((j) => j.tranche === tranche);

export const effectifTranche = (
  s: AppState,
  paroisseId: string | null,
  tranche: Tranche,
): number => jeunesTranche(s, paroisseId, tranche).length;

/* ---------------- Abonnements ---------------- */

export function abonnementsDe(s: AppState, paroisseId: string): Abonnement[] {
  return s.abonnements
    .filter((a) => a.paroisseId === paroisseId)
    .sort((a, b) => (a.fin < b.fin ? 1 : -1));
}

export function abonnementCourant(
  s: AppState,
  paroisseId: string,
): Abonnement | null {
  return abonnementsDe(s, paroisseId)[0] ?? null;
}

export function etatAbonnement(s: AppState, paroisseId: string): EtatAbo {
  const p = s.paroisses.find((x) => x.id === paroisseId);
  if (!p) return "SANS";
  if (p.abonnementForce === "inactif") return "SANS";
  if (p.abonnementForce === "actif") return "ACTIF";
  if (p.accesGratuit) return "GRATUIT";
  const abos = abonnementsDe(s, paroisseId);
  if (!abos.length) return "SANS";
  const auj = aujourdhui();
  if (abos.some((a) => a.fin >= auj)) return "ACTIF";
  const dernier = abos[0];
  const limite = toISODate(
    addDays(fromISODate(dernier.fin), s.reglage.joursGrace),
  );
  return auj <= limite ? "GRACE" : "EXPIRE";
}

export const LIBELLE_ETAT: Record<EtatAbo, string> = {
  GRATUIT: "Abonnement actif",
  ACTIF: "Abonnement actif",
  GRACE: "Délai de grâce",
  EXPIRE: "Expiré",
  SANS: "Abonnement inactif",
};

export const peutEnvoyer = (s: AppState, paroisseId: string): boolean => {
  const e = etatAbonnement(s, paroisseId);
  return e === "GRATUIT" || e === "ACTIF" || e === "GRACE";
};

export function joursAvantEcheance(
  s: AppState,
  paroisseId: string,
): number | null {
  const abo = abonnementCourant(s, paroisseId);
  if (!abo) return null;
  return joursEntre(aujourdhui(), abo.fin);
}

export function rappelAbonnement(
  s: AppState,
  paroisseId: string,
): string | null {
  const etat = etatAbonnement(s, paroisseId);
  const p = s.paroisses.find((x) => x.id === paroisseId);
  if (!p || p.accesGratuit) return null;
  if (etat === "SANS")
    return "Aucun abonnement actif : l’envoi du rapport est bloqué. Contactez le doyenné.";
  if (etat === "EXPIRE")
    return "Abonnement expiré : l’envoi est bloqué, vos données sont conservées.";
  if (etat === "GRACE") {
    const j = joursAvantEcheance(s, paroisseId);
    return `Délai de grâce en cours (fin d’abonnement ${j ?? 0} jour(s) de grâce restants).`;
  }
  const j = joursAvantEcheance(s, paroisseId);
  if (j !== null && j <= 7)
    return `Votre abonnement se termine dans ${j} jour(s).`;
  return null;
}

/* ---------------- Rapports ---------------- */

export const rapportDe = (
  s: AppState,
  paroisseId: string,
  dimanche: string,
): Rapport | undefined =>
  s.rapports.find(
    (r) => r.paroisseId === paroisseId && r.dimanche === dimanche,
  );

export function rapportsDeParoisse(s: AppState, paroisseId: string): Rapport[] {
  return s.rapports
    .filter((r) => r.paroisseId === paroisseId)
    .sort((a, b) => (a.dimanche < b.dimanche ? 1 : -1));
}

export const rapportsEnvoyes = (s: AppState, dimanche: string): Rapport[] =>
  s.rapports.filter((r) => r.dimanche === dimanche && r.statut === "envoye");

export function estEnRetard(_s: AppState, rapport: Rapport): boolean {
  if (rapport.statut === "envoye") return false;
  const lundi = addDays(fromISODate(rapport.dimanche), 1);
  lundi.setHours(12, 0, 0, 0);
  return new Date() > lundi;
}

export function estRappelDimanche(): boolean {
  const now = new Date();
  return now.getDay() === 0 && now.getHours() >= 18;
}

export function presencesRapport(s: AppState, rapportId: string): Presence[] {
  return s.presences.filter((p) => p.rapportId === rapportId);
}

export function presenceDe(
  s: AppState,
  rapportId: string,
  jeuneId: string,
): Presence | undefined {
  return s.presences.find(
    (p) => p.rapportId === rapportId && p.jeuneId === jeuneId,
  );
}

/** Liste de ce qui manque pour pouvoir envoyer le rapport. */
export function manquesRapport(s: AppState, rapport: Rapport): string[] {
  const manquants: string[] = [];
  if (!rapport.debut?.trim()) manquants.push("Heure de début de la séance");
  if (!rapport.fin?.trim()) manquants.push("Heure de fin de la séance");
  for (const f of rapport.fiches) {
    const info = trancheInfo(f.tranche);
    const effectif = effectifTranche(s, rapport.paroisseId, f.tranche);
    if (!f.formateur?.trim()) manquants.push(`${info.label} : formateur`);
    if (!f.themeId && !f.themeAutre?.trim())
      manquants.push(`${info.label} : thème traité`);
    if (!f.resume?.trim())
      manquants.push(`${info.label} : résumé de la séance`);
    if (effectif > 0 && !f.appelFait)
      manquants.push(`${info.label} : appel validé`);
  }
  return manquants;
}

export function ficheStats(s: AppState, rapport: Rapport, tranche: Tranche) {
  const pres = presencesRapport(s, rapport.id).filter(
    (p) => p.tranche === tranche,
  );
  const presents = pres.filter((p) => p.present).length;
  return {
    tranche,
    inscrits: pres.length,
    presents,
    absents: pres.length - presents,
  };
}

export function statsRapport(s: AppState, rapport: Rapport) {
  const lignes = TRANCHES.map((t) => ficheStats(s, rapport, t.id));
  const inscrits = lignes.reduce((a, l) => a + l.inscrits, 0);
  const presents = lignes.reduce((a, l) => a + l.presents, 0);
  return {
    lignes,
    inscrits,
    presents,
    absents: inscrits - presents,
    assiduite: inscrits ? Math.round((presents / inscrits) * 100) : 0,
  };
}

/* ---------------- Passation ---------------- */

export interface SuggestionPassation {
  jeune: Jeune;
  age: number;
  type: "passer" | "sortir" | "corriger";
  trancheCible: Tranche | null;
  message: string;
}

export function suggestionsPassation(
  s: AppState,
  paroisseId: string,
): SuggestionPassation[] {
  const out: SuggestionPassation[] = [];
  for (const jeune of jeunesDe(s, paroisseId)) {
    const a = age(jeune.dateNaissance);
    const { tranche, alerte } = tranchePourAge(a);
    const maintenu = s.passations
      .filter((p) => p.jeuneId === jeune.id && p.decision === "maintenu")
      .sort((x, y) => (x.date < y.date ? 1 : -1))[0];
    if (maintenu && Math.abs(joursEntre(maintenu.date, aujourdhui())) < 180)
      continue;

    if (alerte === "trop_jeune") {
      out.push({
        jeune,
        age: a,
        type: "corriger",
        trancheCible: null,
        message: "Moins de 6 ans : vérifiez la date de naissance de la fiche.",
      });
      continue;
    }
    if (alerte === "trop_vieux") {
      out.push({
        jeune,
        age: a,
        type: "sortir",
        trancheCible: null,
        message: "Au-delà de 30 ans : proposition de sortie de la liste.",
      });
      continue;
    }
    if (tranche && tranche !== jeune.tranche) {
      const info = trancheInfo(tranche);
      out.push({
        jeune,
        age: a,
        type: "passer",
        trancheCible: tranche,
        message: `${a} ans : propose la tranche ${info.label} (${info.ages}).`,
      });
    }
  }
  return out;
}

export function passationsDe(s: AppState, jeuneId: string) {
  return s.passations
    .filter((p) => p.jeuneId === jeuneId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* ---------------- Doyenné ---------------- */

export const comptesAValider = (s: AppState): Utilisateur[] =>
  s.utilisateurs.filter((u) => u.statut === "en_attente");

export const paiementsAConfirmer = (s: AppState): Paiement[] =>
  s.paiements.filter((p) => p.statut === "en_attente");

export function paroissesEnRetard(s: AppState, dimanche: string): Paroisse[] {
  const limite = addDays(fromISODate(dimanche), 1);
  limite.setHours(12, 0, 0, 0);
  if (Date.now() < limite.getTime()) return [];
  return s.paroisses.filter((p) => {
    if (p.creeLe.slice(0, 10) > dimanche) return false;
    const r = rapportDe(s, p.id, dimanche);
    if (!r) return true;
    return estEnRetard(s, r);
  });
}

export interface StatsJour {
  dimanche: string;
  recus: number;
  total: number;
  presents: number;
  absents: number;
  assiduite: number;
  retards: number;
}

export function statsJour(s: AppState, dimanche: string): StatsJour {
  const total = s.paroisses.length;
  const envoyes = rapportsEnvoyes(s, dimanche);
  let presents = 0;
  let absents = 0;
  for (const r of envoyes) {
    const st = statsRapport(s, r);
    presents += st.presents;
    absents += st.absents;
  }
  const inscrits = presents + absents;
  return {
    dimanche,
    recus: envoyes.length,
    total,
    presents,
    absents,
    assiduite: inscrits ? Math.round((presents / inscrits) * 100) : 0,
    retards: paroissesEnRetard(s, dimanche).length,
  };
}

export function serie8Dimanches(s: AppState): StatsJour[] {
  const out: StatsJour[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = addDays(new Date(), 0);
    const jour = d.getDay();
    d.setDate(d.getDate() - jour - i * 7);
    out.push(statsJour(s, toISODate(d)));
  }
  return out;
}

/* ---------------- Notifications ---------------- */

export const notificationsDe = (s: AppState, userId: string): Notification[] =>
  s.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => (a.creeLe < b.creeLe ? 1 : -1));

export const nonLues = (s: AppState, userId: string): number =>
  notificationsDe(s, userId).filter((n) => !n.lu).length;

export function rappelRecent(
  s: AppState,
  userId: string,
  type: string,
): boolean {
  const ilYA3j = new Date(Date.now() - 3 * 86400000).toISOString();
  return s.notifications.some(
    (n) => n.userId === userId && n.type === type && n.creeLe >= ilYA3j,
  );
}
