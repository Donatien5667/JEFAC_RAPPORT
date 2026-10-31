import { AccesCommuniques } from "./Communiques";
import { AppShell, BoutonIcone } from "@/components/AppShell";
import {
  IconeAccueil,
  IconeAlerte,
  IconeCloche,
  IconeCompte,
  IconeGroupe,
  IconeJeunes,
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
} from "@/components/ui";
import {
  dimancheReference,
  formatDateLong,
  ilYA,
  toISODate,
} from "@/lib/utils";
import { useAppState } from "@/store/store";
import {
  LIBELLE_ETAT,
  etatAbonnement,
  estEnRetard,
  estRappelDimanche,
  jeunesDe,
  manquesRapport,
  nonLues,
  rappelAbonnement,
  rapportsDeParoisse,
  rapportDe,
  statsRapport,
  suggestionsPassation,
} from "@/store/selectors";
import { useNav } from "@/navigation";
import type { Route } from "@/navigation";

export function EcranAccueilParoisse() {
  const etat = useAppState();
  const nav = useNav();
  const u = etat.utilisateurs.find((x) => x.id === etat.currentUserId)!;
  const paroisse = etat.paroisses.find((p) => p.id === u.paroisseId);
  const dimanche = toISODate(dimancheReference());
  const rapport = rapportDe(etat, paroisse?.id ?? "", dimanche);
  const manquants = rapport ? manquesRapport(etat, rapport) : [];
  const etatAbo = etatAbonnement(etat, paroisse?.id ?? "");
  const rappel = rappelAbonnement(etat, paroisse?.id ?? "");
  const suggestions = suggestionsPassation(etat, paroisse?.id ?? "");
  const jeunes = jeunesDe(etat, paroisse?.id);
  const recents = rapportsDeParoisse(etat, paroisse?.id ?? "").slice(0, 4);
  const dernierEnvoye = [...rapportsDeParoisse(etat, paroisse?.id ?? "")].find(
    (r) => r.statut === "envoye",
  );
  const stats = dernierEnvoye ? statsRapport(etat, dernierEnvoye) : null;

  const onglets = [
    { id: "accueil", label: "Accueil", icone: <IconeAccueil /> },
    { id: "jeunes", label: "Jeunes", icone: <IconeJeunes /> },
    { id: "rapport", label: "Rapports", icone: <IconeRapports /> },
    { id: "compte", label: "Compte", icone: <IconeCompte /> },
  ];

  return (
    <AppShell
      titre={paroisse?.nom ?? "Ma paroisse"}
      sousTitre={formatDateLong(dimanche)}
      actions={
        <BoutonIcone
          libelle="Notifications"
          badge={nonLues(etat, u.id)}
          onClick={() => nav.aller({ nom: "notifications" })}
        >
          <IconeCloche className="h-6 w-6" />
        </BoutonIcone>
      }
      onglets={onglets}
      ongletActif="accueil"
      onOnglet={(id) => nav.onglet({ nom: id as Route["nom"] } as Route)}
    >
      {etatAbo !== "GRATUIT" && (
        <Alerte
          ton={
            etatAbo === "ACTIF"
              ? "info"
              : etatAbo === "GRACE"
                ? "warn"
                : "danger"
          }
          className="mb-3"
        >
          <b>Abonnement : {LIBELLE_ETAT[etatAbo]}.</b>{" "}
          {rappel ?? "L'envoi du rapport est possible."}
        </Alerte>
      )}

      {estRappelDimanche() && (!rapport || rapport.statut === "brouillon") && (
        <Alerte ton="warn" titre="Rappel du dimanche" className="mb-3">
          Le rapport du dimanche est attendu. La paroisse est prevenue au
          doyenné dès l'envoi.
        </Alerte>
      )}

      <AccesCommuniques />
      {/* Carte principale */}
      <button
        onClick={() => nav.aller({ nom: "rapport" })}
        className="w-full text-left rounded-3xl p-5 text-white shadow-[var(--shadow)]"
        style={{
          background: `linear-gradient(135deg, var(--accent) 0%, ${rapport?.statut === "envoye" ? "var(--blue)" : "var(--accent)"} 100%)`,
        }}
      >
        <div className="text-[13px] font-semibold uppercase tracking-[0.12em] opacity-90">
          {rapport?.statut === "envoye"
            ? "Rapport du dimanche"
            : "Rapport du dimanche"}
        </div>
        <div className="mt-1 text-[24px] font-extrabold leading-tight">
          {rapport?.statut === "envoye"
            ? "Rapport envoyé"
            : rapport
              ? "Continuer le rapport"
              : "Commencer le rapport"}
        </div>
        <div className="mt-1 text-[14px] opacity-90">
          {rapport?.statut === "envoye"
            ? `Envoyé ${rapport.envoyeLe ? ilYA(rapport.envoyeLe) : ""} • consultation et PDF`
            : rapport && manquants.length
              ? `${manquants.length} élément(s) manquant(s) avant l'envoi`
              : rapport
                ? "Rapport complet, prêt à être envoyé"
                : "Fiche du dimanche : appel, formateur, thème et résumé"}
        </div>
      </button>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Tuile valeur={jeunes.length} libelle="Jeunes inscrits" ton="accent" />
        <Tuile
          valeur={stats ? stats.presents : "—"}
          libelle="Présents (dernier rapport)"
          ton="ok"
        />
        <Tuile
          valeur={stats ? `${stats.assiduite}%` : "—"}
          libelle="Assiduité"
          ton={stats && stats.assiduite < 70 ? "warn" : "info"}
        />
      </div>

      {suggestions.length > 0 && (
        <>
          <SectionTitre>Passation</SectionTitre>
          <Carte>
            <div className="flex items-start gap-3">
              <div className="text-[var(--warn)]">
                <IconeAlerte className="h-6 w-6" />
              </div>
              <div className="grow">
                <div className="font-bold text-[15px]">
                  {suggestions.length} jeune(s) à examiner
                </div>
                <p className="text-[13.5px] text-[var(--muted)] mt-0.5 leading-snug">
                  L'application signale les jeunes qui dépassent l'âge de leur
                  tranche. Vous choisissez « Passer en… » ou « Garder ici ».
                </p>
                <Bouton
                  className="mt-3"
                  taille="sm"
                  variante="contour"
                  onClick={() => nav.aller({ nom: "jeunes" })}
                >
                  Voir les jeunes à examiner
                </Bouton>
              </div>
            </div>
          </Carte>
        </>
      )}

      <SectionTitre
        action={
          <button
            className="text-[13px] font-semibold text-[var(--accent)]"
            onClick={() => nav.aller({ nom: "rapports" })}
          >
            Tout voir
          </button>
        }
      >
        Rapports récents
      </SectionTitre>
      <div className="space-y-2">
        {recents.length === 0 && (
          <Carte>
            <p className="text-[14px] text-[var(--muted)]">
              Aucun rapport enregistré pour le moment. Le rapport du dimanche se
              remplit en quelques minutes.
            </p>
          </Carte>
        )}
        {recents.map((r) => {
          const envoye = r.statut === "envoye";
          const enRetard = estEnRetard(etat, r);
          return (
            <Carte
              key={r.id}
              onClick={() =>
                nav.aller({ nom: "detail-rapport", rapportId: r.id })
              }
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-[15px] truncate">
                    {formatDateLong(r.dimanche)}
                  </div>
                  <div className="text-[13px] text-[var(--muted)] mt-0.5">
                    {envoye
                      ? `Envoyé ${ilYA(r.envoyeLe ?? "")}`
                      : "Brouillon — non envoyé"}
                  </div>
                </div>
                {envoye ? (
                  <Etiquette ton="ok">Envoyé</Etiquette>
                ) : enRetard ? (
                  <Etiquette ton="danger">En retard</Etiquette>
                ) : (
                  <Etiquette ton="warn">Brouillon</Etiquette>
                )}
              </div>
            </Carte>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Bouton variante="contour" onClick={() => nav.aller({ nom: "equipe" })}>
          <IconeGroupe className="h-5 w-5" /> Équipe
        </Bouton>
        <Bouton
          variante="contour"
          onClick={() => nav.aller({ nom: "abonnement" })}
        >
          <IconeTelecharger className="h-5 w-5" /> Mon abonnement
        </Bouton>
      </div>

      <p className="mt-6 text-center text-[12px] text-[var(--muted)]">
        Le brouillon est enregistré à chaque modification. Attendez la fin de
        l'enregistrement avant de quitter.
      </p>
    </AppShell>
  );
}
