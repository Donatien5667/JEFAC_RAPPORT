import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  IconeAccueil,
  IconeCompte,
  IconeParoisses,
  IconeRapports,
  IconeTelecharger,
} from "@/components/Icones";
import {
  Alerte,
  Bouton,
  Carte,
  Etiquette,
  SectionTitre,
  Tuile,
  useToast,
} from "@/components/ui";
import { TRANCHES } from "@/lib/types";
import { formatDateLong, formatDateMini, ilYA } from "@/lib/utils";
import { actions, useAppState } from "@/store/store";
import { nomParoisse, presencesRapport, statsRapport } from "@/store/selectors";
import { useNav } from "@/navigation";
import { useImpression } from "@/impression";
import { blocsJournee, blocsRapport } from "@/pdf";

export function EcranRapportsDoyenne() {
  const etat = useAppState();
  const nav = useNav();
  const imprimer = useImpression();
  const [paroisseFiltre, setParoisseFiltre] = useState<string>("TOUTES");
  const [statutFiltre, setStatutFiltre] = useState<
    "TOUS" | "envoye" | "brouillon"
  >("TOUS");

  const rapports = useMemo(() => {
    return [...etat.rapports]
      .filter((r) =>
        paroisseFiltre === "TOUTES" ? true : r.paroisseId === paroisseFiltre,
      )
      .filter((r) =>
        statutFiltre === "TOUS" ? true : r.statut === statutFiltre,
      )
      .sort((a, b) =>
        a.dimanche === b.dimanche
          ? a.paroisseId < b.paroisseId
            ? 1
            : -1
          : a.dimanche < b.dimanche
            ? 1
            : -1,
      );
  }, [etat.rapports, paroisseFiltre, statutFiltre]);

  const dimancheCourant = rapports[0]?.dimanche;

  return (
    <AppShell
      titre="Rapports"
      sousTitre={`${etat.doyenne.nom}`}
      onglets={[
        { id: "accueil", label: "Accueil", icone: <IconeAccueil /> },
        { id: "rapports", label: "Rapports", icone: <IconeRapports /> },
        { id: "paroisses", label: "Paroisses", icone: <IconeParoisses /> },
        { id: "compte", label: "Compte", icone: <IconeCompte /> },
      ]}
      ongletActif="rapports"
      onOnglet={(id) =>
        nav.onglet(
          (id === "rapports"
            ? { nom: "rapports" }
            : id === "paroisses"
              ? { nom: "paroisses" }
              : id === "compte"
                ? { nom: "compte" }
                : { nom: "accueil" }) as never,
        )
      }
    >
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setParoisseFiltre("TOUTES")}
          className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold border ${
            paroisseFiltre === "TOUTES"
              ? "bg-[var(--accent)] text-[var(--accent-contrast)] border-transparent"
              : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)]"
          }`}
        >
          Toutes
        </button>
        {etat.paroisses.map((p) => (
          <button
            key={p.id}
            onClick={() => setParoisseFiltre(p.id)}
            className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold border ${
              paroisseFiltre === p.id
                ? "bg-[var(--accent)] text-[var(--accent-contrast)] border-transparent"
                : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)]"
            }`}
          >
            {p.nom.split(" ").slice(0, 2).join(" ")}
          </button>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        {(
          [
            ["TOUS", "Tous"],
            ["envoye", "Envoyés"],
            ["brouillon", "Brouillons"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setStatutFiltre(id)}
            className={`h-9 rounded-full px-3.5 text-[13px] font-semibold border ${
              statutFiltre === id
                ? "bg-[var(--surface-3)] border-transparent text-[var(--text)]"
                : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {dimancheCourant && (
        <SectionTitre
          action={
            <button
              className="text-[13px] font-semibold text-[var(--accent)]"
              onClick={() =>
                imprimer(
                  `Rapports du ${formatDateMini(dimancheCourant)}`,
                  `${etat.doyenne.nom}`,
                  blocsJournee(etat, dimancheCourant),
                )
              }
            >
              PDF du dimanche
            </button>
          }
        >
          PDF du dimanche
        </SectionTitre>
      )}

      <div className="space-y-2">
        {rapports.length === 0 && (
          <Carte>
            <p className="text-[14px] text-[var(--muted)]">
              Aucun rapport pour ce filtre.
            </p>
          </Carte>
        )}
        {rapports.map((r) => {
          const st = statsRapport(etat, r);
          return (
            <Carte
              key={r.id}
              onClick={() =>
                nav.aller({ nom: "detail-rapport", rapportId: r.id })
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-[15px] truncate">
                    {nomParoisse(etat, r.paroisseId)}
                  </div>
                  <div className="text-[12.5px] text-[var(--muted)]">
                    {formatDateMini(r.dimanche)} · {st.presents}/{st.inscrits}{" "}
                    présents
                    {r.statut === "envoye"
                      ? ` · envoyé ${ilYA(r.envoyeLe ?? "")}`
                      : ""}
                  </div>
                </div>
                {r.statut === "envoye" ? (
                  <Etiquette ton="ok">Envoyé</Etiquette>
                ) : (
                  <Etiquette ton="warn">Brouillon</Etiquette>
                )}
              </div>
            </Carte>
          );
        })}
      </div>
    </AppShell>
  );
}

export function EcranDetailRapport({ rapportId }: { rapportId: string }) {
  const etat = useAppState();
  const nav = useNav();
  const toast = useToast();
  const imprimer = useImpression();
  const u = etat.utilisateurs.find((x) => x.id === etat.currentUserId)!;
  const rapport = etat.rapports.find((r) => r.id === rapportId);
  if (!rapport) {
    return (
      <AppShell titre="Rapport" retour onRetour={() => nav.retour()}>
        <Carte>Rapport introuvable.</Carte>
      </AppShell>
    );
  }
  const stats = statsRapport(etat, rapport);
  const presences = presencesRapport(etat, rapport.id);
  const responsable = u.role === "responsable";

  return (
    <AppShell
      titre={nomParoisse(etat, rapport.paroisseId)}
      sousTitre={formatDateLong(rapport.dimanche)}
      retour
      onRetour={() => nav.retour()}
    >
      <Carte>
        <div className="flex items-center justify-between">
          <div className="text-[13px] text-[var(--muted)]">Statut</div>
          {rapport.statut === "envoye" ? (
            <Etiquette ton="ok">
              Envoyé {ilYA(rapport.envoyeLe ?? "")}
            </Etiquette>
          ) : (
            <Etiquette ton="warn">Brouillon</Etiquette>
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Tuile valeur={stats.inscrits} libelle="Inscrits" ton="accent" />
          <Tuile valeur={stats.presents} libelle="Présents" ton="ok" />
          <Tuile
            valeur={`${stats.assiduite}%`}
            libelle="Assiduité"
            ton="info"
          />
        </div>
        <div className="mt-3 text-[13.5px] text-[var(--muted)]">
          Séance de {rapport.debut || "—"} à {rapport.fin || "—"}
        </div>
      </Carte>

      {rapport.fiches.map((f) => {
        const info = TRANCHES.find((t) => t.id === f.tranche)!;
        const pres = presences.filter((p) => p.tranche === f.tranche);
        const presents = pres.filter((p) => p.present).length;
        const theme =
          etat.themes.find((t) => t.id === f.themeId)?.libelle ??
          (f.themeAutre || "—");
        return (
          <div key={f.tranche} className="mt-3">
            <SectionTitre>
              {info.label} · {info.ages}
            </SectionTitre>
            <Carte className="space-y-1.5 text-[14px]">
              <div>
                <b>Formateur :</b> {f.formateur || "—"}
              </div>
              <div>
                <b>Thème :</b> {theme}
              </div>
              <div>
                <b>Résumé :</b> {f.resume || "—"}
              </div>
              {f.difficultes && (
                <div>
                  <b>Difficultés :</b> {f.difficultes}
                </div>
              )}
              {f.suggestions && (
                <div>
                  <b>Suggestions :</b> {f.suggestions}
                </div>
              )}
              <div className="pt-1 text-[13.5px] text-[var(--muted)]">
                Appel :{" "}
                {f.appelFait
                  ? `validé — ${presents}/${pres.length} présents`
                  : "non validé"}
              </div>
              {pres.length > 0 && (
                <details className="text-[13.5px]">
                  <summary className="cursor-pointer text-[var(--accent)] font-semibold">
                    Voir la liste des présences
                  </summary>
                  <div className="mt-1.5 space-y-0.5">
                    {pres.map((p) => {
                      const j = etat.jeunes.find((x) => x.id === p.jeuneId);
                      return (
                        <div key={p.id} className="flex justify-between gap-2">
                          <span className="truncate">
                            {j ? `${j.prenom} ${j.nom}` : "—"}
                          </span>
                          <span
                            className={
                              p.present
                                ? "text-[var(--ok)]"
                                : "text-[var(--danger)]"
                            }
                          >
                            {p.present ? "Présent" : "Absent"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}
              {f.photo && (
                <img
                  src={f.photo}
                  alt="Photo de la séance"
                  className="mt-2 h-40 w-full rounded-2xl object-cover"
                />
              )}
            </Carte>
          </div>
        );
      })}

      <div className="mt-4 space-y-2">
        <Bouton
          variante="contour"
          className="w-full"
          onClick={() =>
            imprimer(
              `Rapport de formation — ${formatDateLong(rapport.dimanche)}`,
              `${nomParoisse(etat, rapport.paroisseId)} · ${etat.doyenne.nom}`,
              blocsRapport(etat, rapport),
            )
          }
        >
          <IconeTelecharger className="h-5 w-5" /> Télécharger le PDF
        </Bouton>
        {responsable && rapport.statut === "envoye" && (
          <Bouton
            variante="contour"
            className="w-full"
            onClick={async () => {
              const res = await actions.rouvrirRapport(rapport.id);
              toast(res.message, res.ok ? "ok" : "danger");
            }}
          >
            Rouvrir le rapport pour correction
          </Bouton>
        )}
      </div>

      {rapport.rouvreLe && (
        <Alerte ton="info" className="mt-3">
          Ce rapport a été rouvert le {formatDateMini(rapport.rouvreLe)} pour
          correction.
        </Alerte>
      )}
    </AppShell>
  );
}

export function EcranNotifications() {
  const etat = useAppState();
  const nav = useNav();
  const u = etat.utilisateurs.find((x) => x.id === etat.currentUserId)!;
  const notifications = etat.notifications
    .filter((n) => n.userId === u.id)
    .sort((a, b) => (a.creeLe < b.creeLe ? 1 : -1));

  return (
    <AppShell
      titre="Notifications"
      sousTitre="Demandes, rapports, rappels, abonnements"
      retour
      onRetour={() => nav.retour()}
      actions={
        <button
          className="px-3 text-[13px] font-semibold text-[var(--accent)]"
          onClick={() => actions.toutMarquerLu()}
        >
          Tout lire
        </button>
      }
    >
      <div className="space-y-2">
        {notifications.length === 0 && (
          <Carte>
            <p className="text-[14px] text-[var(--muted)]">
              Aucune notification pour le moment.
            </p>
          </Carte>
        )}
        {notifications.map((n) => (
          <Carte
            key={n.id}
            className={n.lu ? "" : "border-[var(--accent)]"}
            onClick={() => {
              void actions.marquerNotification(n.id);
              if (n.communiqueId) nav.aller({ nom: "communiques" });
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-[15px]">{n.titre}</div>
                <div className="text-[13.5px] text-[var(--muted)] mt-0.5 leading-snug">
                  {n.texte}
                </div>
                <div className="mt-1 text-[12px] text-[var(--muted)]">
                  {ilYA(n.creeLe)}
                </div>
              </div>
              {!n.lu && (
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--accent)]" />
              )}
            </div>
          </Carte>
        ))}
      </div>
    </AppShell>
  );
}
