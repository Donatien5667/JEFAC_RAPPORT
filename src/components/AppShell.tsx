import type { ReactNode } from "react";
import { cn } from "@/utils/cn";
import { Logo } from "./Logo";
import { IconeRetour } from "./Icones";

export type Onglet = {
  id: string;
  label: string;
  icone: ReactNode;
  badge?: number;
};

export function AppShell({
  titre,
  sousTitre,
  retour,
  onRetour,
  actions,
  onglets,
  ongletActif,
  onOnglet,
  children,
  className,
}: {
  titre: string;
  sousTitre?: string;
  retour?: boolean;
  onRetour?: () => void;
  actions?: ReactNode;
  onglets?: Onglet[];
  ongletActif?: string;
  onOnglet?: (id: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-screen flex-col bg-[var(--bg)]", className)}>
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1100px] items-center gap-3 px-4">
          {!retour && <Logo taille={35} />}
          {retour && (
            <button
              onClick={onRetour}
              aria-label="Retour"
              className="grid h-11 w-11 place-items-center rounded-full text-[var(--text)] active:bg-[var(--surface-2)]"
            >
              <IconeRetour className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0 grow px-1">
            <div className="truncate text-[16px] font-bold leading-tight">
              {titre}
            </div>
            {sousTitre && (
              <div className="truncate text-[12.5px] text-[var(--muted)] leading-tight">
                {sousTitre}
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
      </header>

      <main key={titre} className="screen-content grow route-enter">
        {children}
      </main>

      {onglets && onglets.length > 0 && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] sans-impression">
          <div className="mx-auto flex max-w-[1040px]">
            {onglets.map((o) => {
              const actif = o.id === ongletActif;
              return (
                <button
                  key={o.id}
                  onClick={() => onOnglet?.(o.id)}
                  aria-current={actif ? "page" : undefined}
                  className={cn(
                    "nav-item relative flex h-16 flex-1 flex-col items-center justify-center gap-1 transition",
                    actif ? "text-[var(--accent)]" : "text-[var(--muted)]",
                  )}
                >
                  <span className="relative">
                    <span
                      className={cn(
                        "nav-icon block h-6 w-6",
                        actif && "[&>svg]:h-6 [&>svg]:w-6",
                      )}
                    >
                      {o.icone}
                    </span>
                    {!!o.badge && o.badge > 0 && (
                      <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white">
                        {o.badge > 9 ? "9+" : o.badge}
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-semibold leading-none">
                    {o.label}
                  </span>
                  {actif && (
                    <span className="nav-indicator" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

export function BoutonIcone({
  children,
  onClick,
  libelle,
  badge,
}: {
  children: ReactNode;
  onClick?: () => void;
  libelle: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={libelle}
      className="relative grid h-11 w-11 place-items-center rounded-full text-[var(--text)] active:bg-[var(--surface-2)]"
    >
      {children}
      {!!badge && badge > 0 && (
        <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}
