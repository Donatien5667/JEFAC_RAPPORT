import { useState } from "react";
import { Logo } from "@/components/Logo";
import {
  LayoutDashboard,
  UsersRound,
  Church,
  FileText,
  Megaphone,
  ChartNoAxesCombined,
  CreditCard,
  BookOpen,
  Download,
  History,
  Settings,
  LogOut,
  Info,
  Bell,
  ChevronRight,
  Laptop,
  CloudCheck,
} from "lucide-react";
import { AdminCommuniques } from "./Communiques";
import { AdministrationComptes } from "./AdministrationComptes";
import { AdminReglages } from "./Reglages";
import { useConnection } from "@/db/connection";
import { IconeGroupe, IconeRapports } from "@/components/Icones";
import {
  Alerte,
  Bouton,
  Carte,
  Champ,
  Etiquette,
  Input,
  Select,
  Tuile,
  useToast,
} from "@/components/ui";
import { TRANCHES } from "@/lib/types";
import { exportCSV, formatFC, formatDateMini } from "@/lib/utils";
import { actions, useAppState } from "@/store/store";
import {
  LIBELLE_ETAT,
  comptesAValider,
  etatAbonnement,
  jeunesDe,
  paiementsAConfirmer,
  paroissesEnRetard,
  rapportDe,
  serie8Dimanches,
  statsJour,
} from "@/store/selectors";
import { useNav } from "@/navigation";

type Section =
  | "tableau"
  | "communiques"
  | "reglages"
  | "comptes"
  | "paroisses"
  | "rapports"
  | "statistiques"
  | "finances"
  | "themes"
  | "exports"
  | "journal";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "tableau", label: "Tableau de bord" },
  { id: "comptes", label: "Comptes utilisateurs" },
  { id: "communiques", label: "Communiqués" },
  { id: "paroisses", label: "Paroisses" },
  { id: "rapports", label: "Rapports" },
  { id: "statistiques", label: "Statistiques" },
  { id: "finances", label: "Abonnements" },
  { id: "themes", label: "Thèmes" },
  { id: "exports", label: "Exports" },
  { id: "journal", label: "Journal" },
  { id: "reglages", label: "Configuration" },
];

function dimancheCourantIso() {
  const d = new Date();
  const jour = d.getDay();
  d.setDate(d.getDate() - jour);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function EcranAdmin() {
  const etat = useAppState();
  const nav = useNav();
  const connection = useConnection();
  const user = etat.utilisateurs.find((u) => u.id === etat.currentUserId)!;
  const requested = nav.route.nom === "admin" ? nav.route.section : undefined;
  const [section, setSection] = useState<Section>(
    SECTIONS.some((s) => s.id === requested)
      ? (requested as Section)
      : "tableau",
  );
  const icons = {
    tableau: LayoutDashboard,
    comptes: UsersRound,
    paroisses: Church,
    rapports: FileText,
    communiques: Megaphone,
    statistiques: ChartNoAxesCombined,
    finances: CreditCard,
    themes: BookOpen,
    exports: Download,
    journal: History,
    reglages: Settings,
  };
  const nonLues = etat.notifications.filter((n) => !n.lu).length;
  const shortcut = (
    title: string,
    desc: string,
    target: "paroisses" | "rapports" | "themes",
  ) => (
    <div className="entry">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow mb-3">Suivi des formations</p>
          <h1 className="page-title">{title}</h1>
          <p className="page-description">{desc}</p>
        </div>
      </div>
      <Bouton onClick={() => nav.aller({ nom: target })}>
        Ouvrir {title.toLocaleLowerCase()} <ChevronRight size={16} />
      </Bouton>
    </div>
  );
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar desktop-only">
        <Logo taille={42} avecTexte />
        <nav className="admin-nav" aria-label="Navigation administration">
          <div className="admin-nav-label">Mon espace</div>
          {SECTIONS.map((s, i) => {
            const Icon = icons[s.id];
            return (
              <div key={s.id}>
                {i === 6 && (
                  <div className="admin-nav-label mt-3">Gestion & outils</div>
                )}
                <button
                  className={section === s.id ? "active" : ""}
                  aria-current={section === s.id ? "page" : undefined}
                  onClick={() => setSection(s.id)}
                >
                  <Icon />
                  {s.label}
                </button>
              </div>
            );
          })}
        </nav>
        <div className="border-t border-[var(--border)] pt-3">
          <button
            className="flex min-h-11 w-full items-center gap-3 px-3 text-xs text-[var(--muted)]"
            onClick={() => nav.aller({ nom: "a-propos" })}
          >
            <Info size={16} /> À propos de JEFAC
          </button>
          <button
            className="flex min-h-11 w-full items-center gap-3 px-3 text-xs text-[var(--muted)]"
            onClick={() => actions.deconnexion()}
          >
            <LogOut size={16} /> Se déconnecter
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="desktop-only flex items-center gap-2 text-xs text-[var(--muted)]">
            Administration <ChevronRight size={13} />
            <span className="font-medium text-[var(--text)]">
              {SECTIONS.find((s) => s.id === section)?.label}
            </span>
          </div>
          <div className="mobile-only">
            <Logo taille={32} avecTexte />
          </div>
          <div className="flex items-center gap-4">
            <span className="connection-note desktop-only flex items-center gap-1.5">
              {connection.mode === "serveur" ? <CloudCheck /> : <Laptop />}
              {connection.pending
                ? "Enregistrement…"
                : connection.mode === "serveur"
                  ? connection.message.startsWith("Connexion interrompue")
                    ? "Connexion interrompue"
                    : "Données synchronisées"
                  : "Espace local"}
            </span>
            <button
              aria-label="Notifications"
              className="relative grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-white"
              onClick={() => nav.aller({ nom: "notifications" })}
            >
              <Bell size={17} />
              {nonLues > 0 && (
                <span className="absolute right-1 top-0 h-2 w-2 rounded-full bg-[var(--accent)]" />
              )}
            </button>
            <button
              aria-label="Mon compte"
              className="flex items-center gap-2"
              onClick={() => nav.aller({ nom: "compte" })}
            >
              {user.photo ? (
                <img
                  src={user.photo}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                  {user.nom
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")}
                </span>
              )}
              <span className="desktop-only text-left">
                <span className="block text-xs font-semibold">{user.nom}</span>
                <span className="block text-[10px] text-[var(--muted)]">
                  Administrateur
                </span>
              </span>
            </button>
          </div>
        </header>
        <div className="admin-mobile-selector mobile-only">
          <label className="flex items-center gap-3 text-xs text-[var(--muted)]">
            Rubrique
            <Select
              value={section}
              onChange={(e) => setSection(e.target.value as Section)}
              className="h-10 w-full rounded-lg border-0 text-sm"
            >
              {SECTIONS.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <main className="admin-content">
          {section === "tableau" && (
            <>
              <div className="admin-page-heading entry">
                <div>
                  <p className="eyebrow mb-3">
                    Ensemble, au service des jeunes
                  </p>
                  <h1 className="page-title">
                    Bienvenue, {user.nom.split(" ")[0]}.
                  </h1>
                  <p className="page-description">
                    {etat.doyenne.nom} · Votre vue d'ensemble des formations.
                  </p>
                </div>
                <Bouton onClick={() => setSection("communiques")}>
                  <Megaphone size={16} /> Un message aux paroisses
                </Bouton>
              </div>
              {!etat.jeunes.length && (
                <div className="mb-7 rounded-xl border border-[var(--border)] bg-white p-5">
                  <div className="text-sm font-semibold">
                    Votre espace est prêt à accueillir vos données.
                  </div>
                  <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
                    Ajoutez vos paroisses, créez les comptes des utilisateurs,
                    puis commencez le suivi des jeunes. Les chiffres ci-dessous
                    reflètent uniquement vos saisies.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Bouton
                      variante="contour"
                      onClick={() => nav.aller({ nom: "paroisses" })}
                    >
                      Mes paroisses <ChevronRight size={15} />
                    </Bouton>
                    <Bouton
                      variante="contour"
                      onClick={() => setSection("comptes")}
                    >
                      Créer les comptes <ChevronRight size={15} />
                    </Bouton>
                  </div>
                </div>
              )}
              <AdminTableauBord />
            </>
          )}
          {section === "comptes" && <AdministrationComptes />}
          {section === "communiques" && <AdminCommuniques />}
          {section === "reglages" && <AdminReglages />}
          {section === "paroisses" &&
            shortcut(
              "Paroisses",
              "Ajoutez vos paroisses et accompagnez leurs responsables.",
              "paroisses",
            )}
          {section === "rapports" &&
            shortcut(
              "Rapports",
              "Consultez les rapports de formation et téléchargez leurs PDF.",
              "rapports",
            )}
          {section === "themes" &&
            shortcut(
              "Thèmes",
              "Proposez les thèmes des formations pour chaque tranche d'âge.",
              "themes",
            )}
          {section === "statistiques" && <AdminStatistiques />}
          {section === "finances" && <AdminFinances />}
          {section === "exports" && <AdminExports />}
          {section === "journal" && <AdminJournal />}
          <footer className="admin-footer">
            <span>© 2026 JEFAC Rapports · Conçu par LIOMBA</span>
            <span>
              {connection.mode === "serveur"
                ? "Base partagée connectée"
                : "Stockage sur cet appareil. Partage distant non connecté."}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

/* ---------------- Tableau de bord ---------------- */

function AdminTableauBord() {
  const etat = useAppState();
  const nav = useNav();
  const dimanche = dimancheCourantIso();
  const stats = statsJour(etat, dimanche);
  const serie = serie8Dimanches(etat);
  const aValider = comptesAValider(etat);
  const aConfirmer = paiementsAConfirmer(etat);

  return (
    <div className="space-y-3">
      {aConfirmer.length > 0 && (
        <Alerte ton="warn" titre="Paiements à confirmer">
          {aConfirmer.length} déclaration(s) attendent votre vérification.
        </Alerte>
      )}
      {aValider.length > 0 && (
        <Alerte ton="info" titre="Comptes à valider">
          {aValider.length} compte(s) attendent la validation.
        </Alerte>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Tuile
          valeur={`${stats.recus}/${stats.total}`}
          libelle="Rapports reçus"
          ton={stats.recus === stats.total ? "ok" : "warn"}
        />
        <Tuile
          valeur={stats.retards}
          libelle="Paroisses en retard"
          ton={stats.retards ? "danger" : "ok"}
        />
        <Tuile valeur={stats.presents} libelle="Présents" ton="info" />
        <Tuile
          valeur={`${stats.assiduite}%`}
          libelle="Assiduité"
          ton="accent"
        />
      </div>

      <Carte>
        <div className="mb-2 text-[13px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
          8 derniers dimanches
        </div>
        <div className="flex h-28 items-end gap-2">
          {serie.map((s) => (
            <div
              key={s.dimanche}
              className="flex grow flex-col items-center gap-1"
            >
              <div className="text-[10px] text-[var(--muted)]">
                {s.assiduite}%
              </div>
              <div
                className="w-full rounded-t-lg bg-[var(--accent)]"
                style={{ height: `${Math.max(6, (s.assiduite / 100) * 78)}px` }}
              />
              <div className="text-[9.5px] text-[var(--muted)]">
                {formatDateMini(s.dimanche).slice(0, 5)}
              </div>
            </div>
          ))}
        </div>
      </Carte>

      <Carte className="p-0 overflow-hidden">
        <div className="border-b border-[var(--border)] px-4 py-3 text-[13px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
          État de chaque paroisse
        </div>
        {etat.paroisses.map((p) => {
          const r = rapportDe(etat, p.id, dimanche);
          const etatAbo = etatAbonnement(etat, p.id);
          return (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3 last:border-0"
            >
              <div className="min-w-0">
                <div className="truncate text-[14.5px] font-semibold">
                  {p.nom}
                </div>
                <div className="text-[12.5px] text-[var(--muted)]">
                  {jeunesDe(etat, p.id).length} jeunes · {LIBELLE_ETAT[etatAbo]}
                </div>
              </div>
              {r?.statut === "envoye" ? (
                <Etiquette ton="ok">Reçu</Etiquette>
              ) : (
                <Etiquette
                  ton={
                    paroissesEnRetard(etat, dimanche).some((x) => x.id === p.id)
                      ? "danger"
                      : "neutre"
                  }
                >
                  {paroissesEnRetard(etat, dimanche).some((x) => x.id === p.id)
                    ? "En retard"
                    : "En attente"}
                </Etiquette>
              )}
            </div>
          );
        })}
      </Carte>

      <div className="grid grid-cols-2 gap-2">
        <Bouton
          variante="contour"
          onClick={() => nav.aller({ nom: "paroisses" })}
        >
          <IconeGroupe className="h-5 w-5" /> Comptes
        </Bouton>
        <Bouton
          variante="contour"
          onClick={() => nav.aller({ nom: "rapports" })}
        >
          <IconeRapports className="h-5 w-5" /> Rapports
        </Bouton>
      </div>
    </div>
  );
}

/* ---------------- Statistiques ---------------- */

function AdminStatistiques() {
  const etat = useAppState();
  const envoyer = [...etat.rapports].filter((r) => r.statut === "envoye");

  const parParoisse = etat.paroisses.map((p) => {
    const rapports = envoyer.filter((r) => r.paroisseId === p.id);
    let presents = 0;
    let inscrits = 0;
    for (const r of rapports) {
      for (const f of r.fiches) {
        const pres = etat.presences.filter(
          (x) => x.rapportId === r.id && x.tranche === f.tranche,
        );
        inscrits += pres.length;
        presents += pres.filter((x) => x.present).length;
      }
    }
    return {
      paroisse: p.nom,
      rapports: rapports.length,
      assiduite: inscrits ? Math.round((presents / inscrits) * 100) : 0,
      jeunes: jeunesDe(etat, p.id).length,
    };
  });

  const parTranche = TRANCHES.map((t) => {
    let presents = 0;
    let inscrits = 0;
    for (const r of envoyer) {
      const pres = etat.presences.filter(
        (x) => x.rapportId === r.id && x.tranche === t.id,
      );
      inscrits += pres.length;
      presents += pres.filter((x) => x.present).length;
    }
    return { tranche: t.label, inscrits, presents };
  });

  const themes: Record<string, number> = {};
  for (const r of envoyer)
    for (const f of r.fiches) {
      const libelle =
        etat.themes.find((t) => t.id === f.themeId)?.libelle ??
        f.themeAutre ??
        "Autres";
      if (libelle) themes[libelle] = (themes[libelle] ?? 0) + 1;
    }
  const plusTraites = Object.entries(themes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="space-y-3">
      <Carte>
        <div className="mb-2 text-[13px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
          Régularité et assiduité par paroisse
        </div>
        {parParoisse.map((p) => (
          <div
            key={p.paroisse}
            className="border-b border-[var(--border)] py-2 last:border-0"
          >
            <div className="flex items-center justify-between text-[14px]">
              <span className="truncate">{p.paroisse}</span>
              <b>{p.assiduite}%</b>
            </div>
            <div className="text-[12.5px] text-[var(--muted)]">
              {p.rapports} rapport(s) envoyé(s) · {p.jeunes} jeunes inscrits
            </div>
          </div>
        ))}
      </Carte>

      <Carte>
        <div className="mb-2 text-[13px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
          Présences par tranche
        </div>
        {parTranche.map((t) => (
          <div
            key={t.tranche}
            className="flex items-center justify-between border-b border-[var(--border)] py-2 last:border-0"
          >
            <span className="text-[14px]">{t.tranche}</span>
            <span className="text-[14px]">
              <b>{t.presents}</b> / {t.inscrits}
            </span>
          </div>
        ))}
      </Carte>

      <Carte>
        <div className="mb-2 text-[13px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
          Thèmes les plus traités
        </div>
        {plusTraites.length === 0 && (
          <p className="text-[14px] text-[var(--muted)]">
            Aucun rapport envoyé pour l'instant.
          </p>
        )}
        {plusTraites.map(([libelle, n]) => (
          <div
            key={libelle}
            className="flex items-center justify-between border-b border-[var(--border)] py-2 last:border-0"
          >
            <span className="truncate text-[14px]">{libelle}</span>
            <b className="text-[14px]">{n}</b>
          </div>
        ))}
      </Carte>
    </div>
  );
}

/* ---------------- Finances ---------------- */

function AdminFinances() {
  const etat = useAppState();
  const toast = useToast();
  const [paroisseId, setParoisseId] = useState(etat.paroisses[0]?.id ?? "");
  const [type, setType] = useState<"mensuel" | "annuel">("mensuel");
  const [montant, setMontant] = useState(String(etat.reglage.prixMensuel));
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
  );

  const parMois: Record<string, number> = {};
  for (const p of etat.paiements.filter((x) => x.statut === "confirme")) {
    const mois = p.date.slice(0, 7);
    parMois[mois] = (parMois[mois] ?? 0) + p.montant;
  }
  const total = Object.values(parMois).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Tuile valeur={formatFC(total)} libelle="Total encaissé" ton="ok" />
        <Tuile
          valeur={
            etat.paiements.filter((p) => p.statut === "en_attente").length
          }
          libelle="À confirmer"
          ton="warn"
        />
      </div>

      <Carte>
        <div className="mb-2 text-[13px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
          Encaissements par mois
        </div>
        {Object.keys(parMois).length === 0 && (
          <p className="text-[14px] text-[var(--muted)]">
            Aucun encaissement enregistré.
          </p>
        )}
        {Object.entries(parMois)
          .sort((a, b) => (a[0] < b[0] ? 1 : -1))
          .map(([mois, montantMois]) => (
            <div
              key={mois}
              className="flex items-center justify-between border-b border-[var(--border)] py-2 last:border-0"
            >
              <span className="text-[14px]">{mois}</span>
              <b className="text-[14px]">{formatFC(montantMois)}</b>
            </div>
          ))}
      </Carte>

      <Carte className="space-y-3">
        <div className="text-[13px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
          Enregistrer un paiement reçu
        </div>
        <Champ label="Paroisse">
          <Select
            value={paroisseId}
            onChange={(e) => setParoisseId(e.target.value)}
          >
            {etat.paroisses.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </Select>
        </Champ>
        <Champ label="Formule">
          <Select
            value={type}
            onChange={(e) => {
              const t = e.target.value as "mensuel" | "annuel";
              setType(t);
              setMontant(
                String(
                  t === "mensuel"
                    ? etat.reglage.prixMensuel
                    : etat.reglage.prixAnnuel,
                ),
              );
            }}
          >
            <option value="mensuel">Mensuel</option>
            <option value="annuel">Annuel</option>
          </Select>
        </Champ>
        <Champ label="Montant">
          <Input
            type="number"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
          />
        </Champ>
        <Champ label="Référence (facultatif)">
          <Input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="RECU-0012"
          />
        </Champ>
        <Champ label="Date">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Champ>
        <Bouton
          className="w-full"
          onClick={async () => {
            const res = await actions.enregistrerPaiementRecu({
              paroisseId,
              type,
              montant: Number(montant),
              reference,
              date,
            });
            toast(res.message, res.ok ? "ok" : "danger");
          }}
        >
          Enregistrer le paiement
        </Bouton>
      </Carte>

      <Carte className="p-0 overflow-hidden">
        <div className="border-b border-[var(--border)] px-4 py-3 text-[13px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
          Paiements
        </div>
        {etat.paiements.map((p) => (
          <div
            key={p.id}
            className="border-b border-[var(--border)] px-4 py-3 last:border-0"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[14.5px] font-semibold">
                  {etat.paroisses.find((x) => x.id === p.paroisseId)?.nom}
                </div>
                <div className="text-[12.5px] text-[var(--muted)]">
                  {formatFC(p.montant)} · {p.date} · {p.reference}
                </div>
              </div>
              <Etiquette
                ton={
                  p.statut === "confirme"
                    ? "ok"
                    : p.statut === "en_attente"
                      ? "warn"
                      : p.statut === "refuse"
                        ? "danger"
                        : "neutre"
                }
              >
                {p.statut}
              </Etiquette>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {p.statut === "en_attente" && (
                <Bouton
                  taille="sm"
                  onClick={async () => {
                    const res = await actions.confirmerPaiement(p.id);
                    toast(res.message, res.ok ? "ok" : "danger");
                  }}
                >
                  Confirmer
                </Bouton>
              )}
              {p.statut !== "annule" && (
                <Bouton
                  taille="sm"
                  variante="contour"
                  onClick={async () => {
                    const res = await actions.annulerPaiement(p.id);
                    toast(res.message, res.ok ? "ok" : "danger");
                  }}
                >
                  Annuler
                </Bouton>
              )}
            </div>
          </div>
        ))}
      </Carte>
    </div>
  );
}

/* ---------------- Exports ---------------- */

function AdminExports() {
  const etat = useAppState();

  const exportPresences = () => {
    const lignes: (string | number)[][] = [];
    for (const r of etat.rapports.filter((x) => x.statut === "envoye")) {
      for (const p of etat.presences.filter((x) => x.rapportId === r.id)) {
        const j = etat.jeunes.find((x) => x.id === p.jeuneId);
        lignes.push([
          r.dimanche,
          etat.paroisses.find((x) => x.id === r.paroisseId)?.nom ?? "",
          j ? `${j.prenom} ${j.nom}` : "",
          p.tranche,
          p.present ? "Présent" : "Absent",
        ]);
      }
    }
    exportCSV(
      "presences-jefac",
      ["Dimanche", "Paroisse", "Jeune", "Tranche", "Présence"],
      lignes,
    );
  };

  const exportRapports = () => {
    exportCSV(
      "rapports-jefac",
      [
        "Dimanche",
        "Paroisse",
        "Statut",
        "Début",
        "Fin",
        "Présents",
        "Inscrits",
      ],
      etat.rapports.map((r) => {
        let presents = 0;
        let inscrits = 0;
        for (const p of etat.presences.filter((x) => x.rapportId === r.id)) {
          inscrits += 1;
          if (p.present) presents += 1;
        }
        return [
          r.dimanche,
          etat.paroisses.find((x) => x.id === r.paroisseId)?.nom ?? "",
          r.statut,
          r.debut,
          r.fin,
          presents,
          inscrits,
        ];
      }),
    );
  };

  const exportJeunes = () => {
    exportCSV(
      "jeunes-jefac",
      [
        "Paroisse",
        "Prénom",
        "Nom",
        "Sexe",
        "Naissance",
        "Tranche",
        "Téléphone parent",
        "Téléphone jeune",
      ],
      etat.jeunes.map((j) => [
        etat.paroisses.find((p) => p.id === j.paroisseId)?.nom ?? "",
        j.prenom,
        j.nom,
        j.sexe,
        j.dateNaissance,
        j.tranche,
        j.telParent ?? "",
        j.telJeune ?? "",
      ]),
    );
  };

  const exportPaiements = () => {
    exportCSV(
      "paiements-jefac",
      ["Paroisse", "Type", "Montant", "Référence", "Date", "Mode", "Statut"],
      etat.paiements.map((p) => [
        etat.paroisses.find((x) => x.id === p.paroisseId)?.nom ?? "",
        p.type,
        p.montant,
        p.reference,
        p.date,
        p.mode,
        p.statut,
      ]),
    );
  };

  const exportJournal = () => {
    exportCSV(
      "journal-jefac",
      ["Date", "Action", "Élément", "Utilisateur"],
      etat.journal.map((j) => [
        formatDateMini(j.date),
        j.action,
        j.element,
        j.utilisateur,
      ]),
    );
  };

  const boutons: [string, () => void][] = [
    ["Présences (CSV)", exportPresences],
    ["Rapports (CSV)", exportRapports],
    ["Jeunes (CSV)", exportJeunes],
    ["Paiements (CSV)", exportPaiements],
    ["Journal des actions (CSV)", exportJournal],
  ];

  return (
    <div className="space-y-2">
      <Alerte ton="info">
        Les exports s'ouvrent directement dans Excel (séparateur « ; », accents
        conservés).
      </Alerte>
      {boutons.map(([label, action]) => (
        <Carte key={label} onClick={action}>
          <div className="font-semibold text-[15px]">{label}</div>
          <div className="text-[13px] text-[var(--muted)]">
            Télécharger le fichier
          </div>
        </Carte>
      ))}
    </div>
  );
}

/* ---------------- Journal ---------------- */

function AdminJournal() {
  const etat = useAppState();
  return (
    <div className="space-y-2">
      {etat.journal.length === 0 && (
        <Carte>
          <p className="text-[14px] text-[var(--muted)]">
            Aucune action enregistrée.
          </p>
        </Carte>
      )}
      {etat.journal.map((j) => (
        <Carte key={j.id}>
          <div className="text-[14.5px] font-semibold">{j.action}</div>
          <div className="text-[13px] text-[var(--muted)]">{j.element}</div>
          <div className="mt-1 text-[12px] text-[var(--muted)]">
            {formatDateMini(j.date)} · {j.utilisateur}
          </div>
        </Carte>
      ))}
    </div>
  );
}
