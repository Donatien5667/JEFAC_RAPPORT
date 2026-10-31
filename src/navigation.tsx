import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Route =
  | { nom: "accueil" }
  | { nom: "jeunes" }
  | { nom: "ajout-jeune"; jeuneId?: string }
  | { nom: "jeune"; jeuneId: string }
  | { nom: "rapport" }
  | { nom: "compte" }
  | { nom: "notifications" }
  | { nom: "abonnement" }
  | { nom: "equipe" }
  | { nom: "paroisses" }
  | { nom: "paroisse"; paroisseId: string }
  | { nom: "rapports" }
  | { nom: "themes" }
  | { nom: "admin"; section?: string }
  | { nom: "communiques" }
  | { nom: "a-propos" }
  | { nom: "detail-rapport"; rapportId: string };

interface Nav {
  pile: Route[];
  aller: (r: Route) => void;
  retour: () => void;
  remplacer: (r: Route) => void;
  onglet: (r: Route) => void;
  route: Route;
}

const Ctx = createContext<Nav | null>(null);

export function NavigationProvider({
  children,
  routeInitiale = { nom: "accueil" },
}: {
  children: ReactNode;
  routeInitiale?: Route;
}) {
  const [pile, setPile] = useState<Route[]>([routeInitiale]);

  const valeur = useMemo<Nav>(
    () => ({
      pile,
      route: pile[pile.length - 1],
      aller: (r) => setPile((p) => [...p, r]),
      retour: () =>
        setPile((p) => (p.length > 1 ? p.slice(0, -1) : [{ nom: "accueil" }])),
      remplacer: (r) => setPile((p) => [...p.slice(0, -1), r]),
      onglet: (r) => setPile([r]),
    }),
    [pile],
  );

  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}

export function useNav(): Nav {
  const v = useContext(Ctx);
  if (!v) throw new Error("Navigation indisponible");
  return v;
}
