import { useState } from "react";
import {
  Copy,
  ArrowUpRight,
  Database,
  Download,
  ShieldCheck,
  Link2,
} from "lucide-react";
import {
  Alerte,
  Bouton,
  Champ,
  Input,
  Modale,
  useToast,
} from "@/components/ui";
import { actions, sauvegarderDonnees, useAppState } from "@/store/store";
import { useConnection } from "@/db/connection";
import { copierTexte } from "@/lib/utils";
import { useNav } from "@/navigation";

export function AdminReglages() {
  const s = useAppState();
  const toast = useToast();
  const nav = useNav();
  const connection = useConnection();
  const [nom, setNom] = useState(s.doyenne.nom);
  const [reglage, setReglage] = useState(s.reglage);
  const [reset, setReset] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const root = window.location.origin;
  return (
    <div className="entry">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow mb-3">Un espace à votre image</p>
          <h1 className="page-title">Configuration</h1>
          <p className="page-description">
            Vos informations, vos accès et vos données.
          </p>
        </div>
      </div>
      <div className="grid items-start gap-8 xl:grid-cols-[1.1fr_1fr]">
        <div>
          <section className="border-b border-[var(--border)] pb-7">
            <h2 className="mb-5 text-base font-semibold">Mon doyenné</h2>
            <Champ label="Nom du doyenné">
              <Input
                value={nom}
                maxLength={120}
                onChange={(e) => setNom(e.target.value)}
              />
            </Champ>
            <div className="mt-4 flex flex-wrap gap-2">
              <Bouton
                onClick={async () => {
                  const res = await actions.modifierDoyenne(nom);
                  toast(res.message);
                }}
              >
                Enregistrer
              </Bouton>
              <Bouton
                variante="contour"
                onClick={() => nav.aller({ nom: "paroisses" })}
              >
                Gérer mes paroisses <ArrowUpRight size={15} />
              </Bouton>
            </div>
          </section>
          <section className="py-7">
            <h2 className="mb-5 text-base font-semibold">
              Abonnements et paiement
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Champ label="Mensuel (FC)">
                  <Input
                    type="number"
                    min={0}
                    value={reglage.prixMensuel}
                    onChange={(e) =>
                      setReglage({
                        ...reglage,
                        prixMensuel: Number(e.target.value),
                      })
                    }
                  />
                </Champ>
                <Champ label="Annuel (FC)">
                  <Input
                    type="number"
                    min={0}
                    value={reglage.prixAnnuel}
                    onChange={(e) =>
                      setReglage({
                        ...reglage,
                        prixAnnuel: Number(e.target.value),
                      })
                    }
                  />
                </Champ>
              </div>
              <Champ label="Numéro de paiement">
                <Input
                  type="tel"
                  value={reglage.numeroPaiement}
                  onChange={(e) =>
                    setReglage({ ...reglage, numeroPaiement: e.target.value })
                  }
                />
              </Champ>
              <Champ label="Titulaire">
                <Input
                  value={reglage.titulaire}
                  onChange={(e) =>
                    setReglage({ ...reglage, titulaire: e.target.value })
                  }
                />
              </Champ>
              <Champ label="Délai de grâce (jours)">
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={reglage.joursGrace}
                  onChange={(e) =>
                    setReglage({
                      ...reglage,
                      joursGrace: Number(e.target.value),
                    })
                  }
                />
              </Champ>
              <Bouton
                onClick={async () => {
                  if (
                    reglage.prixMensuel < 0 ||
                    reglage.prixAnnuel < 0 ||
                    reglage.joursGrace < 0 ||
                    !reglage.numeroPaiement.trim() ||
                    !reglage.titulaire.trim()
                  ) {
                    toast(
                      "Vérifiez les montants et les coordonnées.",
                      "danger",
                    );
                    return;
                  }
                  const res = await actions.modifierReglage(reglage);
                  toast(res.message);
                }}
              >
                Enregistrer les tarifs
              </Bouton>
            </div>
          </section>
        </div>
        <div>
          <section className="rounded-xl border border-[var(--border)] bg-white p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Link2 size={18} className="text-[var(--blue)]" /> Liens de
              connexion
            </h2>
            <p className="mb-5 mt-2 text-xs leading-6 text-[var(--muted)]">
              Les utilisateurs renseignent leur identifiant et leur mot de
              passe. Aucun mot de passe n'est inclus dans le lien.
            </p>
            {connection.mode === "local" && (
              <Alerte
                ton="info"
                titre="Connexion depuis un autre téléphone : pas encore disponible"
                className="mb-4"
              >
                Le lien ouvre l'application, mais les comptes créés ici restent
                sur cet appareil. Il faut mettre le serveur partagé en ligne,
                puis y créer les comptes avant d'envoyer leurs accès.
              </Alerte>
            )}
            {[
              ["Administration", "/admin"],
              ["Utilisateurs paroissiaux", "/connexion"],
            ].map(([label, path]) => (
              <div className="border-t border-[var(--border)] py-4" key={path}>
                <div className="mb-2 text-xs font-semibold">{label}</div>
                <div className="flex items-center gap-2">
                  <a
                    href={path}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 grow break-all text-xs text-[var(--blue)]"
                  >
                    {root}
                    {path}
                  </a>
                  <button
                    aria-label={`Copier le lien ${label}`}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--surface-2)]"
                    onClick={async () =>
                      toast(
                        (await copierTexte(root + path))
                          ? connection.mode === "local"
                            ? "Lien copié pour ouvrir l'aperçu. Les comptes ne sont pas encore partagés."
                            : "Lien copié."
                          : "Copie indisponible.",
                      )
                    }
                  >
                    <Copy size={15} />
                  </button>
                </div>
              </div>
            ))}
          </section>
          <section className="py-7">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <Database size={18} className="text-[var(--blue)]" /> Vos données
            </h2>
            <p className="text-sm leading-7 text-[var(--muted)]">
              {connection.mode === "serveur"
                ? "Vos informations sont enregistrées dans la base SQLite du serveur partagé. Chaque utilisateur accède uniquement aux données autorisées par son rôle."
                : "Vos informations sont enregistrées dans ce navigateur. Elles ne sont pas transmises à un serveur. Sauvegardez-les avant de changer d'appareil ou d'effacer le navigateur."}
            </p>
            <p className="my-4 flex items-center gap-2 text-xs text-[var(--blue)]">
              <ShieldCheck size={15} />{" "}
              {s.modeDonnees === "exemple"
                ? "Anciennes données d'exemple conservées"
                : "Aucun ajout automatique de données fictives"}
            </p>
            <Bouton
              variante="contour"
              onClick={async () => {
                try {
                  await sauvegarderDonnees();
                  toast(
                    "Sauvegarde téléchargée. Conservez-la dans un endroit sûr.",
                  );
                } catch {
                  toast("La sauvegarde n'a pas pu être téléchargée.", "danger");
                }
              }}
            >
              <Download size={15} /> Télécharger une sauvegarde
            </Bouton>
            <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
              La sauvegarde contient des données personnelles. Ne la partagez
              pas avec les utilisateurs.
            </p>
            {s.modeDonnees === "exemple" && (
              <div className="mt-5">
                <Alerte ton="info">
                  La mise à jour a conservé les anciennes données pour éviter
                  toute perte. Vous pouvez les retirer après sauvegarde.
                </Alerte>
                <button
                  className="primary-link mt-3 min-h-11 text-sm"
                  onClick={() => setReset(true)}
                >
                  Retirer les données d'exemple
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
      <Modale
        ouvert={reset}
        onFermer={() => setReset(false)}
        titre="Repartir avec vos propres données"
        pied={
          <Bouton
            variante="danger"
            disabled={confirmation !== "RECOMMENCER"}
            onClick={async () => {
              const res = await actions.retirerDonneesExemple(confirmation);
              toast(res.message);
              if (res.ok) setReset(false);
            }}
          >
            Retirer les anciennes données
          </Bouton>
        }
      >
        <p className="mb-4 text-sm leading-7 text-[var(--muted)]">
          Les paroisses, rapports, jeunes, paiements et autres comptes seront
          retirés. Seul votre compte administrateur sera conservé. Téléchargez
          d'abord une sauvegarde si nécessaire.
        </p>
        <Champ label="Saisissez RECOMMENCER pour confirmer">
          <Input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </Champ>
      </Modale>
    </div>
  );
}
