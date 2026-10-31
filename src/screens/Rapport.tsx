import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  IconeAlerte,
  IconeCoche,
  IconeCroix,
  IconeTelecharger,
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
import { compresserImage, formatDateLong, toISODate } from "@/lib/utils";
import { actions, useAppState } from "@/store/store";
import {
  estEnRetard,
  etatAbonnement,
  jeunesTranche,
  manquesRapport,
  presenceDe,
  rapportDe,
  statsRapport,
} from "@/store/selectors";
import { useNav } from "@/navigation";
import { blocsRapport } from "@/pdf";
import { useImpression } from "@/impression";

export function EcranRapport() {
  const etat = useAppState();
  const nav = useNav();
  const toast = useToast();
  const imprimer = useImpression();
  const u = etat.utilisateurs.find((x) => x.id === etat.currentUserId)!;
  const paroisse = etat.paroisses.find((p) => p.id === u.paroisseId);
  const d = new Date();
  const jour = d.getDay();
  d.setDate(d.getDate() - jour);
  const dimancheIso = toISODate(d);

  const [confirmation, setConfirmation] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const rapportExistant = rapportDe(etat, paroisse?.id ?? "", dimancheIso);
  useEffect(() => {
    if (!rapportExistant)
      actions.assurerRapport(paroisse?.id ?? "", dimancheIso);
  }, [rapportExistant, paroisse?.id, dimancheIso]);

  if (!rapportExistant) {
    return (
      <AppShell
        titre="Rapport du dimanche"
        sousTitre={formatDateLong(dimancheIso)}
        retour
        onRetour={() => nav.retour()}
      >
        <Carte>Préparation de la fiche du rapport…</Carte>
      </AppShell>
    );
  }
  const rapport = rapportExistant;
  const verrouille = rapport.statut === "envoye";
  const manquants = manquesRapport(etat, rapport);
  const etatAbo = etatAbonnement(etat, paroisse?.id ?? "");
  const bloque = etatAbo === "EXPIRE" || etatAbo === "SANS";

  function maj(tranche: Tranche, patch: Record<string, unknown>) {
    actions.majFiche(rapport.id, tranche, patch);
  }

  async function ajouterPhoto(tranche: Tranche, fichier: File | undefined) {
    if (!fichier) return;
    try {
      const data = await compresserImage(fichier);
      maj(tranche, { photo: data });
      toast("Photo ajoutée et réduite pour l'envoi.", "ok");
    } catch {
      toast("Photo impossible à traiter.", "danger");
    }
  }

  const stats = statsRapport(etat, rapport);

  return (
    <AppShell
      titre="Rapport du dimanche"
      sousTitre={`${formatDateLong(dimancheIso)} · ${paroisse?.nom ?? ""}`}
      retour
      onRetour={() => nav.retour()}
    >
      {verrouille && (
        <Alerte ton="ok" titre="Rapport envoyé" className="mb-3">
          Le rapport est verrouillé. Seul le responsable du doyenné peut le
          rouvrir pour correction.
        </Alerte>
      )}
      {bloque && !verrouille && (
        <Alerte ton="danger" titre="Envoi bloqué" className="mb-3">
          L'abonnement est {etatAbo === "EXPIRE" ? "échu" : "absent"}. Vos
          données sont conservées ; contactez le responsable du doyenné.
        </Alerte>
      )}
      {estEnRetard(etat, rapport) && !verrouille && (
        <Alerte ton="danger" titre="Rapport en retard" className="mb-3">
          Un rapport non envoyé est considéré en retard à partir du lundi midi.
        </Alerte>
      )}

      <Carte className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Champ label="Heure de début">
            <Input
              placeholder="09h00"
              value={rapport.debut}
              disabled={verrouille}
              onChange={(e) =>
                actions.majRapport(rapport.id, { debut: e.target.value })
              }
            />
          </Champ>
          <Champ label="Heure de fin">
            <Input
              placeholder="12h30"
              value={rapport.fin}
              disabled={verrouille}
              onChange={(e) =>
                actions.majRapport(rapport.id, { fin: e.target.value })
              }
            />
          </Champ>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-[12.5px] text-[var(--muted)]">
            Enregistré automatiquement · {stats.inscrits} jeune(s) ·{" "}
            {stats.presents} présent(s)
          </div>
          <Etiquette ton={verrouille ? "ok" : "warn"}>
            {verrouille ? "Verrouillé" : "Brouillon"}
          </Etiquette>
        </div>
      </Carte>

      <div className="mt-4 space-y-3">
        {rapport.fiches.map((fiche) => (
          <FicheCard
            key={fiche.tranche}
            rapportId={rapport.id}
            tranche={fiche.tranche}
            fiche={fiche}
            verrouille={verrouille}
            onMaj={(patch) => maj(fiche.tranche, patch)}
            onPhoto={(f) => ajouterPhoto(fiche.tranche, f)}
          />
        ))}
      </div>

      {!verrouille && (
        <div className="mt-5 space-y-2">
          <Bouton
            taille="lg"
            className="w-full"
            onClick={() => setConfirmation(true)}
            disabled={bloque}
          >
            Envoyer le rapport
          </Bouton>
          {manquants.length > 0 && (
            <p className="text-center text-[12.5px] text-[var(--muted)]">
              {manquants.length} élément(s) manquant(s) : l'envoi sera refusé.
            </p>
          )}
        </div>
      )}

      {verrouille && (
        <div className="mt-5 space-y-2">
          <Bouton
            taille="lg"
            variante="contour"
            className="w-full"
            onClick={() =>
              imprimer(
                `Rapport de formation — ${formatDateLong(dimancheIso)}`,
                `${paroisse?.nom ?? ""} · ${etat.doyenne.nom}`,
                blocsRapport(etat, rapport),
              )
            }
          >
            <IconeTelecharger className="h-5 w-5" /> Télécharger le PDF
          </Bouton>
        </div>
      )}

      <Modale
        ouvert={confirmation}
        onFermer={() => setConfirmation(false)}
        titre="Envoyer le rapport ?"
        pied={
          <div className="flex gap-2">
            <Bouton
              variante="contour"
              className="grow"
              onClick={() => setConfirmation(false)}
            >
              Annuler
            </Bouton>
            <Bouton
              className="grow"
              disabled={manquants.length > 0 || envoi}
              onClick={async () => {
                setEnvoi(true);
                const res = await actions.envoyerRapport(rapport.id);
                setEnvoi(false);
                toast(res.message, res.ok ? "ok" : "danger");
                if (res.ok) setConfirmation(false);
              }}
            >
              Envoyer
            </Bouton>
          </div>
        }
      >
        {manquants.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[14px] text-[var(--muted)]">
              Le rapport n'est pas complet. Voici ce qui manque :
            </p>
            <ul className="space-y-1.5">
              {manquants.map((m) => (
                <li key={m} className="flex items-start gap-2 text-[14px]">
                  <IconeAlerte className="mt-0.5 h-4 w-4 shrink-0 text-[var(--danger)]" />
                  {m}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-[14px] text-[var(--muted)]">
            Le rapport sera envoyé au responsable du doyenné et verrouillé. Vous
            pourrez le consulter et télécharger le PDF.
          </p>
        )}
      </Modale>
    </AppShell>
  );
}

function FicheCard({
  rapportId,
  tranche,
  fiche,
  verrouille,
  onMaj,
  onPhoto,
}: {
  rapportId: string;
  tranche: Tranche;
  fiche: import("@/lib/types").FicheTranche;
  verrouille: boolean;
  onMaj: (patch: Record<string, unknown>) => void;
  onPhoto: (f: File | undefined) => void;
}) {
  const etat = useAppState();
  const toast = useToast();
  const info = TRANCHES.find((t) => t.id === tranche)!;
  const [ouvert, setOuvert] = useState(tranche === "CADETS");
  const fichierRef = useRef<HTMLInputElement>(null);
  const u = etat.utilisateurs.find((x) => x.id === etat.currentUserId)!;
  const jeunes = jeunesTranche(etat, u.paroisseId, tranche);
  const themes = etat.themes.filter((t) => t.tranche === tranche && !t.retire);
  const presents = jeunes.filter(
    (j) => presenceDe(etat, rapportId, j.id)?.present,
  ).length;

  return (
    <Carte className={`fiche-${tranche} p-0 overflow-hidden`}>
      <button
        onClick={() => setOuvert((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <div>
          <div className="font-bold text-[15.5px]">{info.label}</div>
          <div className="text-[12.5px] text-[var(--muted)]">
            {info.ages} · {jeunes.length} inscrit(s)
            {fiche.appelFait ? ` · appel ${presents}/${jeunes.length}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {fiche.appelFait ? (
            <Etiquette ton="ok">Appel OK</Etiquette>
          ) : (
            <Etiquette ton="warn">Appel</Etiquette>
          )}
        </div>
      </button>

      {ouvert && (
        <div className="border-t border-[var(--border)] p-4 space-y-3">
          <Champ label="Formateur / animatrice">
            <Input
              value={fiche.formateur}
              disabled={verrouille}
              placeholder="Ex. Sœur Thérèse"
              onChange={(e) => onMaj({ formateur: e.target.value })}
            />
          </Champ>

          <Champ
            label="Thème traité"
            hint="Thèmes proposés par le doyenné, ou « Autres »."
          >
            <Select
              value={fiche.themeId ?? (fiche.themeAutre ? "AUTRES" : "")}
              disabled={verrouille}
              onChange={(e) =>
                e.target.value === "AUTRES"
                  ? onMaj({ themeId: null })
                  : onMaj({ themeId: e.target.value, themeAutre: "" })
              }
            >
              <option value="">— Choisir un thème —</option>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.libelle}
                </option>
              ))}
              <option value="AUTRES">Autres</option>
            </Select>
          </Champ>

          {!fiche.themeId && (
            <Champ label="Thème (autres)">
              <Input
                value={fiche.themeAutre}
                disabled={verrouille}
                placeholder="Écrire le thème traité"
                onChange={(e) => onMaj({ themeAutre: e.target.value })}
              />
            </Champ>
          )}

          <Champ label="Résumé de la séance">
            <Textarea
              value={fiche.resume}
              disabled={verrouille}
              placeholder="Ce qui a été vécu pendant la séance…"
              onChange={(e) => onMaj({ resume: e.target.value })}
            />
          </Champ>

          <Champ label="Difficultés rencontrées">
            <Textarea
              value={fiche.difficultes}
              disabled={verrouille}
              onChange={(e) => onMaj({ difficultes: e.target.value })}
            />
          </Champ>

          <Champ label="Suggestions">
            <Textarea
              value={fiche.suggestions}
              disabled={verrouille}
              onChange={(e) => onMaj({ suggestions: e.target.value })}
            />
          </Champ>

          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-[var(--muted)]">
              Photo de la séance (facultative)
            </div>
            <input
              ref={fichierRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />
            {fiche.photo ? (
              <div className="flex items-center gap-3">
                <img
                  src={fiche.photo}
                  alt="Photo de la séance"
                  className="h-20 w-20 rounded-2xl object-cover"
                />
                {!verrouille && (
                  <Bouton
                    taille="sm"
                    variante="contour"
                    onClick={() => onMaj({ photo: null })}
                  >
                    Retirer
                  </Bouton>
                )}
              </div>
            ) : (
              <Bouton
                taille="sm"
                variante="contour"
                disabled={verrouille}
                onClick={() => fichierRef.current?.click()}
              >
                Ajouter une photo
              </Bouton>
            )}
          </div>

          <div className="rounded-2xl bg-[var(--surface-2)] p-3">
            <div className="flex items-center justify-between">
              <div className="text-[14px] font-bold">Appel</div>
              <Etiquette ton={fiche.appelFait ? "ok" : "warn"}>
                {presents}/{jeunes.length} présents
              </Etiquette>
            </div>
            {jeunes.length === 0 ? (
              <p className="mt-2 text-[13px] text-[var(--muted)]">
                Aucun jeune dans cette tranche : l'appel n'est pas nécessaire.
              </p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {jeunes.map((j) => {
                  const p = presenceDe(etat, rapportId, j.id);
                  return (
                    <div
                      key={j.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 text-[14px] truncate">
                        {j.prenom} {j.nom}
                      </div>
                      <div className="flex gap-1">
                        <button
                          disabled={verrouille}
                          onClick={() =>
                            actions.definirPresence(rapportId, j.id, true)
                          }
                          className={`grid h-9 w-16 place-items-center rounded-xl text-[12.5px] font-bold ${
                            p?.present
                              ? "bg-[var(--ok)] text-white"
                              : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]"
                          }`}
                        >
                          Présent
                        </button>
                        <button
                          disabled={verrouille}
                          onClick={() =>
                            actions.definirPresence(rapportId, j.id, false)
                          }
                          className={`grid h-9 w-16 place-items-center rounded-xl text-[12.5px] font-bold ${
                            p && !p.present
                              ? "bg-[var(--danger)] text-white"
                              : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]"
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!verrouille && (
              <Bouton
                taille="sm"
                variante="contour"
                className="mt-3"
                onClick={async () => {
                  const res = await actions.validerAppel(rapportId, tranche);
                  toast(res.message, res.ok ? "ok" : "warn");
                }}
              >
                <IconeCoche className="h-4 w-4" /> Valider l'appel
              </Bouton>
            )}
          </div>

          {fiche.appelFait && (
            <div className="flex items-center gap-2 text-[13px] text-[var(--ok)]">
              <IconeCoche className="h-4 w-4" /> Appel validé
            </div>
          )}
          {jeunes.length === 0 && !fiche.appelFait && (
            <div className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
              <IconeCroix className="h-4 w-4" /> Pas de jeunes dans cette
              tranche
            </div>
          )}
        </div>
      )}
    </Carte>
  );
}
