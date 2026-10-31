import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Smartphone,
  Phone,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Alerte, Bouton, Champ, Input, Modale } from "@/components/ui";
import { useAppState, actions } from "@/store/store";
import { useConnection } from "@/db/connection";
import { useNav } from "@/navigation";

export function EcranAuth({
  onSuite,
  modeAdmin = false,
}: {
  onSuite: (doitChangerMdp: boolean) => void;
  modeAdmin?: boolean;
}) {
  const etat = useAppState();
  const connection = useConnection();
  const nav = useNav();
  const [admin, setAdmin] = useState(modeAdmin);
  const [setup, setSetup] = useState(false);
  const [telephone, setTelephone] = useState(
    () =>
      new URLSearchParams(
        window.location.search || window.location.hash.split("?")[1],
      ).get("tel") || "",
  );
  const [mdp, setMdp] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [nom, setNom] = useState("");
  const [doyenne, setDoyenne] = useState("");
  const [paroisse, setParoisse] = useState("");
  const [key, setKey] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState("");
  const [aide, setAide] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setErreur("");
    if (setup && mdp !== confirmation) {
      setErreur("Les mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    const res = setup
      ? await actions.configurerInstallation({
          nom,
          telephone,
          mdp,
          doyenne,
          paroisse,
          cleInstallation: key,
        })
      : await actions.connexion(telephone, mdp, admin);
    setBusy(false);
    if (!res.ok) {
      setErreur(res.message);
      return;
    }
    history.replaceState(
      {},
      "",
      res.extra?.role === "responsable" ? "/admin" : "/connexion",
    );
    nav.onglet({
      nom: res.extra?.role === "responsable" ? "admin" : "accueil",
    });
    onSuite(!!res.doitChangerMdp);
  }
  function portail(value: boolean) {
    setAdmin(value);
    setSetup(false);
    setErreur("");
    history.replaceState({}, "", value ? "/admin" : "/connexion");
  }

  return (
    <div className="auth-page">
      <header className="auth-header">
        <span className="text-xs font-semibold tracking-wide text-[var(--muted)]">
          LE MOUVEMENT, EN LIEN.
        </span>
        <a
          href="tel:+243853993269"
          className="flex items-center gap-2 text-xs font-medium text-[var(--blue)]"
        >
          <Phone size={14} /> Besoin d'aide ?
        </a>
      </header>
      <main className="auth-main">
        <div className="auth-brand entry">
          <Logo taille={174} />
          <h1>
            <span className="text-[var(--accent)]">JEFAC</span>
            <br className="desktop-only" /> Rapports
            <span className="text-[var(--accent)]">.</span>
          </h1>
          <p className="brand-description">
            Grandir ensemble.
            <br />
            Accompagner chaque jeune, relier chaque paroisse.
          </p>
          <div className="motto">Excellence et Rayonnement</div>
        </div>
        <section className="auth-form entry" style={{ animationDelay: "90ms" }}>
          <div
            className="auth-tabs"
            role="tablist"
            aria-label="Espace de connexion"
          >
            <button
              role="tab"
              aria-selected={!admin}
              className={!admin ? "active" : ""}
              onClick={() => portail(false)}
            >
              Espace paroisse
            </button>
            <button
              role="tab"
              aria-selected={admin}
              className={admin ? "active" : ""}
              onClick={() => portail(true)}
            >
              Administration
            </button>
          </div>
          <div className="mb-7">
            <h2 className="text-[25px] font-semibold tracking-tight">
              {setup ? "Créons votre espace." : "Heureux de vous retrouver."}
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">
              {setup
                ? "Vos vraies informations, une base sans données fictives."
                : admin
                  ? "Connectez-vous pour accompagner votre doyenné."
                  : "Votre numéro et le mot de passe remis par l'administration suffisent."}
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            {erreur && (
              <div role="alert">
                <Alerte ton="danger">{erreur}</Alerte>
              </div>
            )}
            {setup && (
              <>
                <Champ label="Votre nom complet">
                  <Input
                    required
                    maxLength={100}
                    autoComplete="name"
                    placeholder="Prénom et nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                  />
                </Champ>
                <Champ label="Nom du doyenné">
                  <Input
                    required
                    maxLength={120}
                    placeholder="Votre doyenné"
                    value={doyenne}
                    onChange={(e) => setDoyenne(e.target.value)}
                  />
                </Champ>
                <Champ label="Première paroisse">
                  <Input
                    required
                    maxLength={120}
                    placeholder="Nom de votre paroisse"
                    value={paroisse}
                    onChange={(e) => setParoisse(e.target.value)}
                  />
                </Champ>
              </>
            )}
            <Champ label="Numéro de téléphone">
              <div className="relative">
                <span className="absolute left-3.5 top-[13px] border-r border-[var(--border)] pr-3 text-sm text-[var(--muted)]">
                  +243
                </span>
                <Input
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="username"
                  maxLength={20}
                  className="pl-20"
                  placeholder="8XX XXX XXX"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                />
              </div>
            </Champ>
            <Champ
              label={
                setup ? "Votre mot de passe administrateur" : "Mot de passe"
              }
            >
              <div className="relative">
                <Input
                  required
                  type={visible ? "text" : "password"}
                  minLength={setup ? 8 : 1}
                  maxLength={256}
                  autoComplete={setup ? "new-password" : "current-password"}
                  placeholder={
                    setup
                      ? "8 caractères minimum"
                      : "Saisissez votre mot de passe"
                  }
                  className="pr-12"
                  value={mdp}
                  onChange={(e) => setMdp(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-1 top-1 grid h-10 w-10 place-items-center text-[var(--muted)]"
                  aria-label={
                    visible
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </Champ>
            {setup && (
              <Champ label="Confirmer le mot de passe">
                <Input
                  required
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </Champ>
            )}
            {setup && connection.mode === "serveur" && (
              <Champ
                label="Clé de première installation"
                hint="La clé privée fournie au démarrage du serveur, réservée au propriétaire."
              >
                <Input
                  required
                  type="password"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                />
              </Champ>
            )}
            {!setup && (
              <div className="text-right">
                <button
                  type="button"
                  className="primary-link min-h-8 text-xs"
                  onClick={() => setAide(true)}
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}
            <Bouton
              type="submit"
              className="w-full"
              taille="lg"
              disabled={busy || connection.mode === "erreur"}
            >
              {busy
                ? "Un instant…"
                : setup
                  ? "Créer mon administration"
                  : "Se connecter"}
              {!busy && <ArrowRight size={17} />}
            </Bouton>
          </form>
          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[var(--muted)]">
            <ShieldCheck size={14} />{" "}
            {connection.mode === "serveur"
              ? "Connexion sécurisée · Accès réservé aux membres"
              : "Enregistrement local · Sur cet appareil uniquement"}
          </div>
          {connection.mode === "local" && (
            <p className="mt-3 text-center text-[11px] leading-5 text-[var(--muted)]">
              Les comptes restent sur cet appareil. Envoyer le lien ne permet
              pas encore aux autres téléphones de s'y connecter : le serveur
              partagé doit d'abord être mis en ligne.
            </p>
          )}
          {!etat.installationComplete && (
            <div className="mt-6 border-t border-[var(--border)] pt-5 text-center">
              <button
                className="primary-link min-h-10 text-xs"
                onClick={() => {
                  setSetup(!setup);
                  setAdmin(true);
                  setErreur("");
                }}
              >
                {setup
                  ? "Revenir à la connexion"
                  : "Première utilisation ? Configurer l'administration"}{" "}
                <ArrowUpRight size={13} className="ml-1 inline" />
              </button>
            </div>
          )}
        </section>
      </main>
      <footer className="auth-footer">
        <span>
          © 2026 JEFAC Rapports. Une solution{" "}
          <strong className="font-semibold text-[var(--text)]">LIOMBA</strong>.
        </span>
        <div className="flex items-center justify-center gap-5">
          <span className="flex items-center gap-1.5">
            <Smartphone size={13} /> Version 1.0 (PWA)
          </span>
          <button
            className="text-[var(--blue)]"
            onClick={() => nav.aller({ nom: "a-propos" })}
          >
            À propos
          </button>
        </div>
      </footer>
      <Modale
        ouvert={aide}
        onFermer={() => setAide(false)}
        titre="Retrouver votre accès"
      >
        <p className="text-sm leading-7 text-[var(--muted)]">
          Le mot de passe initial remis par l'administration reste utilisable,
          même après un changement de mot de passe. Si vous ne l'avez plus,
          demandez à votre administrateur d'en générer un nouveau.
        </p>
        <a
          className="mt-5 inline-flex items-center gap-2 py-2 text-sm font-semibold text-[var(--blue)]"
          href="tel:+243853993269"
        >
          <Phone size={16} /> +243 853 993 269
        </a>
      </Modale>
    </div>
  );
}
