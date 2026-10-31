// JEFAC Rapports — modèle de données (application mobile PWA)

export type Role = "responsable" | "membre" | "charge" | "adjoint" | "cp";
export type StatutCompte = "en_attente" | "actif" | "refuse" | "retire";
export type Tranche = "CADETS" | "JUNIORS" | "JFC" | "GRANDS";
export type StatutRapport = "brouillon" | "envoye";
export type StatutPaiement = "en_attente" | "confirme" | "refuse" | "annule";
export type ModePaiement = "mobile_money" | "main_propre";
export type TypeAbonnement = "mensuel" | "annuel";
export type EtatAbo = "GRATUIT" | "ACTIF" | "GRACE" | "EXPIRE" | "SANS";
export type Couleur = "rouge" | "bleu";
export type ModeTheme = "clair";

export const ROLES: {
  id: Role;
  label: string;
  short: string;
  description: string;
}[] = [
  {
    id: "responsable",
    label: "Responsable du doyenné",
    short: "Responsable",
    description:
      "Accès complet : comptes, paroisses, paiements, thèmes, tarifs, communiqués et statuts d'abonnement.",
  },
  {
    id: "membre",
    label: "Membre du doyenné",
    short: "Membre",
    description:
      "Voit les rapports, les paroisses et les échéances ; valide les chargés paroissiaux.",
  },
  {
    id: "charge",
    label: "Chargé de formation paroissial",
    short: "Chargé",
    description:
      "Remplit et envoie le rapport, gère les jeunes, la passation et l'équipe de sa paroisse.",
  },
  {
    id: "adjoint",
    label: "Adjoint",
    short: "Adjoint",
    description: "Remplace le chargé pour le rapport et les jeunes.",
  },
  {
    id: "cp",
    label: "Chargé de la paroisse",
    short: "Chargé paroisse",
    description: "Même accès que l'adjoint.",
  },
];

export const TRANCHES: {
  id: Tranche;
  label: string;
  ages: string;
  min: number;
  max: number;
}[] = [
  { id: "CADETS", label: "Cadets", ages: "6 – 9 ans", min: 6, max: 9 },
  { id: "JUNIORS", label: "Juniors", ages: "10 – 13 ans", min: 10, max: 13 },
  { id: "JFC", label: "JFC", ages: "14 – 20 ans", min: 14, max: 20 },
  {
    id: "GRANDS",
    label: "Grands jeunes",
    ages: "21 – 30 ans",
    min: 21,
    max: 30,
  },
];

export const COULEURS: { id: Couleur; label: string; clair: string }[] = [
  { id: "rouge", label: "Rouge JEFAC", clair: "#BF0C0C" },
  { id: "bleu", label: "Bleu des palmes", clair: "#167F98" },
];

export interface Doyenne {
  id: string;
  nom: string;
  ville: string;
}

export interface Paroisse {
  id: string;
  nom: string;
  doyenneId: string;
  adresse?: string;
  accesGratuit: boolean;
  /** Statut manuel fixé par le responsable du doyenné, si présent. */
  abonnementForce?: "actif" | "inactif";
  creeLe: string;
}

export interface Utilisateur {
  id: string;
  telephone: string;
  nom: string;
  role: Role;
  paroisseId: string | null;
  statut: StatutCompte;
  motDePasse: string;
  /** Hash du mot de passe initial remis par l'administration : il reste valable en cas d'oubli. */
  motDePasseInitial?: string;
  motDePasseInitialEnClair?: string;
  creeParAdmin?: boolean;
  creePar?: string | null;
  derniereConnexion?: string | null;
  photo?: string | null;
  validateurId?: string | null;
  dateValidation?: string | null;
  motifRefus?: string | null;
  doitChangerMdp?: boolean;
  creeLe: string;
}

export interface Jeune {
  id: string;
  paroisseId: string;
  prenom: string;
  nom: string;
  sexe: "M" | "F";
  dateNaissance: string;
  tranche: Tranche;
  telParent?: string;
  telJeune?: string;
  photo?: string;
  creeLe: string;
  note?: string;
}

export interface ThemePropose {
  id: string;
  tranche: Tranche;
  libelle: string;
  datePrevue?: string | null;
  proposePar: string;
  creeLe: string;
  retire: boolean;
}

export interface Presence {
  id: string;
  rapportId: string;
  jeuneId: string;
  tranche: Tranche;
  present: boolean;
}

export interface Passation {
  id: string;
  jeuneId: string;
  paroisseId: string;
  decision: "passe" | "maintenu";
  trancheDepart: Tranche;
  trancheArrivee: Tranche;
  decideur: string;
  date: string;
}

export interface FicheTranche {
  tranche: Tranche;
  appelFait: boolean;
  effectif?: number;
  formateur: string;
  themeId: string | null;
  themeAutre: string;
  resume: string;
  difficultes: string;
  suggestions: string;
  photo?: string | null;
}

export interface Rapport {
  id: string;
  paroisseId: string;
  dimanche: string;
  statut: StatutRapport;
  debut: string;
  fin: string;
  fiches: FicheTranche[];
  envoyeLe?: string | null;
  envoyePar?: string | null;
  rouvrePar?: string | null;
  rouvreLe?: string | null;
  creeLe: string;
  modifieLe: string;
}

export interface Abonnement {
  id: string;
  paroisseId: string;
  type: TypeAbonnement;
  debut: string;
  fin: string;
  activePar?: string | null;
}

export interface Paiement {
  id: string;
  paroisseId: string;
  type: TypeAbonnement;
  montant: number;
  reference: string;
  date: string;
  mode: ModePaiement;
  statut: StatutPaiement;
  motifRefus?: string | null;
  declarePar?: string | null;
  traitePar?: string | null;
  traiteLe?: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  titre: string;
  texte: string;
  type: string;
  lu: boolean;
  creeLe: string;
  communiqueId?: string;
}

export interface Communique {
  id: string;
  titre: string;
  contenu: string;
  categorie: "information" | "formation" | "important";
  statut: "brouillon" | "publie" | "archive";
  auteurId: string;
  auteurNom: string;
  creeLe: string;
  modifieLe: string;
  publieLe: string | null;
  lusPar: string[];
}

export interface JournalAction {
  id: string;
  action: string;
  element: string;
  utilisateur: string;
  date: string;
  details?: string;
}

export interface Reglage {
  prixMensuel: number;
  prixAnnuel: number;
  joursGrace: number;
  numeroPaiement: string;
  titulaire: string;
  operateur: string;
}

export interface Apparence {
  mode: ModeTheme;
  couleur: Couleur;
}

export interface AppState {
  version: number;
  modeDonnees?: "reel" | "exemple";
  installationComplete?: boolean;
  communiques: Communique[];
  doyenne: Doyenne;
  reglage: Reglage;
  paroisses: Paroisse[];
  utilisateurs: Utilisateur[];
  jeunes: Jeune[];
  themes: ThemePropose[];
  rapports: Rapport[];
  presences: Presence[];
  passations: Passation[];
  abonnements: Abonnement[];
  paiements: Paiement[];
  notifications: Notification[];
  journal: JournalAction[];
  apparences: Record<string, Apparence>;
  currentUserId: string | null;
}
