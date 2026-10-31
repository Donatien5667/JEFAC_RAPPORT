import { useRef, useState } from "react";
import { Camera, Sun, Megaphone, Info, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  IconeAccueil,
  IconeArgent,
  IconeCloche,
  IconeCompte,
  IconeDeconnexion,
  IconeGroupe,
  IconeJeunes,
  IconeListe,
  IconeParoisses,
  IconeRapports,
  IconeTableau,
  IconeTheme,
} from "@/components/Icones";
import {
  Alerte,
  Avatar,
  Bouton,
  Carte,
  Champ,
  Etiquette,
  Input,
  LigneMenu,
  Modale,
  Select,
  SectionTitre,
  useToast,
} from "@/components/ui";
import { ROLES } from "@/lib/types";
import { compresserImage, formatFC, formatTel, aujourdhui } from "@/lib/utils";
import { actions, useAppState } from "@/store/store";
import {
  LIBELLE_ETAT,
  etatAbonnement,
  nomParoisse,
  rappelAbonnement,
} from "@/store/selectors";
import { useNav, type Route } from "@/navigation";

export function EcranCompte() {
  const etat = useAppState();
  const nav = useNav();
  const toast = useToast();
  const u = etat.utilisateurs.find((x) => x.id === etat.currentUserId)!;
  const paroisse = etat.paroisses.find((p) => p.id === u.paroisseId);
  const dean = ["responsable", "membre"].includes(u.role);
  const [mdpOuvert, setMdpOuvert] = useState(false);
  const [ancien, setAncien] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmer, setConfirmer] = useState("");
  const [erreur, setErreur] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const onglets = [
    { id: "accueil", label: "Accueil", icone: <IconeAccueil /> },
    {
      id: dean ? "rapports" : "jeunes",
      label: dean ? "Rapports" : "Jeunes",
      icone: dean ? <IconeRapports /> : <IconeJeunes />,
    },
    {
      id: dean ? "paroisses" : "rapport",
      label: dean ? "Paroisses" : "Rapports",
      icone: dean ? <IconeParoisses /> : <IconeRapports />,
    },
    { id: "compte", label: "Compte", icone: <IconeCompte /> },
  ];
  return (
    <AppShell
      titre="Mon compte"
      sousTitre="Votre profil et vos préférences"
      onglets={onglets}
      ongletActif="compte"
      onOnglet={(id) => nav.onglet({ nom: id } as Route)}
    >
      <div className="entry mx-auto max-w-[700px]">
        <div className="mb-7 flex items-center gap-5">
          <div className="relative">
            {u.photo ? (
              <img
                src={u.photo}
                alt="Photo de profil"
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <Avatar nom={u.nom} taille={80} />
            )}
            <button
              aria-label="Choisir une photo de profil"
              disabled={photoBusy}
              className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-[3px] border-white bg-[var(--accent)] text-white"
              onClick={() => photoRef.current?.click()}
            >
              <Camera size={13} />
            </button>
          </div>
          <div className="min-w-0">
            <h1 className="text-[23px] font-semibold tracking-tight">
              {u.nom}
            </h1>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {ROLES.find((r) => r.id === u.role)?.label}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {paroisse?.nom ?? etat.doyenne.nom}
            </p>
            <p className="mt-2 text-xs text-[var(--blue)]">
              {formatTel(u.telephone)}
            </p>
          </div>
        </div>
        <input
          ref={photoRef}
          aria-label="Fichier photo de profil"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (
              !/^image\/(jpeg|png|webp)$/.test(file.type) ||
              file.size > 12 * 1024 * 1024
            ) {
              toast(
                "Choisissez une image JPG, PNG ou WebP de moins de 12 Mo.",
                "danger",
              );
              return;
            }
            setPhotoBusy(true);
            try {
              const data = await compresserImage(file, 400, 0.8);
              const res = await actions.changerPhotoProfil(u.id, data);
              toast(res.message);
            } catch {
              toast("Impossible de lire cette image.", "danger");
            } finally {
              setPhotoBusy(false);
              if (photoRef.current) photoRef.current.value = "";
            }
          }}
        />
        <div className="mb-8 flex flex-wrap gap-3">
          <button
            className="primary-link min-h-10 text-xs"
            disabled={photoBusy}
            onClick={() => photoRef.current?.click()}
          >
            {photoBusy
              ? "Enregistrement de la photo…"
              : u.photo
                ? "Changer ma photo"
                : "Ajouter ma photo"}
          </button>
          {u.photo && (
            <button
              className="min-h-10 text-xs text-[var(--muted)]"
              onClick={async () => {
                const res = await actions.changerPhotoProfil(u.id, null);
                toast(res.message);
              }}
            >
              Retirer la photo
            </button>
          )}
        </div>
        <SectionTitre>Mon espace</SectionTitre>
        <Carte className="overflow-hidden p-0">
          <LigneMenu
            titre="Communiqués du doyenné"
            sousTitre="Les messages de l'administration"
            gauche={<Megaphone size={20} />}
            onClick={() => nav.aller({ nom: "communiques" })}
          />
          <div className="border-t border-[var(--border)]">
            <LigneMenu
              titre="Notifications"
              sousTitre="Rapports, rappels et abonnements"
              gauche={<IconeCloche className="h-5 w-5" />}
              onClick={() => nav.aller({ nom: "notifications" })}
            />
          </div>
          {!dean && (
            <>
              <div className="border-t border-[var(--border)]">
                <LigneMenu
                  titre="Mon abonnement"
                  gauche={<IconeArgent className="h-5 w-5" />}
                  onClick={() => nav.aller({ nom: "abonnement" })}
                />
              </div>
              <div className="border-t border-[var(--border)]">
                <LigneMenu
                  titre="Mon équipe"
                  gauche={<IconeGroupe className="h-5 w-5" />}
                  onClick={() => nav.aller({ nom: "equipe" })}
                />
              </div>
            </>
          )}
        </Carte>
        <SectionTitre>Sécurité & affichage</SectionTitre>
        <Carte className="overflow-hidden p-0">
          <LigneMenu
            titre="Modifier mon mot de passe"
            sousTitre="Votre mot de passe initial reste utilisable en cas d'oubli"
            gauche={<ShieldCheck size={20} />}
            onClick={() => {
              setMdpOuvert(true);
              setErreur("");
            }}
          />
          <div className="flex items-center gap-3 border-t border-[var(--border)] px-4 py-4">
            <Sun size={20} className="text-[var(--accent)]" />
            <div>
              <p className="text-sm font-semibold">Toujours en mode clair</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Les couleurs de notre mouvement, tout simplement.
              </p>
            </div>
            <span className="ml-auto flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[var(--accent)]" />
              <span className="h-3 w-3 rounded-full bg-[var(--blue)]" />
            </span>
          </div>
        </Carte>
        {dean && (
          <>
            <SectionTitre>Administration</SectionTitre>
            <Carte className="overflow-hidden p-0">
              {u.role === "responsable" && (
                <LigneMenu
                  titre="Espace d'administration"
                  sousTitre="Comptes, communiqués et configuration"
                  gauche={<IconeTableau className="h-5 w-5" />}
                  onClick={() => nav.aller({ nom: "admin" })}
                />
              )}
              <LigneMenu
                titre="Paroisses"
                gauche={<IconeListe className="h-5 w-5" />}
                onClick={() => nav.aller({ nom: "paroisses" })}
              />
              <LigneMenu
                titre="Thèmes de formation"
                gauche={<IconeTheme className="h-5 w-5" />}
                onClick={() => nav.aller({ nom: "themes" })}
              />
            </Carte>
          </>
        )}
        <SectionTitre>L'application</SectionTitre>
        <Carte className="overflow-hidden p-0">
          <LigneMenu
            titre="À propos de JEFAC Rapports"
            sousTitre="Notre mission, l'assistance et les mentions légales"
            gauche={<Info size={20} />}
            onClick={() => nav.aller({ nom: "a-propos" })}
          />
          <div className="border-t border-[var(--border)]">
            <LigneMenu
              titre="Se déconnecter"
              gauche={<IconeDeconnexion className="h-5 w-5" />}
              ton="text-[var(--accent)]"
              onClick={() => actions.deconnexion()}
            />
          </div>
        </Carte>
        <p className="mt-7 text-center text-[11px] text-[var(--muted)]">
          JEFAC Rapports · Version 1.0 (PWA) · Conçu par LIOMBA
        </p>
        <Modale
          ouvert={mdpOuvert}
          onFermer={() => setMdpOuvert(false)}
          titre="Modifier mon mot de passe"
          pied={
            <Bouton
              className="w-full"
              onClick={async () => {
                if (nouveau !== confirmer) {
                  setErreur("Les mots de passe ne correspondent pas.");
                  return;
                }
                const res = await actions.changerMotDePasse(
                  u.id,
                  ancien,
                  nouveau,
                );
                if (!res.ok) {
                  setErreur(res.message);
                  return;
                }
                toast(res.message);
                setMdpOuvert(false);
                setAncien("");
                setNouveau("");
                setConfirmer("");
              }}
            >
              Enregistrer mon mot de passe
            </Bouton>
          }
        >
          <div className="space-y-4 pb-3">
            {erreur && <Alerte ton="danger">{erreur}</Alerte>}
            <Champ label="Mot de passe actuel ou initial">
              <Input
                type="password"
                autoComplete="current-password"
                value={ancien}
                onChange={(e) => setAncien(e.target.value)}
              />
            </Champ>
            <Champ label="Nouveau mot de passe" hint="Au moins 8 caractères.">
              <Input
                type="password"
                autoComplete="new-password"
                value={nouveau}
                onChange={(e) => setNouveau(e.target.value)}
              />
            </Champ>
            <Champ label="Confirmer le nouveau mot de passe">
              <Input
                type="password"
                autoComplete="new-password"
                value={confirmer}
                onChange={(e) => setConfirmer(e.target.value)}
              />
            </Champ>
          </div>
        </Modale>
      </div>
    </AppShell>
  );
}

export function EcranAbonnement() {
  const etat = useAppState();
  const nav = useNav();
  const toast = useToast();
  const u = etat.utilisateurs.find((x) => x.id === etat.currentUserId)!;
  const paroisse = etat.paroisses.find((p) => p.id === u.paroisseId);
  const etatAbo = paroisse ? etatAbonnement(etat, paroisse.id) : "SANS";
  const paiements = etat.paiements.filter((p) => p.paroisseId === u.paroisseId);
  const abonnements = etat.abonnements
    .filter((a) => a.paroisseId === u.paroisseId)
    .sort((a, b) => (a.fin < b.fin ? 1 : -1));

  const [type, setType] = useState<"mensuel" | "annuel">("mensuel");
  const [montant, setMontant] = useState(String(etat.reglage.prixMensuel));
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(aujourdhui());
  const [erreur, setErreur] = useState("");

  return (
    <AppShell
      titre="Mon abonnement"
      sousTitre={paroisse?.nom}
      retour
      onRetour={() => nav.retour()}
    >
      <Carte>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] text-[var(--muted)]">État</div>
            <div className="text-[19px] font-bold">{LIBELLE_ETAT[etatAbo]}</div>
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
        {abonnements[0] && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-[13.5px]">
            <div>
              <div className="text-[var(--muted)]">Début</div>
              <div className="font-semibold">{abonnements[0].debut}</div>
            </div>
            <div>
              <div className="text-[var(--muted)]">Fin</div>
              <div className="font-semibold">{abonnements[0].fin}</div>
            </div>
          </div>
        )}
        {rappelAbonnement(etat, u.paroisseId ?? "") && (
          <Alerte ton="warn" className="mt-3">
            {rappelAbonnement(etat, u.paroisseId ?? "")}
          </Alerte>
        )}
      </Carte>

      <SectionTitre>Tarifs</SectionTitre>
      <Carte className="space-y-1">
        <div className="flex justify-between text-[14.5px]">
          <span>Abonnement mensuel</span>
          <b>{formatFC(etat.reglage.prixMensuel)}</b>
        </div>
        <div className="flex justify-between text-[14.5px]">
          <span>Abonnement annuel</span>
          <b>{formatFC(etat.reglage.prixAnnuel)}</b>
        </div>
        <div className="flex justify-between text-[14.5px]">
          <span>Délai de grâce après l'échéance</span>
          <b>{etat.reglage.joursGrace} jours</b>
        </div>
        <div className="mt-2 rounded-2xl bg-[var(--surface-2)] p-3">
          <div className="text-[13px] text-[var(--muted)]">
            Numéro de paiement (Mobile Money)
          </div>
          <div className="text-[20px] font-extrabold tracking-wide">
            {etat.reglage.numeroPaiement}
          </div>
          <div className="text-[13px] text-[var(--muted)]">
            Au nom de {etat.reglage.titulaire}
          </div>
        </div>
      </Carte>

      <SectionTitre>Déclarer un paiement</SectionTitre>
      <Carte className="space-y-3">
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
            <option value="mensuel">
              Mensuel — {formatFC(etat.reglage.prixMensuel)}
            </option>
            <option value="annuel">
              Annuel — {formatFC(etat.reglage.prixAnnuel)}
            </option>
          </Select>
        </Champ>
        <Champ label="Montant transféré">
          <Input
            type="number"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
          />
        </Champ>
        <Champ
          label="Référence du SMS de l'opérateur"
          hint="Elle ne peut servir qu'une seule fois."
        >
          <Input
            value={reference}
            placeholder="MP-260923-7754"
            onChange={(e) => setReference(e.target.value)}
          />
        </Champ>
        <Champ label="Date du paiement">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Champ>
        {erreur && <Alerte ton="danger">{erreur}</Alerte>}
        <Bouton
          className="w-full"
          onClick={async () => {
            setErreur("");
            const res = await actions.declarerPaiement({
              paroisseId: u.paroisseId ?? "",
              type,
              montant: Number(montant),
              reference,
              date,
            });
            if (!res.ok) {
              setErreur(res.message);
              return;
            }
            toast(res.message, "ok");
            setReference("");
          }}
        >
          Envoyer la déclaration
        </Bouton>
        <p className="text-[12.5px] text-[var(--muted)] leading-snug">
          Le responsable du doyenné vérifie l'arrivée de l'argent sur son
          téléphone, puis confirme ou refuse avec un motif.
        </p>
      </Carte>

      <SectionTitre>Mes paiements</SectionTitre>
      <div className="space-y-2">
        {paiements.length === 0 && (
          <Carte>
            <p className="text-[14px] text-[var(--muted)]">
              Aucun paiement déclaré pour l'instant.
            </p>
          </Carte>
        )}
        {paiements.map((p) => (
          <Carte key={p.id}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-[15px]">
                  {formatFC(p.montant)}
                </div>
                <div className="text-[12.5px] text-[var(--muted)]">
                  {p.type === "mensuel" ? "Mensuel" : "Annuel"} · {p.date} ·
                  réf. {p.reference}
                </div>
                {p.motifRefus && (
                  <div className="mt-1 text-[13px] text-[var(--danger)]">
                    Motif du refus : {p.motifRefus}
                  </div>
                )}
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
                {p.statut === "en_attente"
                  ? "En attente"
                  : p.statut === "confirme"
                    ? "Confirmé"
                    : p.statut === "refuse"
                      ? "Refusé"
                      : "Annulé"}
              </Etiquette>
            </div>
          </Carte>
        ))}
      </div>
    </AppShell>
  );
}

export function EcranEquipe() {
  const etat = useAppState();
  const nav = useNav();
  const u = etat.utilisateurs.find((x) => x.id === etat.currentUserId)!;
  const equipe = etat.utilisateurs.filter((x) => x.paroisseId === u.paroisseId);

  return (
    <AppShell
      titre="Équipe de la paroisse"
      sousTitre={nomParoisse(etat, u.paroisseId)}
      retour
      onRetour={() => nav.retour()}
    >
      <div className="space-y-2">
        {equipe.length === 0 && (
          <Carte>
            <p className="text-[14px] text-[var(--muted)]">
              Aucun compte dans cette paroisse.
            </p>
          </Carte>
        )}
        {equipe.map((m) => (
          <Carte key={m.id}>
            <div className="flex items-center gap-3">
              <Avatar nom={m.nom} taille={44} />
              <div className="min-w-0 grow">
                <div className="font-semibold text-[15px] truncate">
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
            </div>
          </Carte>
        ))}
      </div>
      <p className="mt-4 text-[12.5px] text-[var(--muted)] leading-snug">
        Trois comptes maximum par paroisse : un chargé, un adjoint et un chargé
        de paroisse. Le responsable du doyenné peut retirer un compte et
        réinitialiser son mot de passe.
      </p>
    </AppShell>
  );
}

export function EcranChangerMotDePasse({
  onTermine,
}: {
  onTermine: () => void;
}) {
  const etat = useAppState();
  const toast = useToast();
  const u = etat.utilisateurs.find((x) => x.id === etat.currentUserId)!;
  const [ancien, setAncien] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [erreur, setErreur] = useState("");

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-8">
      <div className="mx-auto w-full max-w-[460px]">
        <h1 className="text-[21px] font-extrabold">Mot de passe temporaire</h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          Le responsable du doyenné a réinitialisé votre mot de passe.
          Choisissez un nouveau mot de passe pour continuer.
        </p>
        <div className="mt-5 space-y-3">
          {erreur && <Alerte ton="danger">{erreur}</Alerte>}
          <Carte className="space-y-3">
            <Champ label="Mot de passe temporaire reçu">
              <Input
                type="password"
                value={ancien}
                onChange={(e) => setAncien(e.target.value)}
              />
            </Champ>
            <Champ label="Nouveau mot de passe">
              <Input
                type="password"
                value={nouveau}
                onChange={(e) => setNouveau(e.target.value)}
              />
            </Champ>
            <Bouton
              taille="lg"
              className="w-full"
              onClick={async () => {
                setErreur("");
                const res = await actions.changerMotDePasse(
                  u.id,
                  ancien,
                  nouveau,
                );
                if (!res.ok) {
                  setErreur(res.message);
                  return;
                }
                toast(res.message, "ok");
                onTermine();
              }}
            >
              Enregistrer et continuer
            </Bouton>
          </Carte>
          <Bouton
            variante="contour"
            className="w-full"
            onClick={() => actions.deconnexion()}
          >
            Se déconnecter
          </Bouton>
        </div>
      </div>
    </div>
  );
}
