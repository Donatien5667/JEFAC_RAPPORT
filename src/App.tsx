import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { Bouton, ToastProvider } from "@/components/ui";
import { ImpressionProvider } from "@/impression";
import { NavigationProvider, useNav, type Route } from "@/navigation";
import { EcranAdmin } from "@/screens/Admin";
import { EcranAuth } from "@/screens/Auth";
import {
  EcranAbonnement,
  EcranChangerMotDePasse,
  EcranCompte,
  EcranEquipe,
} from "@/screens/Compte";
import {
  EcranDetailParoisse,
  EcranAccueilDoyenne,
  EcranParoisses,
  EcranThemes,
} from "@/screens/Doyenne";
import { EcranAjoutJeune, EcranJeunes } from "@/screens/Jeunes";
import { EcranAccueilParoisse } from "@/screens/ParishHome";
import { EcranRapport } from "@/screens/Rapport";
import {
  EcranDetailRapport,
  EcranNotifications,
  EcranRapportsDoyenne,
} from "@/screens/RapportsDoyenne";
import { EcranCommuniques } from "@/screens/Communiques";
import { EcranAPropos } from "@/screens/APropos";
import { userCourant } from "@/store/selectors";
import { actions, initialiserBase, useAppState } from "@/store/store";
import { useApparence } from "@/theme";
import { useConnection } from "@/db/connection";

function estRouteAdmin() {
  return (
    window.location.pathname.replace(/\/+$/, "").endsWith("/admin") ||
    window.location.hash.replace(/^#\/?/, "").startsWith("admin")
  );
}
export default function App() {
  return (
    <ImpressionProvider>
      <NavigationProvider
        routeInitiale={estRouteAdmin() ? { nom: "admin" } : { nom: "accueil" }}
      >
        <ToastProvider>
          <Interieur />
        </ToastProvider>
      </NavigationProvider>
    </ImpressionProvider>
  );
}
function Interieur() {
  const etat = useAppState();
  const nav = useNav();
  const connection = useConnection();
  const [pret, setPret] = useState(false);
  useApparence();
  useEffect(() => {
    void initialiserBase().finally(() => setPret(true));
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [nav.route.nom]);
  if (!pret) return <EcranChargement />;
  if (connection.mode === "erreur")
    return (
      <EtatErreur>
        <p>{connection.message}</p>
        <Bouton onClick={() => location.reload()}>Réessayer</Bouton>
      </EtatErreur>
    );
  const user = userCourant(etat);
  if (nav.route.nom === "a-propos") return <EcranAPropos />;
  if (!user)
    return <EcranAuth modeAdmin={estRouteAdmin()} onSuite={() => {}} />;
  if (user.doitChangerMdp)
    return (
      <EcranChangerMotDePasse
        onTermine={() =>
          nav.onglet({ nom: user.role === "responsable" ? "admin" : "accueil" })
        }
      />
    );
  const dean = ["responsable", "membre"].includes(user.role);
  if (
    (nav.route.nom === "admin" && user.role !== "responsable") ||
    (["paroisses", "paroisse", "themes"].includes(nav.route.nom) && !dean)
  ) {
    return (
      <EtatErreur>
        <p>Cet espace est réservé à l'administration du doyenné.</p>
        <Bouton onClick={() => nav.onglet({ nom: "accueil" })}>
          Revenir à mon espace
        </Bouton>
        <Bouton variante="contour" onClick={() => actions.deconnexion()}>
          Se déconnecter
        </Bouton>
      </EtatErreur>
    );
  }
  return <div className="sans-impression">{renduRoute(nav.route, dean)}</div>;
}
function renduRoute(route: Route, dean: boolean) {
  switch (route.nom) {
    case "accueil":
      return dean ? <EcranAccueilDoyenne /> : <EcranAccueilParoisse />;
    case "jeunes":
      return <EcranJeunes />;
    case "ajout-jeune":
      return <EcranAjoutJeune jeuneId={route.jeuneId} />;
    case "jeune":
      return <EcranJeunes />;
    case "rapport":
      return <EcranRapport />;
    case "compte":
      return <EcranCompte />;
    case "notifications":
      return <EcranNotifications />;
    case "abonnement":
      return <EcranAbonnement />;
    case "equipe":
      return <EcranEquipe />;
    case "paroisses":
      return <EcranParoisses />;
    case "paroisse":
      return <EcranDetailParoisse paroisseId={route.paroisseId} />;
    case "rapports":
      return <EcranRapportsDoyenne />;
    case "themes":
      return <EcranThemes />;
    case "admin":
      return <EcranAdmin />;
    case "communiques":
      return <EcranCommuniques />;
    case "a-propos":
      return <EcranAPropos />;
    case "detail-rapport":
      return <EcranDetailRapport rapportId={route.rapportId} />;
  }
}
function EtatErreur({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-7 text-center">
      <Logo taille={90} />
      <h1 className="text-xl font-semibold">JEFAC Rapports</h1>
      {children}
    </div>
  );
}
function EcranChargement() {
  return (
    <div className="grid min-h-screen place-items-center bg-white">
      <div className="entry flex flex-col items-center gap-5">
        <Logo taille={90} />
        <p className="text-xs text-[var(--muted)]">
          Ouverture de votre espace…
        </p>
      </div>
    </div>
  );
}
