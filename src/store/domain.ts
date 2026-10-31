import {
  TRANCHES,
  type AppState,
  type FicheTranche,
  type JournalAction,
  type Notification,
  type Rapport,
  type Role,
  type StatutRapport,
  type Tranche,
  type TypeAbonnement,
  type Utilisateur,
} from "@/lib/types";
import {
  ajouterMois,
  aujourdhui,
  hashMdp as hashLocal,
  id,
  motDePasseTemporaire as genererLocal,
  normaliserTel,
  verifierMdp as verifierLocal,
} from "@/lib/utils";
import { etatAbonnement, manquesRapport } from "./selectors";
import { creerEtatVide } from "@/lib/initial";

export interface ResultatAction {
  ok: boolean;
  message: string;
  extra?: Record<string, unknown>;
}

export function creerDomaine(
  initial: AppState,
  options: {
    hash?: (password: string) => string;
    verify?: (password: string, hash: string) => boolean;
    generate?: () => string;
    onChange?: (state: AppState) => void;
  } = {},
) {
  let state = initial;
  const hashMdp = options.hash ?? hashLocal;
  const verifierMdp = options.verify ?? verifierLocal;
  const motDePasseTemporaire = options.generate ?? genererLocal;
  function maj(fn: (s: AppState) => AppState) {
    state = fn(state);
    options.onChange?.(state);
  }

  function journaliser(
    s: AppState,
    action: string,
    element: string,
    utilisateur: string,
    details?: string,
  ): JournalAction[] {
    return [
      {
        id: id("jrn"),
        action,
        element,
        utilisateur,
        date: new Date().toISOString(),
        details,
      },
      ...s.journal,
    ].slice(0, 200);
  }

  function notifier(
    s: AppState,
    userIds: string[],
    titre: string,
    texte: string,
    type: string,
  ): Notification[] {
    const maintenant = new Date().toISOString();
    const nouveaux = userIds.filter(Boolean).map((userId) => ({
      id: id("n"),
      userId,
      titre,
      texte,
      type,
      lu: false,
      creeLe: maintenant,
    }));
    return [...nouveaux, ...s.notifications];
  }

  const doyenneIds = (s: AppState) =>
    s.utilisateurs
      .filter((u) => u.role === "responsable" || u.role === "membre")
      .map((u) => u.id);

  const paroissiens = (s: AppState, paroisseId: string) =>
    s.utilisateurs
      .filter((u) => u.paroisseId === paroisseId && u.statut === "actif")
      .map((u) => u.id);

  function activerAbonnement(
    s: AppState,
    paroisseId: string,
    type: TypeAbonnement,
    parId: string,
  ): AppState["abonnements"] {
    const auj = aujourdhui();
    const courant = s.abonnements
      .filter((a) => a.paroisseId === paroisseId && a.fin >= auj)
      .sort((a, b) => (a.fin < b.fin ? 1 : -1))[0];
    const debut = courant ? courant.fin : auj;
    const fin =
      type === "annuel" ? ajouterMois(debut, 12) : ajouterMois(debut, 1);
    return [
      ...s.abonnements,
      { id: id("ab"), paroisseId, type, debut, fin, activePar: parId },
    ];
  }

  function ficheVide(tranche: Tranche): FicheTranche {
    return {
      tranche,
      appelFait: false,
      formateur: "",
      themeId: null,
      themeAutre: "",
      resume: "",
      difficultes: "",
      suggestions: "",
      photo: null,
    };
  }

  /* ---------------- actions ---------------- */

  const actions = {
    configurerInstallation(data: {
      nom: string;
      telephone: string;
      mdp: string;
      doyenne: string;
      paroisse: string;
      cleInstallation?: string;
    }): ResultatAction {
      if (
        state.installationComplete ||
        state.utilisateurs.some((u) => u.role === "responsable")
      )
        return { ok: false, message: "L'administration est déjà configurée." };
      const telephone = normaliserTel(data.telephone);
      if (!data.nom.trim() || !data.doyenne.trim() || !data.paroisse.trim())
        return {
          ok: false,
          message:
            "Renseignez votre nom, le doyenné et votre première paroisse.",
        };
      if (telephone.length !== 9 || data.mdp.length < 8)
        return {
          ok: false,
          message:
            "Utilisez un numéro valide et un mot de passe de 8 caractères minimum.",
        };
      const uid = id("usr");
      const pid = id("par");
      const date = new Date().toISOString();
      maj((s) => ({
        ...s,
        installationComplete: true,
        modeDonnees: "reel",
        currentUserId: uid,
        doyenne: { ...s.doyenne, nom: data.doyenne.trim() },
        paroisses: [
          {
            id: pid,
            nom: data.paroisse.trim(),
            doyenneId: s.doyenne.id,
            accesGratuit: true,
            creeLe: date,
          },
        ],
        utilisateurs: [
          {
            id: uid,
            nom: data.nom.trim(),
            telephone,
            motDePasse: hashMdp(data.mdp),
            role: "responsable",
            paroisseId: null,
            statut: "actif",
            creeLe: date,
          },
        ],
        journal: journaliser(
          s,
          "Installation configurée",
          data.doyenne.trim(),
          data.nom.trim(),
        ),
      }));
      return {
        ok: true,
        message:
          "Votre espace est prêt. Vous pouvez saisir vos propres données.",
        extra: { id: uid, role: "responsable" },
      };
    },

    enregistrerCommunique(data: {
      id?: string;
      titre: string;
      contenu: string;
      categorie: AppState["communiques"][number]["categorie"];
      publier: boolean;
    }): ResultatAction {
      const user = state.utilisateurs.find((u) => u.id === state.currentUserId);
      if (user?.role !== "responsable")
        return {
          ok: false,
          message: "Publication réservée à l'administration.",
        };
      if (!data.titre.trim() || !data.contenu.trim())
        return {
          ok: false,
          message: "Ajoutez un titre et le texte du communiqué.",
        };
      if (data.titre.length > 120 || data.contenu.length > 6000)
        return {
          ok: false,
          message:
            "Maximum : 120 caractères pour le titre et 6 000 pour le texte.",
        };
      const existing = data.id
        ? state.communiques.find((c) => c.id === data.id)
        : undefined;
      if (data.id && !existing)
        return { ok: false, message: "Ce communiqué n'existe plus." };
      const cid = existing?.id ?? id("com");
      const now = new Date().toISOString();
      const publication = {
        id: cid,
        titre: data.titre.trim(),
        contenu: data.contenu.trim(),
        categorie: data.categorie,
        statut: data.publier ? ("publie" as const) : ("brouillon" as const),
        auteurId: user.id,
        auteurNom: user.nom,
        creeLe: existing?.creeLe ?? now,
        modifieLe: now,
        publieLe: data.publier ? (existing?.publieLe ?? now) : null,
        lusPar: data.publier ? [user.id] : [],
      };
      const receivers = state.utilisateurs.filter(
        (u) => u.statut === "actif" && u.id !== user.id,
      );
      maj((s) => ({
        ...s,
        communiques: [
          publication,
          ...s.communiques.filter((c) => c.id !== cid),
        ],
        notifications: [
          ...(data.publier
            ? receivers.map((u) => ({
                id: id("n"),
                userId: u.id,
                titre: "Nouveau communiqué",
                texte: data.titre.trim(),
                type: "communique",
                communiqueId: cid,
                lu: false,
                creeLe: now,
              }))
            : []),
          ...s.notifications.filter((n) => n.communiqueId !== cid),
        ],
        journal: journaliser(
          s,
          data.publier ? "Communiqué publié" : "Brouillon enregistré",
          data.titre.trim(),
          user.nom,
        ),
      }));
      return {
        ok: true,
        message: data.publier
          ? "Communiqué publié pour tous les utilisateurs."
          : "Brouillon enregistré. Il n'est visible que par vous.",
        extra: { id: cid },
      };
    },

    archiverCommunique(communiqueId: string): ResultatAction {
      const user = state.utilisateurs.find((u) => u.id === state.currentUserId);
      if (user?.role !== "responsable")
        return { ok: false, message: "Action réservée à l'administration." };
      const c = state.communiques.find((x) => x.id === communiqueId);
      if (!c) return { ok: false, message: "Communiqué introuvable." };
      maj((s) => ({
        ...s,
        communiques: s.communiques.map((x) =>
          x.id === communiqueId
            ? { ...x, statut: "archive", modifieLe: new Date().toISOString() }
            : x,
        ),
        notifications: s.notifications.filter(
          (n) => n.communiqueId !== communiqueId,
        ),
        journal: journaliser(s, "Communiqué archivé", c.titre, user.nom),
      }));
      return {
        ok: true,
        message:
          "Communiqué archivé. Il n'est plus visible par les utilisateurs.",
      };
    },

    lireCommunique(communiqueId: string): ResultatAction {
      const uid = state.currentUserId;
      if (!uid)
        return {
          ok: false,
          message: "Connectez-vous pour consulter les communiqués.",
        };
      maj((s) => ({
        ...s,
        communiques: s.communiques.map((c) =>
          c.id === communiqueId &&
          c.statut === "publie" &&
          !c.lusPar.includes(uid)
            ? { ...c, lusPar: [...c.lusPar, uid] }
            : c,
        ),
        notifications: s.notifications.map((n) =>
          n.userId === uid && n.communiqueId === communiqueId
            ? { ...n, lu: true }
            : n,
        ),
      }));
      return { ok: true, message: "Communiqué marqué comme lu." };
    },

    modifierDoyenne(nom: string): ResultatAction {
      if (!nom.trim())
        return { ok: false, message: "Le nom du doyenné est obligatoire." };
      maj((s) => ({ ...s, doyenne: { ...s.doyenne, nom: nom.trim() } }));
      return { ok: true, message: "Doyenné mis à jour." };
    },

    retirerDonneesExemple(confirmation: string): ResultatAction {
      const admin = state.utilisateurs.find(
        (u) => u.id === state.currentUserId,
      );
      if (
        admin?.role !== "responsable" ||
        state.modeDonnees !== "exemple" ||
        confirmation !== "RECOMMENCER"
      )
        return {
          ok: false,
          message: "Confirmez explicitement le retrait des données d'exemple.",
        };
      maj(() => ({
        ...creerEtatVide(),
        installationComplete: true,
        utilisateurs: [admin],
        currentUserId: admin.id,
      }));
      return {
        ok: true,
        message: "Espace vidé. Votre compte administrateur a été conservé.",
      };
    },

    /* ---------- Compte ---------- */

    connexion(
      telephone: string,
      mdp: string,
      admin = false,
    ): ResultatAction & {
      doitChangerMdp?: boolean;
      motDePasseInitial?: boolean;
    } {
      const tel = normaliserTel(telephone);
      const u = state.utilisateurs.find(
        (x) => normaliserTel(x.telephone) === tel,
      );
      if (!u)
        return {
          ok: false,
          message:
            "Identifiants incorrects. Votre compte doit avoir été créé par l'administration.",
        };
      if (u.statut === "en_attente")
        return {
          ok: false,
          message:
            "Votre compte attend encore la validation du responsable du doyenné.",
        };
      if (u.statut === "refuse")
        return {
          ok: false,
          message:
            "Votre demande d'accès a été refusée. Vous pouvez la redemander.",
        };
      if (u.statut === "retire")
        return {
          ok: false,
          message:
            "Votre compte a été retiré par le doyenné. Vous pouvez redemander l'accès.",
        };
      if (admin && u.role !== "responsable")
        return {
          ok: false,
          message: "Cet espace est réservé au responsable du doyenné.",
        };
      const okActuel = verifierMdp(mdp, u.motDePasse);
      const okInitial =
        !okActuel &&
        !!u.motDePasseInitial &&
        verifierMdp(mdp, u.motDePasseInitial);
      if (!okActuel && !okInitial)
        return { ok: false, message: "Mot de passe incorrect." };
      maj((s) => ({
        ...s,
        currentUserId: u.id,
        utilisateurs: s.utilisateurs.map((x) =>
          x.id === u.id
            ? { ...x, derniereConnexion: new Date().toISOString() }
            : x,
        ),
      }));
      return {
        ok: true,
        message: okInitial
          ? "Connexion avec le mot de passe initial. Vous pouvez le changer dans Compte."
          : "Bienvenue.",
        doitChangerMdp: !!u.doitChangerMdp,
        motDePasseInitial: okInitial,
        extra: { id: u.id, role: u.role, nom: u.nom },
      };
    },

    deconnexion() {
      maj((s) => ({ ...s, currentUserId: null }));
    },

    changerMotDePasse(
      userId: string,
      ancien: string,
      nouveau: string,
    ): ResultatAction {
      const u = state.utilisateurs.find((x) => x.id === userId);
      if (!u) return { ok: false, message: "Compte introuvable." };
      if (
        !verifierMdp(ancien, u.motDePasse) &&
        !(u.motDePasseInitial && verifierMdp(ancien, u.motDePasseInitial))
      )
        return { ok: false, message: "L'ancien mot de passe est incorrect." };
      if ((nouveau ?? "").length < 8)
        return {
          ok: false,
          message: "Le mot de passe doit contenir au moins 8 caractères.",
        };
      maj((s) => ({
        ...s,
        utilisateurs: s.utilisateurs.map((x) =>
          x.id === userId
            ? {
                ...x,
                motDePasse: hashMdp(nouveau),
                doitChangerMdp: false,
                motDePasseInitial: x.motDePasseInitial ?? x.motDePasse,
              }
            : x,
        ),
      }));

      return {
        ok: true,
        message:
          "Mot de passe mis à jour. Le mot de passe initial reste valable en cas d'oubli.",
      };
    },

    /* ---------- Administration : création et gestion des comptes ---------- */

    creerCompteParAdmin(data: {
      nom: string;
      telephone: string;
      role: Role;
      paroisseId: string | null;
    }): ResultatAction {
      const tel = normaliserTel(data.telephone);
      if (tel.length < 9)
        return {
          ok: false,
          message: "Le numéro de téléphone est obligatoire (9 chiffres).",
        };
      if (!data.nom.trim())
        return { ok: false, message: "Le nom du compte est obligatoire." };
      if (state.utilisateurs.some((x) => normaliserTel(x.telephone) === tel))
        return {
          ok: false,
          message: "Ce numéro est déjà attribué à un compte.",
        };
      if (
        data.role !== "responsable" &&
        data.role !== "membre" &&
        !data.paroisseId
      )
        return { ok: false, message: "Choisissez la paroisse du compte." };
      if (data.paroisseId) {
        const deja = state.utilisateurs.filter(
          (x) =>
            x.paroisseId === data.paroisseId &&
            x.role === data.role &&
            x.statut !== "retire",
        ).length;
        if (deja >= 1)
          return {
            ok: false,
            message: "Cette fonction est déjà pourvue dans cette paroisse.",
          };
      }
      if (data.role === "responsable" || data.role === "membre") {
        const nb = state.utilisateurs.filter(
          (x) =>
            (x.role === "responsable" || x.role === "membre") &&
            x.statut !== "retire",
        ).length;
        if (nb >= 3)
          return {
            ok: false,
            message:
              "Le doyenné compte au maximum 3 comptes : 1 responsable et 2 membres.",
          };
      }
      const initial = motDePasseTemporaire();
      const admin = state.utilisateurs.find(
        (x) => x.id === state.currentUserId,
      );
      const nouveau: Utilisateur = {
        id: id("usr"),
        telephone: tel,
        nom: data.nom.trim(),
        role: data.role,
        paroisseId: data.paroisseId,
        statut: "actif",
        motDePasse: hashMdp(initial),
        motDePasseInitial: hashMdp(initial),

        creeParAdmin: true,
        creePar: admin?.id ?? null,
        creeLe: new Date().toISOString(),
        validateurId: admin?.id ?? null,
        dateValidation: new Date().toISOString(),
      };
      maj((s) => ({
        ...s,
        utilisateurs: [...s.utilisateurs, nouveau],
        notifications: notifier(
          s,
          [nouveau.id],
          "Votre compte est prêt",
          `Votre compte a été créé par ${admin?.nom ?? "l'administration"}. Bienvenue dans JEFAC Rapports.`,
          "compte",
        ),
        journal: journaliser(
          s,
          "Compte créé par l'administration",
          `${nouveau.nom} (${nouveau.role}) — ${nouveau.telephone}`,
          admin?.nom ?? "—",
        ),
      }));

      return {
        ok: true,
        message: `Compte créé pour ${nouveau.nom}.`,
        extra: {
          motDePasseInitial: initial,
          id: nouveau.id,
          telephone: nouveau.telephone,
        },
      };
    },

    supprimerCompte(compteId: string): ResultatAction {
      const c = state.utilisateurs.find((x) => x.id === compteId);
      if (!c) return { ok: false, message: "Compte introuvable." };
      if (c.role === "responsable")
        return {
          ok: false,
          message:
            "Le compte du responsable du doyenné ne peut pas être supprimé.",
        };
      const admin = state.utilisateurs.find(
        (x) => x.id === state.currentUserId,
      );
      maj((s) => ({
        ...s,
        utilisateurs: s.utilisateurs.filter((x) => x.id !== compteId),
        notifications: s.notifications.filter((n) => n.userId !== compteId),
        journal: journaliser(
          s,
          "Compte supprimé",
          `${c.nom} (${c.telephone})`,
          admin?.nom ?? "—",
        ),
      }));

      return { ok: true, message: `Le compte de ${c.nom} a été supprimé.` };
    },

    basculerStatutCompte(compteId: string): ResultatAction {
      const c = state.utilisateurs.find((x) => x.id === compteId);
      if (!c) return { ok: false, message: "Compte introuvable." };
      if (c.role === "responsable")
        return {
          ok: false,
          message: "Le compte du responsable ne peut pas être désactivé.",
        };
      const admin = state.utilisateurs.find(
        (x) => x.id === state.currentUserId,
      );
      const nouveauStatut = c.statut === "actif" ? "retire" : "actif";
      maj((s) => ({
        ...s,
        utilisateurs: s.utilisateurs.map((x) =>
          x.id === compteId ? { ...x, statut: nouveauStatut } : x,
        ),
        notifications: notifier(
          s,
          [compteId],
          nouveauStatut === "actif" ? "Compte réactivé" : "Compte désactivé",
          nouveauStatut === "actif"
            ? "Votre accès a été réactivé par l'administration."
            : "Votre accès a été suspendu par l'administration.",
          "compte",
        ),
        journal: journaliser(
          s,
          nouveauStatut === "actif" ? "Compte réactivé" : "Compte désactivé",
          c.nom,
          admin?.nom ?? "—",
        ),
      }));
      return {
        ok: true,
        message:
          nouveauStatut === "actif" ? "Compte réactivé." : "Compte désactivé.",
      };
    },

    changerPhotoProfil(userId: string, photo: string | null): ResultatAction {
      maj((s) => ({
        ...s,
        utilisateurs: s.utilisateurs.map((x) =>
          x.id === userId ? { ...x, photo } : x,
        ),
      }));

      return {
        ok: true,
        message: photo ? "Photo de profil enregistrée." : "Photo retirée.",
      };
    },

    validerCompte(compteId: string, parId: string): ResultatAction {
      const c = state.utilisateurs.find((x) => x.id === compteId);
      if (!c) return { ok: false, message: "Compte introuvable." };
      const par = state.utilisateurs.find((x) => x.id === parId);
      maj((s) => ({
        ...s,
        utilisateurs: s.utilisateurs.map((x) =>
          x.id === compteId
            ? {
                ...x,
                statut: "actif",
                motifRefus: null,
                validateurId: parId,
                dateValidation: new Date().toISOString(),
              }
            : x,
        ),
        notifications: notifier(
          s,
          [compteId],
          "Compte validé",
          "Votre compte est validé. Vous pouvez maintenant utiliser l'application.",
          "compte",
        ),
        journal: journaliser(
          s,
          "Compte validé",
          `${c.nom} (${c.role})`,
          par?.nom ?? "—",
        ),
      }));
      return { ok: true, message: `${c.nom} peut maintenant se connecter.` };
    },

    refuserCompte(
      compteId: string,
      motif: string,
      parId: string,
    ): ResultatAction {
      const c = state.utilisateurs.find((x) => x.id === compteId);
      if (!c) return { ok: false, message: "Compte introuvable." };
      if (!motif.trim())
        return { ok: false, message: "Le motif du refus est obligatoire." };
      const par = state.utilisateurs.find((x) => x.id === parId);
      maj((s) => ({
        ...s,
        utilisateurs: s.utilisateurs.map((x) =>
          x.id === compteId
            ? {
                ...x,
                statut: "refuse",
                motifRefus: motif.trim(),
                validateurId: parId,
              }
            : x,
        ),
        notifications: notifier(
          s,
          [compteId],
          "Demande refusée",
          `Motif : ${motif.trim()}. Vous pouvez redemander l'accès.`,
          "compte",
        ),
        journal: journaliser(
          s,
          "Compte refusé",
          `${c.nom} — ${motif.trim()}`,
          par?.nom ?? "—",
        ),
      }));
      return { ok: true, message: "Demande refusée." };
    },

    retirerCompte(compteId: string, parId: string): ResultatAction {
      const c = state.utilisateurs.find((x) => x.id === compteId);
      if (!c) return { ok: false, message: "Compte introuvable." };
      if (c.role === "responsable")
        return {
          ok: false,
          message: "Le compte du responsable ne peut pas être retiré.",
        };
      const par = state.utilisateurs.find((x) => x.id === parId);
      maj((s) => ({
        ...s,
        utilisateurs: s.utilisateurs.map((x) =>
          x.id === compteId ? { ...x, statut: "retire" } : x,
        ),
        notifications: notifier(
          s,
          [compteId],
          "Compte retiré",
          "Votre accès a été retiré par le responsable du doyenné.",
          "compte",
        ),
        journal: journaliser(s, "Compte retiré", c.nom, par?.nom ?? "—"),
      }));
      return { ok: true, message: `${c.nom} a été retiré.` };
    },

    reinitialiserMotDePasse(compteId: string, parId: string): ResultatAction {
      const c = state.utilisateurs.find((x) => x.id === compteId);
      if (!c) return { ok: false, message: "Compte introuvable." };
      if (c.role === "responsable")
        return {
          ok: false,
          message: "Modifiez votre mot de passe depuis Mon compte.",
        };
      const temporaire = motDePasseTemporaire();
      const par = state.utilisateurs.find((x) => x.id === parId);
      maj((s) => ({
        ...s,
        utilisateurs: s.utilisateurs.map((x) =>
          x.id === compteId
            ? {
                ...x,
                motDePasse: hashMdp(temporaire),
                motDePasseInitial: hashMdp(temporaire),
                motDePasseInitialEnClair: undefined,
                doitChangerMdp: true,
              }
            : x,
        ),
        journal: journaliser(
          s,
          "Mot de passe réinitialisé",
          c.nom,
          par?.nom ?? "—",
        ),
      }));

      return {
        ok: true,
        message: "Mot de passe temporaire créé.",
        extra: { motDePasseTemporaire: temporaire },
      };
    },

    /* ---------- Jeunes ---------- */

    ajouterJeune(
      jeune: Omit<import("@/lib/types").Jeune, "id" | "creeLe">,
    ): ResultatAction {
      const idJeune = id("jeu");
      maj((s) => ({
        ...s,
        jeunes: [
          ...s.jeunes,
          { ...jeune, id: idJeune, creeLe: new Date().toISOString() },
        ],
      }));
      return {
        ok: true,
        message: `${jeune.prenom} ${jeune.nom} a été ajouté(e) à la liste.`,
      };
    },

    modifierJeune(
      jeuneId: string,
      patch: Partial<import("@/lib/types").Jeune>,
    ): ResultatAction {
      maj((s) => ({
        ...s,
        jeunes: s.jeunes.map((j) =>
          j.id === jeuneId ? { ...j, ...patch } : j,
        ),
      }));
      return { ok: true, message: "Fiche du jeune mise à jour." };
    },

    supprimerJeune(jeuneId: string): ResultatAction {
      const j = state.jeunes.find((x) => x.id === jeuneId);
      maj((s) => ({
        ...s,
        jeunes: s.jeunes.filter((x) => x.id !== jeuneId),
        presences: s.presences.filter(
          (p) =>
            p.jeuneId !== jeuneId ||
            s.rapports.some(
              (r) => r.id === p.rapportId && r.statut === "envoye",
            ),
        ),
      }));
      return {
        ok: true,
        message: `${j ? j.prenom : "Le jeune"} a été retiré(e) de la liste.`,
      };
    },

    deciderPassation(
      jeuneId: string,
      decision: "passe" | "maintenu",
      trancheArrivee: Tranche,
      decideur: string,
    ): ResultatAction {
      const j = state.jeunes.find((x) => x.id === jeuneId);
      if (!j) return { ok: false, message: "Jeune introuvable." };
      const par = state.utilisateurs.find((u) => u.id === decideur);
      maj((s) => ({
        ...s,
        jeunes:
          decision === "passe"
            ? s.jeunes.map((x) =>
                x.id === jeuneId ? { ...x, tranche: trancheArrivee } : x,
              )
            : s.jeunes,
        passations: [
          {
            id: id("pas"),
            jeuneId,
            paroisseId: j.paroisseId,
            decision,
            trancheDepart: j.tranche,
            trancheArrivee,
            decideur: par?.nom ?? "—",
            date: aujourdhui(),
          },
          ...s.passations,
        ],
        journal: journaliser(
          s,
          decision === "passe" ? "Passation" : "Jeune maintenu",
          `${j.prenom} ${j.nom}`,
          par?.nom ?? "—",
        ),
      }));
      return {
        ok: true,
        message:
          decision === "passe"
            ? "Le jeune est passé dans la nouvelle tranche."
            : "Le jeune est maintenu dans sa tranche.",
      };
    },

    /* ---------- Thèmes ---------- */

    ajouterTheme(
      tranche: Tranche,
      libelle: string,
      datePrevue: string | null,
      proposePar: string,
    ): ResultatAction {
      if (!libelle.trim())
        return { ok: false, message: "Le libellé du thème est obligatoire." };
      const par = state.utilisateurs.find((u) => u.id === proposePar);
      maj((s) => ({
        ...s,
        themes: [
          {
            id: id("th"),
            tranche,
            libelle: libelle.trim(),
            datePrevue,
            proposePar: par?.nom ?? "—",
            creeLe: new Date().toISOString(),
            retire: false,
          },
          ...s.themes,
        ],
        journal: journaliser(
          s,
          "Thème ajouté",
          libelle.trim(),
          par?.nom ?? "—",
        ),
      }));
      return {
        ok: true,
        message: "Thème ajouté à la liste des thèmes proposés.",
      };
    },

    basculerTheme(themeId: string): ResultatAction {
      const t = state.themes.find((x) => x.id === themeId);
      if (!t) return { ok: false, message: "Thème introuvable." };
      maj((s) => ({
        ...s,
        themes: s.themes.map((x) =>
          x.id === themeId ? { ...x, retire: !x.retire } : x,
        ),
      }));
      return {
        ok: true,
        message: t.retire ? "Thème rétabli." : "Thème retiré de la liste.",
      };
    },

    /* ---------- Rapports ---------- */

    assurerRapport(paroisseId: string, dimanche: string): Rapport {
      let r = state.rapports.find(
        (x) => x.paroisseId === paroisseId && x.dimanche === dimanche,
      );
      if (!r) {
        const maintenant = new Date().toISOString();
        r = {
          id: id("rap"),
          paroisseId,
          dimanche,
          statut: "brouillon",
          debut: "",
          fin: "",
          fiches: TRANCHES.map((t) => ficheVide(t.id)),
          creeLe: maintenant,
          modifieLe: maintenant,
        };
        maj((s) => ({ ...s, rapports: [...s.rapports, r as Rapport] }));
      }
      return r;
    },

    majRapport(rapportId: string, patch: Partial<Rapport>): void {
      maj((s) => ({
        ...s,
        rapports: s.rapports.map((r) =>
          r.id === rapportId
            ? { ...r, ...patch, modifieLe: new Date().toISOString() }
            : r,
        ),
      }));
    },

    majFiche(
      rapportId: string,
      tranche: Tranche,
      patch: Partial<FicheTranche>,
    ): void {
      maj((s) => ({
        ...s,
        rapports: s.rapports.map((r) =>
          r.id === rapportId
            ? {
                ...r,
                fiches: r.fiches.map((f) =>
                  f.tranche === tranche ? { ...f, ...patch } : f,
                ),
                modifieLe: new Date().toISOString(),
              }
            : r,
        ),
      }));
    },

    definirPresence(
      rapportId: string,
      jeuneId: string,
      present: boolean,
    ): void {
      maj((s) => {
        const existe = s.presences.find(
          (p) => p.rapportId === rapportId && p.jeuneId === jeuneId,
        );
        const presences = existe
          ? s.presences.map((p) => (p.id === existe.id ? { ...p, present } : p))
          : [
              ...s.presences,
              {
                id: id("pre"),
                rapportId,
                jeuneId,
                tranche:
                  s.jeunes.find((j) => j.id === jeuneId)?.tranche ?? "CADETS",
                present,
              },
            ];
        return { ...s, presences };
      });
    },

    validerAppel(rapportId: string, tranche: Tranche): ResultatAction {
      const r = state.rapports.find((x) => x.id === rapportId);
      if (!r) return { ok: false, message: "Rapport introuvable." };
      if (r.statut === "envoye")
        return { ok: false, message: "Le rapport est envoyé et verrouillé." };
      const jeunes = state.jeunes.filter(
        (j) => j.paroisseId === r.paroisseId && j.tranche === tranche,
      );
      if (!jeunes.length)
        return {
          ok: false,
          message:
            "Aucun jeune dans cette tranche : l'appel n'est pas nécessaire.",
        };
      const manquant = jeunes.filter(
        (j) =>
          !state.presences.some(
            (p) => p.rapportId === rapportId && p.jeuneId === j.id,
          ),
      );
      if (manquant.length)
        return {
          ok: false,
          message: `Appel incomplet : ${manquant.length} jeune(s) sans réponse (${manquant
            .map((j) => j.prenom)
            .join(", ")}).`,
        };
      actions.majFiche(rapportId, tranche, { appelFait: true });
      return { ok: true, message: "Appel validé." };
    },

    envoyerRapport(rapportId: string): ResultatAction {
      const r = state.rapports.find((x) => x.id === rapportId);
      if (!r) return { ok: false, message: "Rapport introuvable." };
      if (r.statut === "envoye")
        return { ok: false, message: "Ce rapport a déjà été envoyé." };
      const manquants = manquesRapport(state, r);
      if (manquants.length)
        return {
          ok: false,
          message: `Le rapport est incomplet : ${manquants.length} élément(s) manquant(s).`,
        };
      const p = state.paroisses.find((x) => x.id === r.paroisseId);
      const etatAbo = etatAbonnement(state, r.paroisseId);
      if (etatAbo === "EXPIRE" || etatAbo === "SANS")
        return {
          ok: false,
          message:
            etatAbo === "EXPIRE"
              ? "L'abonnement est échu : l'envoi est bloqué. Vos données sont conservées, contactez le responsable du doyenné."
              : "Aucun abonnement actif : l'envoi est bloqué. Contactez le responsable du doyenné.",
        };
      void p;
      const par = state.utilisateurs.find((u) => u.id === state.currentUserId);
      const fiches = r.fiches.map((f) => ({
        ...f,
        effectif: state.jeunes.filter(
          (j) => j.paroisseId === r.paroisseId && j.tranche === f.tranche,
        ).length,
      }));
      maj((s) => ({
        ...s,
        rapports: s.rapports.map((x) =>
          x.id === rapportId
            ? {
                ...x,
                fiches,
                statut: "envoye" as StatutRapport,
                envoyeLe: new Date().toISOString(),
                envoyePar: par?.id ?? null,
                modifieLe: new Date().toISOString(),
              }
            : x,
        ),
        notifications: notifier(
          s,
          doyenneIds(s),
          "Rapport reçu",
          `${p?.nom ?? "Une paroisse"} a envoyé son rapport du ${r.dimanche}.`,
          "rapport",
        ),
        journal: journaliser(
          s,
          "Rapport envoyé",
          `${p?.nom ?? r.paroisseId} — ${r.dimanche}`,
          par?.nom ?? "—",
        ),
      }));
      return { ok: true, message: "Rapport envoyé et verrouillé." };
    },

    rouvrirRapport(rapportId: string): ResultatAction {
      const r = state.rapports.find((x) => x.id === rapportId);
      if (!r) return { ok: false, message: "Rapport introuvable." };
      const par = state.utilisateurs.find((u) => u.id === state.currentUserId);
      const p = state.paroisses.find((x) => x.id === r.paroisseId);
      maj((s) => ({
        ...s,
        rapports: s.rapports.map((x) =>
          x.id === rapportId
            ? {
                ...x,
                statut: "brouillon" as StatutRapport,
                envoyeLe: null,
                envoyePar: null,
                rouvrePar: par?.id ?? null,
                rouvreLe: new Date().toISOString(),
                modifieLe: new Date().toISOString(),
              }
            : x,
        ),
        notifications: notifier(
          s,
          paroissiens(s, r.paroisseId),
          "Rapport rouvert",
          `Le responsable du doyenné a rouvert le rapport du ${r.dimanche} de ${p?.nom ?? "votre paroisse"}.`,
          "rapport",
        ),
        journal: journaliser(
          s,
          "Rapport rouvert",
          `${p?.nom ?? r.paroisseId} — ${r.dimanche}`,
          par?.nom ?? "—",
        ),
      }));
      return {
        ok: true,
        message: "Rapport rouvert : la paroisse est prévenue.",
      };
    },

    /* ---------- Abonnements et paiements ---------- */

    declarerPaiement(data: {
      paroisseId: string;
      type: TypeAbonnement;
      montant: number;
      reference: string;
      date: string;
    }): ResultatAction {
      const ref = data.reference.trim();
      if (!ref)
        return {
          ok: false,
          message: "La référence du SMS de l'opérateur est obligatoire.",
        };
      if (
        state.paiements.some(
          (p) => p.statut !== "annule" && p.reference.trim() === ref,
        )
      )
        return {
          ok: false,
          message:
            "Cette référence a déjà été utilisée pour un autre paiement.",
        };
      if (!data.montant || data.montant <= 0)
        return { ok: false, message: "Le montant est obligatoire." };
      const par = state.utilisateurs.find((u) => u.id === state.currentUserId);
      const p = state.paroisses.find((x) => x.id === data.paroisseId);
      maj((s) => ({
        ...s,
        paiements: [
          {
            id: id("pay"),
            paroisseId: data.paroisseId,
            type: data.type,
            montant: data.montant,
            reference: ref,
            date: data.date,
            mode: "mobile_money",
            statut: "en_attente",
            declarePar: par?.id ?? null,
          },
          ...s.paiements,
        ],
        notifications: notifier(
          s,
          doyenneIds(s),
          "Paiement déclaré",
          `${p?.nom ?? "Une paroisse"} déclare un paiement ${data.type} de ${data.montant.toLocaleString("fr-FR")} FC (réf. ${ref}).`,
          "paiement",
        ),
        journal: journaliser(
          s,
          "Paiement déclaré",
          `${p?.nom ?? ""} — ${ref}`,
          par?.nom ?? "—",
        ),
      }));
      return {
        ok: true,
        message: "Déclaration transmise au responsable du doyenné.",
      };
    },

    confirmerPaiement(paiementId: string): ResultatAction {
      const pay = state.paiements.find((p) => p.id === paiementId);
      if (!pay) return { ok: false, message: "Paiement introuvable." };
      if (pay.statut !== "en_attente")
        return { ok: false, message: "Ce paiement a déjà été traité." };
      const par = state.utilisateurs.find((u) => u.id === state.currentUserId);
      const p = state.paroisses.find((x) => x.id === pay.paroisseId);
      maj((s) => ({
        ...s,
        paiements: s.paiements.map((x) =>
          x.id === paiementId
            ? {
                ...x,
                statut: "confirme" as const,
                traitePar: par?.id ?? null,
                traiteLe: new Date().toISOString(),
              }
            : x,
        ),
        abonnements: activerAbonnement(
          s,
          pay.paroisseId,
          pay.type,
          par?.id ?? "",
        ),
        paroisses: s.paroisses.map((item) =>
          item.id === pay.paroisseId
            ? { ...item, accesGratuit: false, abonnementForce: undefined }
            : item,
        ),
        notifications: notifier(
          s,
          paroissiens(s, pay.paroisseId),
          "Paiement confirmé",
          `Votre paiement de ${pay.montant.toLocaleString("fr-FR")} FC est confirmé. L'abonnement de ${p?.nom ?? "votre paroisse"} est actif.`,
          "paiement",
        ),
        journal: journaliser(
          s,
          "Paiement confirmé",
          `${p?.nom ?? ""} — ${pay.montant} FC`,
          par?.nom ?? "—",
        ),
      }));
      return {
        ok: true,
        message: "Paiement confirmé : l'abonnement est actif.",
      };
    },

    refuserPaiement(paiementId: string, motif: string): ResultatAction {
      const pay = state.paiements.find((p) => p.id === paiementId);
      if (!pay) return { ok: false, message: "Paiement introuvable." };
      if (pay.statut !== "en_attente")
        return { ok: false, message: "Ce paiement a déjà été traité." };
      if (!motif.trim())
        return { ok: false, message: "Le motif du refus est obligatoire." };
      const par = state.utilisateurs.find((u) => u.id === state.currentUserId);
      const p = state.paroisses.find((x) => x.id === pay.paroisseId);
      maj((s) => ({
        ...s,
        paiements: s.paiements.map((x) =>
          x.id === paiementId
            ? {
                ...x,
                statut: "refuse" as const,
                motifRefus: motif.trim(),
                traitePar: par?.id ?? null,
                traiteLe: new Date().toISOString(),
              }
            : x,
        ),
        notifications: notifier(
          s,
          paroissiens(s, pay.paroisseId),
          "Paiement refusé",
          `Motif : ${motif.trim()}. Vous pouvez déclarer un nouveau paiement.`,
          "paiement",
        ),
        journal: journaliser(
          s,
          "Paiement refusé",
          `${p?.nom ?? ""} — ${motif.trim()}`,
          par?.nom ?? "—",
        ),
      }));
      return {
        ok: true,
        message: "Paiement refusé. La paroisse est prévenue du motif.",
      };
    },

    annulerPaiement(paiementId: string): ResultatAction {
      const pay = state.paiements.find((p) => p.id === paiementId);
      if (!pay) return { ok: false, message: "Paiement introuvable." };
      const derniers = state.paiements
        .filter((p) => p.paroisseId === pay.paroisseId && p.statut !== "annule")
        .sort((a, b) => (a.date < b.date ? 1 : -1));
      if (derniers[0]?.id !== pay.id)
        return {
          ok: false,
          message: "Seul le dernier paiement d'une paroisse peut être annulé.",
        };
      const par = state.utilisateurs.find((u) => u.id === state.currentUserId);
      const p = state.paroisses.find((x) => x.id === pay.paroisseId);
      maj((s) => ({
        ...s,
        paiements: s.paiements.map((x) =>
          x.id === paiementId
            ? {
                ...x,
                statut: "annule" as const,
                traitePar: par?.id ?? null,
                traiteLe: new Date().toISOString(),
              }
            : x,
        ),
        notifications: notifier(
          s,
          paroissiens(s, pay.paroisseId),
          "Paiement annulé",
          `Le paiement de ${pay.montant.toLocaleString("fr-FR")} FC a été annulé par le responsable du doyenné.`,
          "paiement",
        ),
        journal: journaliser(
          s,
          "Paiement annulé",
          `${p?.nom ?? ""} — ${pay.reference}`,
          par?.nom ?? "—",
        ),
      }));
      return { ok: true, message: "Paiement annulé." };
    },

    enregistrerPaiementRecu(data: {
      paroisseId: string;
      type: TypeAbonnement;
      montant: number;
      reference: string;
      date: string;
    }): ResultatAction {
      const ref =
        data.reference.trim() || `RECU-${Date.now().toString().slice(-6)}`;
      if (
        state.paiements.some(
          (p) => p.statut !== "annule" && p.reference.trim() === ref,
        )
      )
        return { ok: false, message: "Cette référence a déjà été utilisée." };
      const par = state.utilisateurs.find((u) => u.id === state.currentUserId);
      const p = state.paroisses.find((x) => x.id === data.paroisseId);
      maj((s) => ({
        ...s,
        paiements: [
          {
            id: id("pay"),
            paroisseId: data.paroisseId,
            type: data.type,
            montant: data.montant,
            reference: ref,
            date: data.date,
            mode: "main_propre",
            statut: "confirme",
            declarePar: par?.id ?? null,
            traitePar: par?.id ?? null,
            traiteLe: new Date().toISOString(),
          },
          ...s.paiements,
        ],
        abonnements: activerAbonnement(
          s,
          data.paroisseId,
          data.type,
          par?.id ?? "",
        ),
        paroisses: s.paroisses.map((item) =>
          item.id === data.paroisseId
            ? { ...item, accesGratuit: false, abonnementForce: undefined }
            : item,
        ),
        notifications: notifier(
          s,
          paroissiens(s, data.paroisseId),
          "Abonnement activé",
          `Le responsable du doyenné a enregistré votre paiement de ${data.montant.toLocaleString("fr-FR")} FC.`,
          "paiement",
        ),
        journal: journaliser(
          s,
          "Paiement reçu",
          `${p?.nom ?? ""} — ${data.montant} FC`,
          par?.nom ?? "—",
        ),
      }));
      return { ok: true, message: "Paiement enregistré et abonnement activé." };
    },

    /* ---------- Paroisses, réglages ---------- */

    ajouterParoisse(nom: string, adresse: string): ResultatAction {
      if (!nom.trim())
        return { ok: false, message: "Le nom de la paroisse est obligatoire." };
      if (
        state.paroisses.some(
          (p) => p.nom.toLocaleLowerCase() === nom.trim().toLocaleLowerCase(),
        )
      )
        return { ok: false, message: "Cette paroisse existe déjà." };
      const par = state.utilisateurs.find((u) => u.id === state.currentUserId);
      maj((s) => ({
        ...s,
        paroisses: [
          ...s.paroisses,
          {
            id: id("par"),
            nom: nom.trim(),
            adresse: adresse.trim(),
            doyenneId: s.doyenne.id,
            accesGratuit: false,
            creeLe: new Date().toISOString(),
          },
        ],
        journal: journaliser(
          s,
          "Paroisse ajoutée",
          nom.trim(),
          par?.nom ?? "—",
        ),
      }));
      return { ok: true, message: "Paroisse ajoutée." };
    },

    basculerAbonnement(paroisseId: string): ResultatAction {
      const p = state.paroisses.find((x) => x.id === paroisseId);
      if (!p) return { ok: false, message: "Paroisse introuvable." };
      const par = state.utilisateurs.find((u) => u.id === state.currentUserId);
      if (par?.role !== "responsable")
        return {
          ok: false,
          message: "Action réservée au responsable du doyenné.",
        };
      const currentlyActive = ["ACTIF", "GRATUIT", "GRACE"].includes(
        etatAbonnement(state, paroisseId),
      );
      const next = currentlyActive ? ("inactif" as const) : ("actif" as const);
      maj((s) => ({
        ...s,
        paroisses: s.paroisses.map((x) =>
          x.id === paroisseId
            ? { ...x, accesGratuit: false, abonnementForce: next }
            : x,
        ),
        journal: journaliser(
          s,
          next === "actif"
            ? "Abonnement activé par le responsable"
            : "Abonnement désactivé par le responsable",
          p.nom,
          par?.nom ?? "—",
        ),
      }));
      return {
        ok: true,
        message:
          next === "actif"
            ? "Abonnement activé pour cette paroisse."
            : "Abonnement désactivé pour cette paroisse.",
      };
    },

    modifierReglage(patch: Partial<AppState["reglage"]>): ResultatAction {
      const par = state.utilisateurs.find((u) => u.id === state.currentUserId);
      maj((s) => ({
        ...s,
        reglage: { ...s.reglage, ...patch },
        journal: journaliser(
          s,
          "Réglages modifiés",
          Object.keys(patch).join(", "),
          par?.nom ?? "—",
        ),
      }));
      return { ok: true, message: "Réglages enregistrés." };
    },

    /* ---------- Apparence, notifications ---------- */

    marquerNotification(notificationId: string): void {
      maj((s) => ({
        ...s,
        notifications: s.notifications.map((n) =>
          n.id === notificationId ? { ...n, lu: true } : n,
        ),
      }));
    },

    toutMarquerLu(): void {
      maj((s) => ({
        ...s,
        notifications: s.notifications.map((n) =>
          s.currentUserId && n.userId === s.currentUserId
            ? { ...n, lu: true }
            : n,
        ),
      }));
    },
  };

  return {
    actions,
    getState: () => state,
    setState: (next: AppState) => {
      state = next;
    },
  };
}

export type ActionsMetier = ReturnType<typeof creerDomaine>["actions"];
