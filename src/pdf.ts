import type { AppState, Rapport } from "@/lib/types";
import { TRANCHES } from "@/lib/types";
import { formatDateLong, ilYA } from "@/lib/utils";
import type { BlocImprimable } from "@/components/PrintDocument";
import { nomParoisse, presencesRapport, statsRapport } from "@/store/selectors";

function libelleTheme(
  etat: AppState,
  themeId: string | null,
  autre: string,
): string {
  if (themeId) return etat.themes.find((t) => t.id === themeId)?.libelle ?? "—";
  return autre?.trim() || "—";
}

/** Blocs imprimables d'un rapport. */
export function blocsRapport(
  etat: AppState,
  rapport: Rapport,
): BlocImprimable[] {
  const stats = statsRapport(etat, rapport);
  const blocs: BlocImprimable[] = [
    {
      titre: "Paroisse et séance",
      lignes: [
        ["Paroisse", nomParoisse(etat, rapport.paroisseId)],
        ["Doyenné", etat.doyenne.nom],
        ["Dimanche", formatDateLong(rapport.dimanche)],
        ["Heure de début", rapport.debut || "—"],
        ["Heure de fin", rapport.fin || "—"],
        ["Effectif total", String(stats.inscrits)],
        ["Présents / absents", `${stats.presents} / ${stats.absents}`],
        ["Assiduité", `${stats.assiduite} %`],
        ["Statut", rapport.statut === "envoye" ? "Envoyé" : "Brouillon"],
      ],
    },
  ];

  for (const f of rapport.fiches) {
    const info = TRANCHES.find((t) => t.id === f.tranche)!;
    const pres = presencesRapport(etat, rapport.id).filter(
      (p) => p.tranche === f.tranche,
    );
    const presents = pres.filter((p) => p.present).length;
    blocs.push({
      titre: `${info.label} (${info.ages})`,
      lignes: [
        ["Formateur", f.formateur || "—"],
        ["Thème", libelleTheme(etat, f.themeId, f.themeAutre)],
        ["Résumé", f.resume || "—"],
        ["Difficultés", f.difficultes || "—"],
        ["Suggestions", f.suggestions || "—"],
        [
          "Appel",
          f.appelFait
            ? `Validé — ${presents}/${pres.length} présents`
            : "Non validé",
        ],
      ],
      tableau: {
        entetes: ["Jeune", "Présence"],
        lignes: pres.map((p) => {
          const j = etat.jeunes.find((x) => x.id === p.jeuneId);
          return [
            j ? `${j.prenom} ${j.nom}` : "—",
            p.present ? "Présent" : "Absent",
          ];
        }),
      },
    });
  }
  return blocs;
}

/** Blocs imprimables de tous les rapports d'un dimanche. */
export function blocsJournee(
  etat: AppState,
  dimanche: string,
): BlocImprimable[] {
  const rapports = etat.rapports.filter(
    (r) => r.dimanche === dimanche && r.statut === "envoye",
  );
  const blocs: BlocImprimable[] = [
    {
      titre: "Journee du dimanche",
      lignes: [
        ["Dimanche", formatDateLong(dimanche)],
        ["Doyenné", etat.doyenne.nom],
        ["Rapports reçus", String(rapports.length)],
        ["Paroisses du doyenné", String(etat.paroisses.length)],
      ],
    },
  ];
  for (const r of rapports) {
    blocs.push({
      titre: nomParoisse(etat, r.paroisseId),
      lignes: [
        ["Début", r.debut || "—"],
        ["Fin", r.fin || "—"],
        ["Envoyé", r.envoyeLe ? ilYA(r.envoyeLe) : "—"],
      ],
    });
    for (const f of r.fiches) {
      const info = TRANCHES.find((t) => t.id === f.tranche)!;
      const pres = presencesRapport(etat, r.id).filter(
        (p) => p.tranche === f.tranche,
      );
      const presents = pres.filter((p) => p.present).length;
      blocs.push({
        titre: `${info.label} — ${libelleTheme(etat, f.themeId, f.themeAutre)}`,
        lignes: [
          ["Formateur", f.formateur || "—"],
          ["Résumé", f.resume || "—"],
          ["Difficultés", f.difficultes || "—"],
          ["Suggestions", f.suggestions || "—"],
          ["Présents", `${presents}/${pres.length}`],
        ],
      });
    }
  }
  return blocs;
}
