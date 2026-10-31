import { useState } from "react";
import {
  Megaphone,
  Plus,
  Search,
  Send,
  FilePenLine,
  Archive,
  UsersRound,
  CheckCheck,
  ArrowUpRight,
  Eye,
  CalendarDays,
} from "lucide-react";
import {
  Alerte,
  Bouton,
  Champ,
  Input,
  Modale,
  Select,
  Textarea,
  useToast,
} from "@/components/ui";
import { AppShell } from "@/components/AppShell";
import { actions, useAppState } from "@/store/store";
import { useNav } from "@/navigation";
import { useConnection } from "@/db/connection";
import type { Communique } from "@/lib/types";

const CATEGORIES = {
  information: "Information",
  formation: "Formation",
  important: "Important",
};
const STATUTS = {
  publie: "Publié",
  brouillon: "Brouillon",
  archive: "Archivé",
};
const datePublication = (date: string) =>
  new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Kinshasa",
  });

export function AdminCommuniques() {
  const state = useAppState();
  const toast = useToast();
  const [filter, setFilter] = useState("tous");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<Communique | "nouveau" | null>(null);
  const [archive, setArchive] = useState<Communique | null>(null);
  const [preview, setPreview] = useState<Communique | null>(null);
  const posts = state.communiques
    .filter(
      (c) =>
        (filter === "tous" || c.statut === filter) &&
        `${c.titre} ${c.contenu}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
    )
    .sort((a, b) => b.modifieLe.localeCompare(a.modifieLe));

  return (
    <div className="entry">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow mb-3">La vie du doyenné</p>
          <h1 className="page-title">Communiqués</h1>
          <p className="page-description">
            Un message, toutes vos paroisses informées.
          </p>
        </div>
        <Bouton onClick={() => setEditor("nouveau")}>
          <Plus size={17} /> Nouveau communiqué
        </Bouton>
      </div>
      <div className="section-toolbar">
        <div
          className="line-tabs"
          role="tablist"
          aria-label="Statut des communiqués"
        >
          {[
            ["tous", "Tous"],
            ["publie", "Publiés"],
            ["brouillon", "Brouillons"],
            ["archive", "Archives"],
          ].map(([id, label]) => (
            <button
              role="tab"
              aria-selected={filter === id}
              key={id}
              className={filter === id ? "active" : ""}
              onClick={() => setFilter(id)}
            >
              {label}{" "}
              <span className="ml-1 text-[11px] opacity-60">
                {
                  state.communiques.filter(
                    (c) => id === "tous" || c.statut === id,
                  ).length
                }
              </span>
            </button>
          ))}
        </div>
        <label className="relative block">
          <Search
            size={15}
            className="absolute left-3 top-[15px] text-[var(--muted)]"
          />
          <input
            className="h-11 w-full rounded-lg border border-[var(--border)] bg-white pl-9 pr-3 text-xs sm:w-52"
            placeholder="Rechercher un communiqué"
            aria-label="Rechercher un communiqué"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {!posts.length ? (
        <div className="empty-posts">
          <div className="comm-symbol">
            <Megaphone />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            {query || filter !== "tous"
              ? "Aucun communiqué trouvé"
              : "Faites passer le message."}
          </h2>
          <p className="mx-auto mt-3 max-w-[365px] text-sm leading-7 text-[var(--muted)]">
            {query || filter !== "tous"
              ? "Essayez une autre recherche ou un autre filtre."
              : "Une rencontre, une consigne, une nouvelle du mouvement. Vos communiqués apparaîtront dans l'espace de chaque utilisateur."}
          </p>
          {!query && filter === "tous" && (
            <button
              className="primary-link mt-6 inline-flex min-h-11 items-center gap-2 text-sm"
              onClick={() => setEditor("nouveau")}
            >
              Rédiger mon premier communiqué <ArrowUpRight size={16} />
            </button>
          )}
        </div>
      ) : (
        posts.map((c, index) => (
          <article
            className="communique-row"
            style={{ animationDelay: `${Math.min(index, 5) * 42}ms` }}
            key={c.id}
          >
            <div
              className="comm-symbol"
              style={
                c.categorie === "important"
                  ? { background: "var(--accent-soft)", color: "var(--accent)" }
                  : undefined
              }
            >
              <Megaphone />
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
                <span
                  className={
                    c.statut === "publie"
                      ? "text-[var(--blue)]"
                      : "text-[var(--muted)]"
                  }
                >
                  {STATUTS[c.statut]}
                </span>
                <span className="h-3 border-l border-[var(--border)]" />
                <span className="text-[var(--muted)]">
                  {CATEGORIES[c.categorie]}
                </span>
              </div>
              <button className="text-left" onClick={() => setPreview(c)}>
                <h3>{c.titre}</h3>
              </button>
              <p className="mt-2 line-clamp-2 max-w-[650px] whitespace-pre-wrap text-[13px] leading-6 text-[var(--muted)]">
                {c.contenu}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[var(--muted)]">
                <span>{datePublication(c.publieLe || c.creeLe)}</span>
                <span className="inline-flex items-center gap-1">
                  <UsersRound size={13} /> Tous les utilisateurs
                </span>
                {c.statut === "publie" && (
                  <span className="inline-flex items-center gap-1">
                    <Eye size={13} />{" "}
                    {c.lusPar.filter((uid) => uid !== c.auteurId).length}{" "}
                    lecture(s)
                  </span>
                )}
              </div>
            </div>
            <div className="row-actions flex gap-1">
              <button
                className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)]"
                aria-label={`Modifier ${c.titre}`}
                onClick={() => setEditor(c)}
              >
                <FilePenLine size={16} />
              </button>
              {c.statut !== "archive" && (
                <button
                  className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)]"
                  aria-label={`Archiver ${c.titre}`}
                  onClick={() => setArchive(c)}
                >
                  <Archive size={16} />
                </button>
              )}
            </div>
          </article>
        ))
      )}
      <div className="mt-7 flex items-start gap-2 text-xs leading-6 text-[var(--muted)]">
        <UsersRound size={15} className="mt-1 shrink-0" /> Les communiqués
        publiés sont visibles par tous les comptes actifs, y compris les futurs
        utilisateurs. Les brouillons restent privés.
      </div>
      {editor && (
        <EditeurCommunique
          key={typeof editor === "string" ? "new" : editor.id}
          communique={editor === "nouveau" ? undefined : editor}
          onFermer={() => setEditor(null)}
        />
      )}
      <Modale
        ouvert={!!archive}
        onFermer={() => setArchive(null)}
        titre="Archiver ce communiqué ?"
        pied={
          <div className="flex justify-end gap-2">
            <Bouton variante="contour" onClick={() => setArchive(null)}>
              Annuler
            </Bouton>
            <Bouton
              onClick={async () => {
                if (!archive) return;
                const res = await actions.archiverCommunique(archive.id);
                toast(res.message, res.ok ? "ok" : "danger");
                if (res.ok) setArchive(null);
              }}
            >
              Archiver
            </Bouton>
          </div>
        }
      >
        <p className="text-sm leading-7 text-[var(--muted)]">
          « {archive?.titre} » ne sera plus visible par les utilisateurs. Vous
          pourrez le retrouver dans les archives et le republier.
        </p>
      </Modale>
      <Modale
        ouvert={!!preview}
        onFermer={() => setPreview(null)}
        titre="Aperçu du communiqué"
        large
      >
        {preview && <ContenuCommunique c={preview} />}
      </Modale>
    </div>
  );
}

function EditeurCommunique({
  communique,
  onFermer,
}: {
  communique?: Communique;
  onFermer: () => void;
}) {
  const state = useAppState();
  const connection = useConnection();
  const toast = useToast();
  const [titre, setTitre] = useState(communique?.titre ?? "");
  const [contenu, setContenu] = useState(communique?.contenu ?? "");
  const [categorie, setCategorie] = useState<Communique["categorie"]>(
    communique?.categorie ?? "information",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(publier: boolean) {
    if (busy) return;
    setError("");
    setBusy(true);
    const res = await actions.enregistrerCommunique({
      id: communique?.id,
      titre,
      contenu,
      categorie,
      publier,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    toast(
      connection.mode === "local" && publier
        ? "Communiqué enregistré sur cet appareil. Le partage distant nécessite le serveur."
        : res.message,
      "ok",
    );
    onFermer();
  }
  return (
    <Modale
      ouvert
      onFermer={busy ? () => {} : onFermer}
      large
      titre={communique ? "Modifier le communiqué" : "Nouveau communiqué"}
      pied={
        <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <Bouton
            variante="contour"
            disabled={busy}
            onClick={() => save(false)}
          >
            Enregistrer le brouillon
          </Bouton>
          <Bouton disabled={busy} onClick={() => save(true)}>
            <Send size={15} />{" "}
            {busy ? "Enregistrement…" : "Publier le communiqué"}
          </Bouton>
        </div>
      }
    >
      <div className="space-y-5 pb-3 pt-2">
        {error && <Alerte ton="danger">{error}</Alerte>}
        <div className="flex items-center gap-3 rounded-xl bg-[var(--blue-soft)] p-4 text-[var(--blue)]">
          <UsersRound size={21} />
          <div>
            <div className="text-sm font-semibold">À tous les utilisateurs</div>
            <div className="mt-1 text-xs">
              {
                state.utilisateurs.filter(
                  (u) => u.statut === "actif" && u.role !== "responsable",
                ).length
              }{" "}
              destinataire(s) actuel(s), dans toutes les paroisses
            </div>
          </div>
        </div>
        <Champ label="Titre du communiqué">
          <Input
            autoFocus
            maxLength={120}
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Quel message souhaitez-vous transmettre ?"
          />
        </Champ>
        <Champ label="Catégorie">
          <Select
            value={categorie}
            onChange={(e) =>
              setCategorie(e.target.value as Communique["categorie"])
            }
          >
            {Object.entries(CATEGORIES).map(([id, title]) => (
              <option value={id} key={id}>
                {title}
              </option>
            ))}
          </Select>
        </Champ>
        <Champ
          label="Votre message"
          hint={`${contenu.length.toLocaleString("fr-FR")} / 6 000 caractères`}
        >
          <Textarea
            rows={8}
            maxLength={6000}
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            placeholder="Chers responsables et membres du mouvement…"
          />
        </Champ>
        <p className="text-xs leading-6 text-[var(--muted)]">
          Votre nom et la date de publication seront affichés. Une notification
          dans l'application accompagnera le communiqué.
        </p>
      </div>
    </Modale>
  );
}

function ContenuCommunique({ c }: { c: Communique }) {
  return (
    <article className="pb-4">
      <span className="eyebrow">{CATEGORIES[c.categorie]}</span>
      <h2 className="mb-3 mt-3 text-2xl font-semibold tracking-tight">
        {c.titre}
      </h2>
      <p className="mb-7 flex items-center gap-2 text-xs text-[var(--muted)]">
        <CalendarDays size={14} /> {datePublication(c.publieLe || c.creeLe)} ·{" "}
        {c.auteurNom}
      </p>
      <div className="post-body">{c.contenu}</div>
      <div className="mt-8 border-t border-[var(--border)] pt-4 text-xs font-medium text-[var(--blue)]">
        L'administration du doyenné
      </div>
    </article>
  );
}

export function EcranCommuniques() {
  const state = useAppState();
  const nav = useNav();
  const [unread, setUnread] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const uid = state.currentUserId!;
  const posts = state.communiques
    .filter((c) => c.statut === "publie")
    .sort((a, b) => (b.publieLe || "").localeCompare(a.publieLe || ""));
  const shown = posts.filter((c) => !unread || !c.lusPar.includes(uid));
  const active = posts.find((c) => c.id === selected);
  return (
    <AppShell
      titre="Communiqués"
      sousTitre="Les nouvelles de votre doyenné"
      retour
      onRetour={nav.retour}
    >
      <div className="entry mx-auto max-w-[820px]">
        <div className="mb-7">
          <p className="eyebrow mb-3">Restons en lien</p>
          <h1 className="page-title">La vie du mouvement</h1>
          <p className="page-description">
            Retrouvez ici les messages de l'administration.
          </p>
        </div>
        <div className="section-toolbar">
          <div className="line-tabs">
            <button
              className={!unread ? "active" : ""}
              onClick={() => setUnread(false)}
            >
              Tous les communiqués
            </button>
            <button
              className={unread ? "active" : ""}
              onClick={() => setUnread(true)}
            >
              Non lus{" "}
              <span className="ml-1 opacity-60">
                {posts.filter((c) => !c.lusPar.includes(uid)).length}
              </span>
            </button>
          </div>
        </div>
        {shown.length ? (
          shown.map((c) => (
            <button
              key={c.id}
              onClick={async () => {
                setSelected(c.id);
                await actions.lireCommunique(c.id);
              }}
              className="communique-row w-full text-left"
            >
              <span className="comm-symbol">
                <Megaphone />
              </span>
              <span>
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[var(--blue)]">
                  {CATEGORIES[c.categorie]}
                  {!c.lusPar.includes(uid) && (
                    <span className="ml-3 text-[var(--accent)]">Nouveau</span>
                  )}
                </span>
                <span className="block text-[16px] font-semibold">
                  {c.titre}
                </span>
                <span className="mt-2 line-clamp-2 block text-[13px] leading-6 text-[var(--muted)]">
                  {c.contenu}
                </span>
                <span className="mt-3 block text-xs text-[var(--muted)]">
                  {datePublication(c.publieLe || c.creeLe)}
                </span>
              </span>
              <ArrowUpRight
                size={17}
                className="desktop-only mt-2 text-[var(--muted)]"
              />
            </button>
          ))
        ) : (
          <div className="empty-posts">
            <div className="comm-symbol">
              {unread ? <CheckCheck /> : <Megaphone />}
            </div>
            <h2 className="text-lg font-semibold">
              {unread ? "Vous êtes à jour." : "Les nouvelles arrivent ici."}
            </h2>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {unread
                ? "Tous les communiqués ont été lus."
                : "Dès que l'administration publie un communiqué, vous le retrouverez dans cet espace."}
            </p>
          </div>
        )}
        <Modale
          ouvert={!!active}
          onFermer={() => setSelected(null)}
          titre="Communiqué du doyenné"
          large
        >
          {active && <ContenuCommunique c={active} />}
        </Modale>
      </div>
    </AppShell>
  );
}

export function AccesCommuniques() {
  const s = useAppState();
  const nav = useNav();
  const posts = s.communiques.filter((c) => c.statut === "publie");
  const count = posts.filter(
    (c) => !c.lusPar.includes(s.currentUserId!),
  ).length;
  return (
    <button
      onClick={() => nav.aller({ nom: "communiques" })}
      className="my-4 flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-4 py-4 text-left transition hover:border-[var(--blue)]"
    >
      <Megaphone size={20} className="shrink-0 text-[var(--blue)]" />
      <span className="grow">
        <span className="block text-sm font-semibold">
          Communiqués du doyenné
        </span>
        <span className="mt-1 block text-xs text-[var(--muted)]">
          {count
            ? `${count} nouveau(x) message(s) à lire`
            : "Les messages de l'administration"}
        </span>
      </span>
      {count > 0 ? (
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-[var(--accent)] text-[11px] text-white">
          {count}
        </span>
      ) : (
        <ArrowUpRight size={16} className="text-[var(--muted)]" />
      )}
    </button>
  );
}
