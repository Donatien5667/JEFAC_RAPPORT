import { useState } from "react";
import {
  Plus,
  Search,
  Copy,
  KeyRound,
  MoreHorizontal,
  UsersRound,
  ArrowUpRight,
} from "lucide-react";
import { actions, useAppState } from "@/store/store";
import { ROLES, type Role, type Utilisateur } from "@/lib/types";
import { copierTexte, exportCSV, formatTel } from "@/lib/utils";
import {
  Alerte,
  Avatar,
  Bouton,
  Champ,
  Etiquette,
  Input,
  Modale,
  Select,
  useToast,
} from "@/components/ui";
import { useNav } from "@/navigation";
import { useConnection } from "@/db/connection";

export function AdministrationComptes() {
  const s = useAppState();
  const nav = useNav();
  const toast = useToast();
  const connection = useConnection();
  const [query, setQuery] = useState("");
  const [create, setCreate] = useState(false);
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [role, setRole] = useState<Role>("charge");
  const [parish, setParish] = useState(s.paroisses[0]?.id ?? "");
  const [error, setError] = useState("");
  const [secret, setSecret] = useState<{
    nom: string;
    telephone: string;
    password: string;
  } | null>(null);
  const [manage, setManage] = useState<Utilisateur | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Utilisateur | null>(null);
  const [resetTarget, setResetTarget] = useState<Utilisateur | null>(null);
  const accounts = s.utilisateurs.filter((u) =>
    `${u.nom} ${u.telephone} ${s.paroisses.find((p) => p.id === u.paroisseId)?.nom ?? ""}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );
  const url = `${window.location.origin}/connexion`;
  async function copy(text: string) {
    toast(
      (await copierTexte(text))
        ? "Copié dans le presse-papiers."
        : "Copie indisponible. Sélectionnez le texte pour le copier.",
    );
  }
  return (
    <div className="entry">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow mb-3">Les membres du mouvement</p>
          <h1 className="page-title">Comptes utilisateurs</h1>
          <p className="page-description">
            Créez les accès de vos responsables paroissiaux et gérez leurs
            comptes.
          </p>
        </div>
        <Bouton
          onClick={() => {
            setCreate(true);
            setNom("");
            setTelephone("");
            setError("");
          }}
        >
          <Plus size={16} /> Créer un compte
        </Bouton>
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold">
          {s.utilisateurs.length} compte(s) enregistré(s)
        </span>
        <div className="flex flex-wrap gap-2">
          <label className="relative">
            <Search
              size={15}
              className="absolute left-3 top-3.5 text-[var(--muted)]"
            />
            <input
              aria-label="Rechercher un compte"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom, téléphone ou paroisse"
              className="h-11 rounded-lg border border-[var(--border)] bg-white pl-9 pr-3 text-xs"
            />
          </label>
          <Bouton
            variante="contour"
            onClick={() =>
              exportCSV(
                "comptes-jefac",
                ["Nom", "Téléphone", "Rôle", "Paroisse", "Statut"],
                accounts.map((c) => [
                  c.nom,
                  c.telephone,
                  ROLES.find((r) => r.id === c.role)!.label,
                  s.paroisses.find((p) => p.id === c.paroisseId)?.nom ??
                    "Doyenné",
                  c.statut,
                ]),
              )
            }
          >
            Exporter CSV
          </Bouton>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        <div className="desktop-only grid grid-cols-[minmax(160px,1.4fr)_1fr_1fr_100px_44px] gap-4 border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          <span>Utilisateur</span>
          <span>Rôle</span>
          <span>Paroisse</span>
          <span>Statut</span>
          <span />
        </div>
        {accounts.length ? (
          accounts.map((c) => (
            <div
              className="account-row flex items-center gap-3 border-b border-[var(--border)] px-4 py-5 last:border-0 lg:grid lg:grid-cols-[minmax(160px,1.4fr)_1fr_1fr_100px_44px] lg:gap-4 lg:px-5"
              key={c.id}
            >
              <div className="flex min-w-0 grow items-center gap-3">
                {c.photo ? (
                  <img
                    src={c.photo}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <Avatar nom={c.nom} taille={40} />
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{c.nom}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    {formatTel(c.telephone)}
                  </div>
                  <div className="mobile-only mt-1 text-[11px] text-[var(--muted)]">
                    {ROLES.find((r) => r.id === c.role)?.short}
                  </div>
                </div>
              </div>
              <span className="desktop-only text-xs text-[var(--muted)]">
                {ROLES.find((r) => r.id === c.role)?.label}
              </span>
              <span className="desktop-only text-xs text-[var(--muted)]">
                {s.paroisses.find((p) => p.id === c.paroisseId)?.nom ??
                  "Doyenné"}
              </span>
              <span>
                <Etiquette ton={c.statut === "actif" ? "info" : "neutre"}>
                  {c.statut === "actif"
                    ? "Actif"
                    : c.statut === "en_attente"
                      ? "En attente"
                      : "Inactif"}
                </Etiquette>
              </span>
              <button
                aria-label={`Gérer ${c.nom}`}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg hover:bg-[var(--surface-2)]"
                onClick={() => setManage(c)}
              >
                <MoreHorizontal size={19} />
              </button>
            </div>
          ))
        ) : (
          <div className="p-10 text-center text-sm text-[var(--muted)]">
            Aucun compte ne correspond à votre recherche.
          </div>
        )}
      </div>
      <p className="mt-5 flex items-center gap-2 text-xs leading-6 text-[var(--muted)]">
        <KeyRound size={14} /> Les mots de passe sont hachés et ne sont pas
        affichés dans la liste ni dans les exports.
      </p>
      <Modale
        ouvert={create}
        onFermer={() => setCreate(false)}
        titre="Créer un compte utilisateur"
        pied={
          <Bouton
            className="w-full"
            onClick={async () => {
              setError("");
              const res = await actions.creerCompteParAdmin({
                nom,
                telephone,
                role,
                paroisseId: role === "membre" ? null : parish,
              });
              if (!res.ok) {
                setError(res.message);
                return;
              }
              setCreate(false);
              setSecret({
                nom,
                telephone,
                password: String(res.extra?.motDePasseInitial),
              });
            }}
          >
            Créer le compte
          </Bouton>
        }
      >
        <div className="space-y-4 pb-2">
          {error && <Alerte ton="danger">{error}</Alerte>}
          <Champ label="Nom complet">
            <Input
              autoFocus
              maxLength={100}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Prénom et nom"
            />
          </Champ>
          <Champ
            label="Numéro de téléphone"
            hint="Ce numéro sera son identifiant de connexion."
          >
            <Input
              type="tel"
              maxLength={20}
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="08X XXX XXXX"
            />
          </Champ>
          <Champ label="Rôle">
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {ROLES.filter((r) => r.id !== "responsable").map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Champ>
          {role !== "membre" && (
            <Champ label="Paroisse">
              <Select
                value={parish}
                onChange={(e) => setParish(e.target.value)}
              >
                <option value="">Choisir une paroisse</option>
                {s.paroisses.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom}
                  </option>
                ))}
              </Select>
            </Champ>
          )}
          {!s.paroisses.length && (
            <button
              className="primary-link text-sm"
              onClick={() => {
                setCreate(false);
                nav.aller({ nom: "paroisses" });
              }}
            >
              Ajouter d'abord une paroisse{" "}
              <ArrowUpRight size={14} className="inline" />
            </button>
          )}
          <p className="text-xs leading-6 text-[var(--muted)]">
            Un mot de passe initial sera généré automatiquement et affiché une
            seule fois. Conservez-le confidentiellement : il reste utilisable en
            cas d'oubli.
          </p>
        </div>
      </Modale>
      <Modale
        ouvert={!!secret}
        onFermer={() => setSecret(null)}
        titre="Les identifiants sont prêts"
      >
        <div className="space-y-4 pb-2">
          <div className="flex items-center gap-3 text-[var(--blue)]">
            <UsersRound size={22} />
            <strong>{secret?.nom}</strong>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Transmettez ces informations uniquement à la personne concernée. Le
            mot de passe ne sera plus affiché après fermeture.
          </p>
          <div className="rounded-xl bg-[var(--surface-2)] p-4">
            <p className="text-xs text-[var(--muted)]">Identifiant</p>
            <p className="mt-1 font-semibold">{secret?.telephone}</p>
            <p className="mt-4 text-xs text-[var(--muted)]">
              Mot de passe initial
            </p>
            <p className="mt-1 break-all font-mono text-lg font-semibold">
              {secret?.password}
            </p>
          </div>
          <p className="break-all rounded-xl border border-[var(--border)] px-4 py-3 text-xs text-[var(--blue)]">
            {url}?tel={encodeURIComponent(secret?.telephone ?? "")}
          </p>
          {connection.mode === "local" && (
            <Alerte ton="info">
              Ce compte est enregistré sur cet appareil. Le lien fonctionnera
              sur d'autres téléphones après mise en ligne du serveur partagé et
              création du compte sur celui-ci.
            </Alerte>
          )}
          <Bouton
            className="w-full"
            onClick={() =>
              copy(
                `${connection.mode === "local" ? "ACCÈS LOCAL UNIQUEMENT. Ce compte n'est pas encore disponible sur les autres téléphones.\n\n" : ""}Bonjour ${secret?.nom},\nVoici votre accès à JEFAC Rapports.\nLien : ${url}?tel=${encodeURIComponent(secret?.telephone ?? "")}\nIdentifiant : ${secret?.telephone}\nMot de passe initial : ${secret?.password}\nConservez ce mot de passe confidentiellement. Il reste valable en cas d'oubli.`,
              )
            }
          >
            <Copy size={16} />{" "}
            {connection.mode === "local"
              ? "Conserver les identifiants locaux"
              : "Copier le message d'accès"}
          </Bouton>
        </div>
      </Modale>
      <Modale
        ouvert={!!manage}
        onFermer={() => setManage(null)}
        titre={manage?.nom}
      >
        <div className="space-y-2 pb-2">
          <Bouton
            className="w-full"
            variante="contour"
            onClick={() =>
              copy(
                `Connexion JEFAC Rapports : ${url}\nIdentifiant : ${manage?.telephone}`,
              )
            }
          >
            <Copy size={15} /> Copier le lien et l'identifiant
          </Bouton>
          <Bouton
            className="w-full"
            variante="contour"
            onClick={() => {
              if (manage?.role === "responsable") {
                setManage(null);
                nav.aller({ nom: "compte" });
              } else {
                setResetTarget(manage);
                setManage(null);
              }
            }}
          >
            <KeyRound size={15} />{" "}
            {manage?.role === "responsable"
              ? "Modifier mon mot de passe"
              : "Générer un nouveau mot de passe initial"}
          </Bouton>
          {manage?.role !== "responsable" && (
            <>
              <Bouton
                className="w-full"
                variante="contour"
                onClick={async () => {
                  const res = await actions.basculerStatutCompte(manage!.id);
                  toast(res.message);
                  setManage(null);
                }}
              >
                {manage?.statut === "actif"
                  ? "Désactiver le compte"
                  : "Activer le compte"}
              </Bouton>
              <Bouton
                className="w-full"
                variante="fantome"
                onClick={() => {
                  setDeleteTarget(manage);
                  setManage(null);
                }}
              >
                Supprimer le compte
              </Bouton>
            </>
          )}
        </div>
      </Modale>
      <Modale
        ouvert={!!resetTarget}
        onFermer={() => setResetTarget(null)}
        titre="Remplacer le mot de passe initial ?"
        pied={
          <Bouton
            className="w-full"
            onClick={async () => {
              if (!resetTarget) return;
              const res = await actions.reinitialiserMotDePasse(
                resetTarget.id,
                s.currentUserId!,
              );
              if (res.ok) {
                setSecret({
                  nom: resetTarget.nom,
                  telephone: resetTarget.telephone,
                  password: String(res.extra?.motDePasseTemporaire),
                });
                setResetTarget(null);
              } else toast(res.message, "danger");
            }}
          >
            Générer et remplacer
          </Bouton>
        }
      >
        <p className="text-sm leading-7 text-[var(--muted)]">
          L'ancien mot de passe initial et le mot de passe personnel seront
          remplacés. La personne devra utiliser le nouvel accès que vous lui
          transmettrez.
        </p>
      </Modale>
      <Modale
        ouvert={!!deleteTarget}
        onFermer={() => setDeleteTarget(null)}
        titre="Supprimer définitivement ce compte ?"
        pied={
          <div className="flex justify-end gap-2">
            <Bouton variante="contour" onClick={() => setDeleteTarget(null)}>
              Annuler
            </Bouton>
            <Bouton
              variante="danger"
              onClick={async () => {
                const res = await actions.supprimerCompte(deleteTarget!.id);
                toast(res.message);
                if (res.ok) setDeleteTarget(null);
              }}
            >
              Supprimer
            </Bouton>
          </div>
        }
      >
        <p className="text-sm leading-7 text-[var(--muted)]">
          L'accès de {deleteTarget?.nom} sera supprimé. Les rapports de sa
          paroisse seront conservés.
        </p>
      </Modale>
    </div>
  );
}
