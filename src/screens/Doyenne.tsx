import { AccesCommuniques } from "./Communiques";
import { useMemo, useState } from "react";
import { AppShell, BoutonIcone } from "@/components/AppShell";
import {
  IconeAccueil,
  IconeAlerte,
  IconeCloche,
  IconeCompte,
  IconeGroupe,
  IconeParoisses,
  IconePlus,
  IconeRapports,
} from "@/components/Icones";
import {
  Alerte,
  Avatar,
  Bouton,
  Carte,
  Champ,
  Etiquette,
  Input,
  Modale,
  SectionTitre,
  Select,
  Tuile,
  useToast,
} from "@/components/ui";
import { ROLES, TRANCHES, type Tranche } from "@/lib/types";
import { formatFC, formatTel, formatDateMini, aujourdhui } from "@/lib/utils";
import { actions, useAppState } from "@/store/store";
import {
  LIBELLE_ETAT,
  comptesAValider,
  etatAbonnement,
  jeunesDe,
  nonLues,
  paiementsAConfirmer,
  paroissesEnRetard,
  rapportDe,
  serie8Dimanches,
  statsJour,
} from "@/store/selectors";
import { useNav } from "@/navigation";
import { useImpression } from "@/impression";
import { blocsJournee } from "@/pdf";

function dimanchesRecents(n = 8) {
  const out: string[] = [];
  const d = new Date();
  const jour = d.getDay();
  d.setDate(d.getDate() - jour);
  for (let i = 0; i < n; i++) {
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
    d.setDate(d.getDate() - 7);
  }
  return out;
}

export function EcranAccueilDoyenne() {
  const etat = useAppState();
  const nav = useNav();
  const imprimer = useImpression();
  const u = etat.utilisateurs.find((x) => x.id === etat.currentUserId)!;
  const dimanches = useMemo(() => dimanchesRecents(8), []);
  const [dimanche, setDimanche] = useState(dimanches[0]);
  const stats = statsJour(etat, dimanche);
  const serie = serie8Dimanches(etat);
  const retards = paroissesEnRetard(etat, dimanche);
  const aValider = comptesAValider(etat);
  const aConfirmer = paiementsAConfirmer(etat);

  return (
    <AppShell
      titre={etat.doyenne.nom}
      sousTitre="Espace du doyenné"
      actions={
        <BoutonIcone
          libelle="Notifications"
          badge={nonLues(etat, u.id)}
          onClick={() => nav.aller({ nom: "notifications" })}
        >
          <IconeCloche className="h-6 w-6" />
        </BoutonIcone>
      }
      onglets={[
        { id: "accueil", label: "Accueil", icone: <IconeAccueil /> },
        { id: "rapports", label: "Rapports", icone: <IconeRapports /> },
        { id: "paroisses", label: "Paroisses", icone: <IconeParoisses /> },
        { id: "compte", label: "Compte", icone: <IconeCompte /> },
      ]}
      ongletActif="accueil"
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
        {dimanches.map((d) => (
          <button
            key={d}
            onClick={() => setDimanche(d)}
            className={`h-11 shrink-0 rounded-2xl px-3 text-[12.5px] font-bold ${
              d === dimanche
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]"
            }`}
          >
            {formatDateMini(d)}
          </button>
        ))}
      </div>

      <AccesCommuniques />
      {aConfirmer.length > 0 && (
        <Alerte ton="warn" titre="Paiements à confirmer" className="mt-3">
          {aConfirmer.length} déclaration(s) de paiement attendent votre
          vérification.
        </Alerte>
      )}
      {aValider.length > 0 && (
        <Alerte ton="info" titre="Comptes à valider" className="mt-2">
          {aValider.length} compte(s) attendent la validation du doyenné.
        </Alerte>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
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
        <Tuile valeur={`${stats.presents}`} libelle="Présents" ton="info" />
        <Tuile
          valeur={`${stats.assiduite}%`}
          libelle="Assiduité"
          ton="accent"
        />
      </div>

      <SectionTitre
        action={
          <button
            className="text-[13px] font-semibold text-[var(--accent)]"
            onClick={() =>
              imprimer(
                `Rapports du ${formatDateMini(dimanche)}`,
                `${etat.doyenne.nom} — ${stats.recus} rapport(s) reçu(s)`,
                blocsJournee(etat, dimanche),
              )
            }
          >
            PDF du dimanche
          </button>
        }
      >
        Assiduité des 8 derniers dimanches
      </SectionTitre>
      <Carte>
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

      <SectionTitre
        action={
          <button
            className="text-[13px] font-semibold text-[var(--accent)]"
            onClick={() => nav.aller({ nom: "paroisses" })}
          >
            Tout voir
          </button>
        }
      >
        État des paroisses
      </SectionTitre>
      <div className="space-y-2">
        {etat.paroisses.map((p) => {
          const r = rapportDe(etat, p.id, dimanche);
          const envoye = r?.statut === "envoye";
          const etatAbo = etatAbonnement(etat, p.id);
          return (
            <Carte
              key={p.id}
              onClick={() => nav.aller({ nom: "paroisse", paroisseId: p.id })}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-[15px] truncate">
                    {p.nom}
                  </div>
                  <div className="text-[12.5px] text-[var(--muted)]">
                    {jeunesDe(etat, p.id).length} jeunes ·{" "}
                    {LIBELLE_ETAT[etatAbo]}
                  </div>
                </div>
                {envoye ? (
                  <Etiquette ton="ok">Reçu</Etiquette>
                ) : retards.some((x) => x.id === p.id) ? (
                  <Etiquette ton="danger">En retard</Etiquette>
                ) : (
                  <Etiquette ton="warn">En attente</Etiquette>
                )}
              </div>
            </Carte>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Bouton
          variante="contour"
          onClick={() => nav.aller({ nom: "paroisses" })}
        >
          <IconeGroupe className="h-5 w-5" /> Comptes
        </Bouton>
        <Bouton variante="contour" onClick={() => nav.aller({ nom: "themes" })}>
          <IconeAlerte className="h-5 w-5" /> Thèmes
        </Bouton>
      </div>

      {u.role === "responsable" && (
        <Bouton
          taille="lg"
          className="mt-2 w-full"
          onClick={() => nav.aller({ nom: "admin" })}
        >
          Espace d'administration
        </Bouton>
      )}
    </AppShell>
  );
}

export function EcranParoisses() {
  const etat = useAppState();
  const nav = useNav();
  const toast = useToast();
  const u = etat.utilisateurs.find((x) => x.id === etat.currentUserId)!;
  const [ajout, setAjout] = useState(false);
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [detailCompte, setDetailCompte] = useState<string | null>(null);
  const [motif, setMotif] = useState("");
  const [mdpTemp, setMdpTemp] = useState<string | null>(null);

  const aValider = comptesAValider(etat);
  const responsable = u.role === "responsable";

  return (
    <AppShell
      titre="Paroisses et comptes"
      sousTitre={`${etat.paroisses.length} paroisse(s) · ${etat.doyenne.nom}`}
      retour
      onRetour={() => nav.retour()}
      actions={
        responsable ? (
          <button
            onClick={() => setAjout(true)}
            aria-label="Ajouter une paroisse"
            className="grid h-11 w-11 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-contrast)]"
          >
            <IconePlus className="h-5 w-5" />
          </button>
        ) : undefined
      }
    >
      {aValider.length > 0 && (
        <>
          <SectionTitre>Comptes à valider</SectionTitre>
          <div className="space-y-2">
            {aValider.map((c) => (
              <Carte key={c.id} className="border-[var(--warn)]">
                <div className="flex items-center gap-3">
                  <Avatar nom={c.nom} taille={42} />
                  <div className="min-w-0 grow">
                    <div className="font-semibold text-[15px] truncate">
                      {c.nom}
                    </div>
                    <div className="text-[12.5px] text-[var(--muted)]">
                      {ROLES.find((r) => r.id === c.role)?.label}
                      {c.paroisseId
                        ? ` · ${etat.paroisses.find((p) => p.id === c.paroisseId)?.nom}`
                        : ""}
                    </div>
                    <div className="text-[12.5px] text-[var(--muted)]">
                      {formatTel(c.telephone)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Bouton
                    taille="sm"
                    className="grow"
                    onClick={async () => {
                      const res = await actions.validerCompte(c.id, u.id);
                      toast(res.message, res.ok ? "ok" : "danger");
                    }}
                  >
                    Valider
                  </Bouton>
                  <Bouton
                    taille="sm"
                    variante="contour"
                    className="grow"
                    onClick={() => {
                      setDetailCompte(c.id);
                      setMotif("");
                    }}
                  >
                    Refuser
                  </Bouton>
                </div>
              </Carte>
            ))}
          </div>
        </>
      )}

      <SectionTitre>Paroisses</SectionTitre>
      <div className="space-y-2">
        {etat.paroisses.map((p) => {
          const etatAbo = etatAbonnement(etat, p.id);
          const membres = etat.utilisateurs.filter(
            (x) => x.paroisseId === p.id,
          );
          return (
            <Carte key={p.id}>
              <div
                className="flex items-center justify-between gap-3"
                onClick={() => nav.aller({ nom: "paroisse", paroisseId: p.id })}
              >
                <div className="min-w-0">
                  <div className="font-semibold text-[15px] truncate">
                    {p.nom}
                  </div>
                  <div className="text-[12.5px] text-[var(--muted)]">
                    {jeunesDe(etat, p.id).length} jeunes · {membres.length}{" "}
                    compte(s)
                  </div>
                </div>
                <Etiquette
                  ton={
                    etatAbo === "ACTIF" || etatAbo === "GRATUIT"
                      ? "ok"
                      : etatAbo === "GRACE"
                        ? "warn"
                        : "danger"
                  }
                >
                  {LIBELLE_ETAT[etatAbo]}
                </Etiquette>
              </div>

              {responsable && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                  <Bouton
                    taille="sm"
                    variante="contour"
                    onClick={async () => {
                      const res = await actions.basculerAbonnement(p.id);
                      toast(res.message, res.ok ? "ok" : "danger");
                    }}
                  >
                    {etatAbo === "ACTIF" ||
                    etatAbo === "GRATUIT" ||
                    etatAbo === "GRACE"
                      ? "Désactiver l'abonnement"
                      : "Activer l'abonnement"}
                  </Bouton>
                  <Bouton
                    taille="sm"
                    variante="contour"
                    onClick={() =>
                      nav.aller({ nom: "paroisse", paroisseId: p.id })
                    }
                  >
                    Détail
                  </Bouton>
                </div>
              )}

              {membres.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
                  {membres.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold truncate">
                          {m.nom}
                        </div>
                        <div className="text-[12px] text-[var(--muted)]">
                          {ROLES.find((r) => r.id === m.role)?.short} ·{" "}
                          {formatTel(m.telephone)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Etiquette
                          ton={
                            m.statut === "actif"
                              ? "ok"
                              : m.statut === "en_attente"
                                ? "warn"
                                : m.statut === "refuse"
                                  ? "danger"
                                  : "neutre"
                          }
                        >
                          {m.statut === "actif"
                            ? "Actif"
                            : m.statut === "en_attente"
                              ? "En attente"
                              : m.statut === "refuse"
                                ? "Refusé"
                                : "Retiré"}
                        </Etiquette>
                        {responsable && m.role !== "responsable" && (
                          <button
                            className="rounded-lg px-2 py-1 text-[12px] font-semibold text-[var(--accent)]"
                            onClick={async () => {
                              const res = await actions.reinitialiserMotDePasse(
                                m.id,
                                u.id,
                              );
                              if (res.ok) {
                                setMdpTemp(
                                  String(res.extra?.motDePasseTemporaire ?? ""),
                                );
                                toast("Mot de passe temporaire créé.", "ok");
                              }
                            }}
                          >
                            Réinit.
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Carte>
          );
        })}
      </div>

      <p className="mt-4 text-[12.5px] text-[var(--muted)] leading-snug">
        3 comptes maximum pour le doyenné et 3 par paroisse. Un compte refusé ou
        retiré peut redemander l'accès avec le même numéro.
      </p>

      <Modale
        ouvert={ajout}
        onFermer={() => setAjout(false)}
        titre="Ajouter une paroisse"
        pied={
          <Bouton
            className="w-full"
            onClick={async () => {
              const res = await actions.ajouterParoisse(nom, adresse);
              toast(res.message, res.ok ? "ok" : "danger");
              if (res.ok) {
                setNom("");
                setAdresse("");
                setAjout(false);
              }
            }}
          >
            Ajouter
          </Bouton>
        }
      >
        <div className="space-y-3 pb-2">
          <Champ label="Nom de la paroisse">
            <Input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Saint-Pierre de Masina"
            />
          </Champ>
          <Champ label="Adresse (facultatif)">
            <Input
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
            />
          </Champ>
        </div>
      </Modale>

      <Modale
        ouvert={!!detailCompte}
        onFermer={() => setDetailCompte(null)}
        titre="Refuser la demande"
        pied={
          <Bouton
            className="w-full"
            onClick={async () => {
              const res = await actions.refuserCompte(
                detailCompte!,
                motif,
                u.id,
              );
              toast(res.message, res.ok ? "ok" : "danger");
              if (res.ok) setDetailCompte(null);
            }}
          >
            Refuser la demande
          </Bouton>
        }
      >
        <Champ
          label="Motif du refus"
          hint="Il est visible par la personne concernée."
        >
          <Input
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Numéro déjà utilisé"
          />
        </Champ>
      </Modale>

      <Modale
        ouvert={!!mdpTemp}
        onFermer={() => setMdpTemp(null)}
        titre="Mot de passe temporaire"
      >
        <p className="text-[14px] text-[var(--muted)] mb-3">
          Communiquez ce mot de passe à la personne. Il s'affiche une seule fois
          et devra être changé à la première connexion.
        </p>
        <div className="rounded-2xl bg-[var(--surface-2)] p-4 text-center text-[22px] font-extrabold tracking-wider">
          {mdpTemp}
        </div>
      </Modale>
    </AppShell>
  );
}

export function EcranDetailParoisse({ paroisseId }: { paroisseId: string }) {
  const etat = useAppState();
  const nav = useNav();
  const toast = useToast();
  const u = etat.utilisateurs.find((x) => x.id === etat.currentUserId)!;
  const [motif, setMotif] = useState("");
  const [refusId, setRefusId] = useState<string | null>(null);
  const p = etat.paroisses.find((x) => x.id === paroisseId);
  if (!p) {
    return (
      <AppShell titre="Paroisse" retour onRetour={() => nav.retour()}>
        <Carte>Cette paroisse n'existe pas.</Carte>
      </AppShell>
    );
  }
  const etatAbo = etatAbonnement(etat, p.id);
  const paiements = etat.paiements.filter((x) => x.paroisseId === p.id);
  const rapports = etat.rapports
    .filter((r) => r.paroisseId === p.id)
    .sort((a, b) => (a.dimanche < b.dimanche ? 1 : -1));
  const membres = etat.utilisateurs.filter((x) => x.paroisseId === p.id);

  return (
    <AppShell
      titre={p.nom}
      sousTitre={p.adresse}
      retour
      onRetour={() => nav.retour()}
    >
      <Carte>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] text-[var(--muted)]">Abonnement</div>
            <div className="text-[18px] font-bold">{LIBELLE_ETAT[etatAbo]}</div>
          </div>
          <Etiquette
            ton={
              etatAbo === "ACTIF" || etatAbo === "GRATUIT"
                ? "ok"
                : etatAbo === "GRACE"
                  ? "warn"
                  : "danger"
            }
          >
            {etatAbo}
          </Etiquette>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Tuile
            valeur={jeunesDe(etat, p.id).length}
            libelle="Jeunes"
            ton="accent"
          />
          <Tuile valeur={membres.length} libelle="Comptes" ton="info" />
          <Tuile
            valeur={rapports.filter((r) => r.statut === "envoye").length}
            libelle="Rapports reçus"
            ton="ok"
          />
        </div>
      </Carte>

      <SectionTitre>Paiements</SectionTitre>
      <div className="space-y-2">
        {paiements.length === 0 && (
          <Carte>
            <p className="text-[14px] text-[var(--muted)]">
              Aucun paiement enregistré.
            </p>
          </Carte>
        )}
        {paiements.map((pay) => (
          <Carte key={pay.id}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-[15px]">
                  {formatFC(pay.montant)}
                </div>
                <div className="text-[12.5px] text-[var(--muted)]">
                  {pay.type} · {pay.date} · {pay.reference} ·{" "}
                  {pay.mode === "mobile_money"
                    ? "Mobile Money"
                    : "Reçu en main propre"}
                </div>
              </div>
              <Etiquette
                ton={
                  pay.statut === "confirme"
                    ? "ok"
                    : pay.statut === "en_attente"
                      ? "warn"
                      : pay.statut === "refuse"
                        ? "danger"
                        : "neutre"
                }
              >
                {pay.statut}
              </Etiquette>
            </div>
            {pay.statut === "en_attente" && u.role === "responsable" && (
              <div className="mt-3 flex gap-2">
                <Bouton
                  taille="sm"
                  className="grow"
                  onClick={async () => {
                    const res = await actions.confirmerPaiement(pay.id);
                    toast(res.message, res.ok ? "ok" : "danger");
                  }}
                >
                  Confirmer
                </Bouton>
                <Bouton
                  taille="sm"
                  variante="contour"
                  className="grow"
                  onClick={() => {
                    setRefusId(pay.id);
                    setMotif("");
                  }}
                >
                  Refuser
                </Bouton>
              </div>
            )}
          </Carte>
        ))}
      </div>

      <SectionTitre>Équipe</SectionTitre>
      <div className="space-y-2">
        {membres.map((m) => (
          <Carte key={m.id}>
            <div className="flex items-center gap-3">
              <Avatar nom={m.nom} taille={40} />
              <div className="min-w-0 grow">
                <div className="text-[14.5px] font-semibold truncate">
                  {m.nom}
                </div>
                <div className="text-[12.5px] text-[var(--muted)]">
                  {ROLES.find((r) => r.id === m.role)?.label} ·{" "}
                  {formatTel(m.telephone)}
                </div>
              </div>
              <Etiquette
                ton={
                  m.statut === "actif"
                    ? "ok"
                    : m.statut === "en_attente"
                      ? "warn"
                      : "neutre"
                }
              >
                {m.statut}
              </Etiquette>
            </div>
          </Carte>
        ))}
      </div>

      <SectionTitre>Rapports</SectionTitre>
      <div className="space-y-2">
        {rapports.slice(0, 8).map((r) => (
          <Carte
            key={r.id}
            onClick={() =>
              nav.aller({ nom: "detail-rapport", rapportId: r.id })
            }
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-[14.5px] font-semibold">
                {formatDateMini(r.dimanche)}
              </div>
              {r.statut === "envoye" ? (
                <Etiquette ton="ok">Envoyé</Etiquette>
              ) : (
                <Etiquette ton="warn">Brouillon</Etiquette>
              )}
            </div>
          </Carte>
        ))}
      </div>

      <Modale
        ouvert={!!refusId}
        onFermer={() => setRefusId(null)}
        titre="Refuser le paiement"
        pied={
          <Bouton
            className="w-full"
            onClick={async () => {
              const res = await actions.refuserPaiement(refusId!, motif);
              toast(res.message, res.ok ? "ok" : "danger");
              if (res.ok) setRefusId(null);
            }}
          >
            Refuser
          </Bouton>
        }
      >
        <Champ
          label="Motif du refus"
          hint="Obligatoire, visible par la paroisse."
        >
          <Input value={motif} onChange={(e) => setMotif(e.target.value)} />
        </Champ>
      </Modale>
    </AppShell>
  );
}

export function EcranThemes() {
  const etat = useAppState();
  const toast = useToast();
  const nav = useNav();
  const u = etat.utilisateurs.find((x) => x.id === etat.currentUserId)!;
  const [tranche, setTranche] = useState<Tranche>("CADETS");
  const [libelle, setLibelle] = useState("");
  const [datePrevue, setDatePrevue] = useState("");
  const responsable = u.role === "responsable";

  return (
    <AppShell
      titre="Thèmes proposés"
      sousTitre="Un thème par tranche d'âge"
      retour
      onRetour={() => nav.retour()}
    >
      {responsable && (
        <Carte className="space-y-3">
          <Champ label="Tranche">
            <Select
              value={tranche}
              onChange={(e) => setTranche(e.target.value as Tranche)}
            >
              {TRANCHES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} ({t.ages})
                </option>
              ))}
            </Select>
          </Champ>
          <Champ label="Thème">
            <Input
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="Ex. La Sainte Eucharistie"
            />
          </Champ>
          <Champ label="Date prévue (facultatif)">
            <Input
              type="date"
              value={datePrevue}
              onChange={(e) => setDatePrevue(e.target.value)}
            />
          </Champ>
          <Bouton
            className="w-full"
            onClick={async () => {
              const res = await actions.ajouterTheme(
                tranche,
                libelle,
                datePrevue || null,
                u.id,
              );
              toast(res.message, res.ok ? "ok" : "danger");
              if (res.ok) {
                setLibelle("");
                setDatePrevue("");
              }
            }}
          >
            Ajouter le thème
          </Bouton>
        </Carte>
      )}

      {TRANCHES.map((t) => (
        <div key={t.id} className="mt-4">
          <SectionTitre>
            {t.label} · {t.ages}
          </SectionTitre>
          <div className="space-y-2">
            {etat.themes
              .filter((x) => x.tranche === t.id)
              .map((th) => (
                <Carte key={th.id} className={th.retire ? "opacity-60" : ""}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[15px]">
                        {th.libelle}
                      </div>
                      <div className="text-[12.5px] text-[var(--muted)]">
                        {th.datePrevue ? `Prévu le ${th.datePrevue} · ` : ""}
                        proposé par {th.proposePar}
                      </div>
                    </div>
                    {responsable ? (
                      <Bouton
                        taille="sm"
                        variante="contour"
                        onClick={async () => {
                          const res = await actions.basculerTheme(th.id);
                          toast(res.message, res.ok ? "ok" : "danger");
                        }}
                      >
                        {th.retire ? "Rétablir" : "Retirer"}
                      </Bouton>
                    ) : (
                      <Etiquette ton={th.retire ? "neutre" : "accent"}>
                        {th.retire ? "Retiré" : "Proposé"}
                      </Etiquette>
                    )}
                  </div>
                </Carte>
              ))}
          </div>
        </div>
      ))}

      <p className="mt-5 text-[12.5px] text-[var(--muted)]">
        Les paroisses choisissent un thème proposé ou saisissent « Autres » dans
        la fiche de leur rapport. Dernière mise à jour : {aujourdhui()}.
      </p>
    </AppShell>
  );
}
