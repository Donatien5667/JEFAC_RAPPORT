import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  IconeAlerte,
  IconeJeunes,
  IconePlus,
  IconeRecherche,
  IconeTel,
} from "@/components/Icones";
import {
  Alerte,
  Bouton,
  Carte,
  Champ,
  Etiquette,
  Input,
  Modale,
  Select,
  Textarea,
  useToast,
} from "@/components/ui";
import { TRANCHES, type Tranche } from "@/lib/types";
import {
  age,
  formatTel,
  normaliserTel,
  trancheInfo,
  tranchePourAge,
} from "@/lib/utils";
import { actions, useAppState } from "@/store/store";
import {
  jeunesDe,
  passationsDe,
  suggestionsPassation,
} from "@/store/selectors";
import { useNav } from "@/navigation";

export function EcranJeunes() {
  const etat = useAppState();
  const nav = useNav();
  const toast = useToast();
  const u = etat.utilisateurs.find((x) => x.id === etat.currentUserId)!;
  const paroisseId = u.paroisseId ?? "";
  const [filtre, setFiltre] = useState<Tranche | "TOUS">("TOUS");
  const [recherche, setRecherche] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const jeunes = jeunesDe(etat, paroisseId);
  const suggestions = suggestionsPassation(etat, paroisseId);

  const liste = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return jeunes.filter((j) => {
      if (filtre !== "TOUS" && j.tranche !== filtre) return false;
      if (!q) return true;
      return `${j.prenom} ${j.nom}`.toLowerCase().includes(q);
    });
  }, [jeunes, filtre, recherche]);

  const detail = jeunes.find((j) => j.id === detailId) ?? null;

  return (
    <AppShell
      titre="Jeunes"
      sousTitre={`${jeunes.length} inscrit(s) · ${etat.paroisses.find((p) => p.id === paroisseId)?.nom ?? ""}`}
      retour
      onRetour={() => nav.retour()}
      actions={
        <button
          onClick={() => nav.aller({ nom: "ajout-jeune" })}
          aria-label="Ajouter un jeune"
          className="grid h-11 w-11 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-contrast)]"
        >
          <IconePlus className="h-5 w-5" />
        </button>
      }
    >
      <div className="relative">
        <IconeRecherche className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" />
        <Input
          className="pl-11"
          placeholder="Rechercher un jeune…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFiltre("TOUS")}
          className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold border ${
            filtre === "TOUS"
              ? "bg-[var(--accent)] text-[var(--accent-contrast)] border-transparent"
              : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)]"
          }`}
        >
          Tous
        </button>
        {TRANCHES.map((t) => (
          <button
            key={t.id}
            onClick={() => setFiltre(t.id)}
            className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold border ${
              filtre === t.id
                ? "bg-[var(--accent)] text-[var(--accent-contrast)] border-transparent"
                : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-3 space-y-2">
          {suggestions.map((s) => (
            <Carte key={s.jeune.id} className="border-[var(--warn)]">
              <div className="flex items-start gap-2">
                <IconeAlerte className="mt-0.5 h-5 w-5 text-[var(--warn)]" />
                <div className="grow">
                  <div className="font-bold text-[15px]">
                    {s.jeune.prenom} {s.jeune.nom}
                  </div>
                  <div className="text-[13.5px] text-[var(--muted)] mt-0.5">
                    {s.message}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {s.type === "passer" && s.trancheCible && (
                      <Bouton
                        taille="sm"
                        onClick={async () => {
                          const res = await actions.deciderPassation(
                            s.jeune.id,
                            "passe",
                            s.trancheCible!,
                            u.id,
                          );
                          toast(res.message, res.ok ? "ok" : "danger");
                        }}
                      >
                        Passer en {trancheInfo(s.trancheCible).label}
                      </Bouton>
                    )}
                    {s.type === "sortir" && (
                      <Bouton
                        taille="sm"
                        variante="danger"
                        onClick={async () => {
                          const res = await actions.supprimerJeune(s.jeune.id);
                          toast(res.message, res.ok ? "ok" : "danger");
                        }}
                      >
                        Sortir de la liste
                      </Bouton>
                    )}
                    {s.type === "corriger" && (
                      <Bouton
                        taille="sm"
                        variante="contour"
                        onClick={() => setDetailId(s.jeune.id)}
                      >
                        Corriger la fiche
                      </Bouton>
                    )}
                    <Bouton
                      taille="sm"
                      variante="contour"
                      onClick={async () => {
                        const res = await actions.deciderPassation(
                          s.jeune.id,
                          "maintenu",
                          s.jeune.tranche,
                          u.id,
                        );
                        toast(res.message, res.ok ? "ok" : "danger");
                      }}
                    >
                      Garder ici
                    </Bouton>
                  </div>
                </div>
              </div>
            </Carte>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {liste.length === 0 && (
          <Carte>
            <div className="py-6 text-center">
              <IconeJeunes className="mx-auto h-9 w-9 text-[var(--muted)]" />
              <p className="mt-2 text-[14px] text-[var(--muted)]">
                Aucun jeune dans cette liste. Ajoutez le premier inscrit de la
                paroisse.
              </p>
            </div>
          </Carte>
        )}
        {liste.map((j) => {
          const a = age(j.dateNaissance);
          const info = trancheInfo(j.tranche);
          return (
            <Carte key={j.id} onClick={() => setDetailId(j.id)}>
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--surface-2)] text-[14px] font-bold text-[var(--muted)]">
                  {j.prenom[0]}
                  {j.nom[0]}
                </div>
                <div className="min-w-0 grow">
                  <div className="font-semibold text-[15px] truncate">
                    {j.prenom} {j.nom}
                  </div>
                  <div className="text-[12.5px] text-[var(--muted)]">
                    {a} ans · {j.sexe === "M" ? "Garçon" : "Fille"}
                    {j.telParent ? ` · parent ${formatTel(j.telParent)}` : ""}
                  </div>
                </div>
                <Etiquette ton={j.tranche === "CADETS" ? "accent" : "info"}>
                  {info.label}
                </Etiquette>
              </div>
            </Carte>
          );
        })}
      </div>

      <Modale
        ouvert={!!detail}
        onFermer={() => setDetailId(null)}
        titre={detail ? `${detail.prenom} ${detail.nom}` : ""}
        pied={
          detail ? (
            <div className="flex gap-2">
              <Bouton
                variante="contour"
                className="grow"
                onClick={async () => {
                  const res = await actions.supprimerJeune(detail.id);
                  toast(res.message, res.ok ? "ok" : "danger");
                  setDetailId(null);
                }}
              >
                Sortir de la liste
              </Bouton>
              <Bouton
                className="grow"
                onClick={() => {
                  setDetailId(null);
                  nav.aller({ nom: "ajout-jeune", jeuneId: detail.id });
                }}
              >
                Modifier
              </Bouton>
            </div>
          ) : null
        }
      >
        {detail && (
          <div className="space-y-3 pb-2">
            <div className="grid grid-cols-2 gap-2">
              <Carte className="p-3">
                <div className="text-[12.5px] text-[var(--muted)]">Âge</div>
                <div className="text-[17px] font-bold">
                  {age(detail.dateNaissance)} ans
                </div>
              </Carte>
              <Carte className="p-3">
                <div className="text-[12.5px] text-[var(--muted)]">Tranche</div>
                <div className="text-[17px] font-bold">
                  {trancheInfo(detail.tranche).label}
                </div>
              </Carte>
            </div>
            <div className="text-[14px] text-[var(--muted)]">
              Né(e) le{" "}
              {new Date(detail.dateNaissance).toLocaleDateString("fr-FR")}
            </div>
            {detail.telParent && (
              <div className="flex items-center gap-2 text-[14px]">
                <IconeTel className="h-4 w-4 text-[var(--accent)]" />
                Parent : {formatTel(detail.telParent)}
              </div>
            )}
            {detail.telJeune && (
              <div className="flex items-center gap-2 text-[14px]">
                <IconeTel className="h-4 w-4 text-[var(--accent)]" />
                Le jeune : {formatTel(detail.telJeune)}
              </div>
            )}
            {detail.note && <div className="text-[14px]">{detail.note}</div>}
            <div>
              <div className="mb-1 text-[13px] font-semibold text-[var(--muted)]">
                Changer de tranche
              </div>
              <Select
                value={detail.tranche}
                onChange={async (e) => {
                  const res = await actions.deciderPassation(
                    detail.id,
                    "passe",
                    e.target.value as Tranche,
                    u.id,
                  );
                  toast(res.message, res.ok ? "ok" : "danger");
                }}
              >
                {TRANCHES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.ages})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <div className="mb-1 text-[13px] font-semibold text-[var(--muted)]">
                Historique des décisions
              </div>
              {passationsDe(etat, detail.id).length === 0 ? (
                <p className="text-[13.5px] text-[var(--muted)]">
                  Aucune décision enregistrée.
                </p>
              ) : (
                <div className="space-y-1">
                  {passationsDe(etat, detail.id).map((p) => (
                    <div
                      key={p.id}
                      className="text-[13.5px] text-[var(--muted)]"
                    >
                      {p.date} —{" "}
                      {p.decision === "passe" ? "passé en " : "maintenu en "}
                      {trancheInfo(p.trancheArrivee).label} ({p.decideur})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modale>
    </AppShell>
  );
}

export function EcranAjoutJeune({ jeuneId }: { jeuneId?: string }) {
  const etat = useAppState();
  const nav = useNav();
  const toast = useToast();
  const u = etat.utilisateurs.find((x) => x.id === etat.currentUserId)!;
  const paroisseId = u.paroisseId ?? "";
  const existant = jeuneId
    ? etat.jeunes.find((j) => j.id === jeuneId)
    : undefined;

  const [prenom, setPrenom] = useState(existant?.prenom ?? "");
  const [nom, setNom] = useState(existant?.nom ?? "");
  const [sexe, setSexe] = useState<"M" | "F">(existant?.sexe ?? "M");
  const [naissance, setNaissance] = useState(existant?.dateNaissance ?? "");
  const [tranche, setTranche] = useState<Tranche>(
    existant?.tranche ?? "CADETS",
  );
  const [telParent, setTelParent] = useState(existant?.telParent ?? "");
  const [telJeune, setTelJeune] = useState(existant?.telJeune ?? "");
  const [note, setNote] = useState(existant?.note ?? "");
  const [erreur, setErreur] = useState("");

  const a = naissance ? age(naissance) : null;
  const detecte = a !== null ? tranchePourAge(a) : null;

  async function enregistrer() {
    setErreur("");
    if (!prenom.trim() || !nom.trim()) {
      setErreur("Le prénom et le nom du jeune sont obligatoires.");
      return;
    }
    if (!naissance) {
      setErreur("La date de naissance est obligatoire.");
      return;
    }
    if (
      (tranche === "CADETS" || tranche === "JUNIORS") &&
      normaliserTel(telParent).length < 9
    ) {
      setErreur(
        "Le téléphone d'un parent est obligatoire pour les cadets et les juniors.",
      );
      return;
    }
    if (existant) {
      const res = await actions.modifierJeune(existant.id, {
        prenom: prenom.trim(),
        nom: nom.trim(),
        sexe,
        dateNaissance: naissance,
        tranche,
        telParent: telParent ? normaliserTel(telParent) : undefined,
        telJeune: telJeune ? normaliserTel(telJeune) : undefined,
        note: note.trim() || undefined,
      });
      toast(res.message, res.ok ? "ok" : "danger");
      if (res.ok) nav.retour();
      return;
    }
    const res = await actions.ajouterJeune({
      paroisseId,
      prenom: prenom.trim(),
      nom: nom.trim(),
      sexe,
      dateNaissance: naissance,
      tranche,
      telParent: telParent ? normaliserTel(telParent) : undefined,
      telJeune: telJeune ? normaliserTel(telJeune) : undefined,
      note: note.trim() || undefined,
    });
    toast(res.message, res.ok ? "ok" : "danger");
    if (res.ok) nav.retour();
  }

  return (
    <AppShell
      titre={existant ? "Modifier le jeune" : "Nouveau jeune"}
      sousTitre={existant ? "Mise à jour de la fiche" : "Fiche d'inscription"}
      retour
      onRetour={() => nav.retour()}
    >
      <div className="space-y-3">
        {erreur && <Alerte ton="danger">{erreur}</Alerte>}
        <Carte className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Champ label="Prénom">
              <Input
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Mbayo"
              />
            </Champ>
            <Champ label="Nom">
              <Input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ilunga"
              />
            </Champ>
          </div>
          <Champ label="Sexe">
            <Select
              value={sexe}
              onChange={(e) => setSexe(e.target.value as "M" | "F")}
            >
              <option value="M">Garçon</option>
              <option value="F">Fille</option>
            </Select>
          </Champ>
          <Champ label="Date de naissance">
            <Input
              type="date"
              value={naissance}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => {
                setNaissance(e.target.value);
                const det = tranchePourAge(age(e.target.value));
                if (det.tranche) setTranche(det.tranche);
              }}
            />
          </Champ>
          {detecte && (
            <Alerte ton={detecte.alerte ? "warn" : "info"}>
              {detecte.alerte === "trop_jeune"
                ? "Moins de 6 ans : vérifiez la date de naissance."
                : detecte.alerte === "trop_vieux"
                  ? "Au-delà de 30 ans : ce jeune ne devrait plus figurer dans la liste."
                  : `Tranche détectée : ${trancheInfo(detecte.tranche!).label} (${trancheInfo(detecte.tranche!).ages}).`}
            </Alerte>
          )}
          <Champ
            label="Tranche"
            hint="La passation est toujours décidée par le chargé."
          >
            <Select
              value={tranche}
              onChange={(e) => setTranche(e.target.value as Tranche)}
            >
              {TRANCHES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} — {t.ages}
                </option>
              ))}
            </Select>
          </Champ>
          <Champ
            label="Téléphone d'un parent"
            hint="Obligatoire pour les cadets et les juniors."
          >
            <Input
              type="tel"
              inputMode="tel"
              placeholder="0815000011"
              value={telParent}
              onChange={(e) => setTelParent(e.target.value)}
            />
          </Champ>
          <Champ
            label="Téléphone du jeune"
            hint="Facultatif, utile pour les grands jeunes."
          >
            <Input
              type="tel"
              inputMode="tel"
              value={telJeune}
              onChange={(e) => setTelJeune(e.target.value)}
            />
          </Champ>
          <Champ label="Note">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Allergie, situation particulière, besoin particulier…"
            />
          </Champ>
        </Carte>
        <Bouton taille="lg" className="w-full" onClick={enregistrer}>
          {existant ? "Enregistrer les modifications" : "Enregistrer le jeune"}
        </Bouton>
      </div>
    </AppShell>
  );
}
