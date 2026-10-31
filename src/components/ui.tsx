import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/utils/cn";
import { IconeAlerte, IconeCroix } from "./Icones";

/* ---------------- Bouton ---------------- */

export type Variante =
  | "primaire"
  | "secondaire"
  | "fantome"
  | "danger"
  | "contour";
export type Taille = "sm" | "md" | "lg";

export function Bouton({
  variante = "primaire",
  taille = "md",
  className,
  children,
  onClick,
  disabled,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  taille?: Taille;
}) {
  const [pending, setPending] = useState(false);
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.98] hover:brightness-[.97] disabled:opacity-45 disabled:pointer-events-none select-none";
  const tailles: Record<Taille, string> = {
    sm: "h-10 px-3 text-[13px] rounded-xl",
    md: "h-11 px-4 text-[15px]",
    lg: "h-14 px-5 text-[16px]",
  };
  const variantes: Record<Variante, string> = {
    primaire:
      "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[var(--shadow)]",
    secondaire: "bg-[var(--surface-2)] text-[var(--text)]",
    fantome: "text-[var(--accent)] bg-transparent",
    contour:
      "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]",
    danger: "bg-[var(--danger)] text-white",
  };
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cn(base, tailles[taille], variantes[variante], className)}
      {...rest}
      onClick={async (event) => {
        if (pending || !onClick) return;
        const result = onClick(event) as unknown;
        if (result instanceof Promise) {
          setPending(true);
          try {
            await result;
          } finally {
            setPending(false);
          }
        }
      }}
    >
      {children}
    </button>
  );
}

/* ---------------- Conteneurs ---------------- */

export function Carte({
  className,
  children,
  onClick,
}: {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 transition-all duration-200",
        onClick &&
          "cursor-pointer active:scale-[.995] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(36,41,44,.07)] motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitre({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center justify-between mb-2 mt-5", className)}
    >
      <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
        {children}
      </h2>
      {action}
    </div>
  );
}

/* ---------------- Étiquettes ---------------- */

export type Ton = "neutre" | "ok" | "warn" | "danger" | "info" | "accent";

export function Etiquette({
  ton = "neutre",
  children,
  className,
}: {
  ton?: Ton;
  children: ReactNode;
  className?: string;
}) {
  const tons: Record<Ton, string> = {
    neutre: "bg-[var(--surface-2)] text-[var(--muted)]",
    ok: "bg-[var(--ok-soft)] text-[var(--ok)]",
    warn: "bg-[var(--warn-soft)] text-[var(--warn)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
    info: "bg-[var(--info-soft)] text-[var(--info)]",
    accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold",
        tons[ton],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Alerte({
  ton = "warn",
  titre,
  children,
  className,
}: {
  ton?: Ton;
  titre?: string;
  children?: ReactNode;
  className?: string;
}) {
  const tons: Record<Ton, string> = {
    neutre: "bg-[var(--surface-2)] text-[var(--text)]",
    ok: "bg-[var(--ok-soft)] text-[var(--ok)]",
    warn: "bg-[var(--warn-soft)] text-[var(--warn)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
    info: "bg-[var(--info-soft)] text-[var(--info)]",
    accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
  };
  return (
    <div
      className={cn(
        "rounded-2xl p-3 text-[14px] flex gap-2 items-start",
        tons[ton],
        className,
      )}
    >
      <IconeAlerte className="w-5 h-5 mt-px" />
      <div className="min-w-0">
        {titre && <div className="font-bold">{titre}</div>}
        {children && <div className="leading-snug">{children}</div>}
      </div>
    </div>
  );
}

/* ---------------- Champs ---------------- */

const FieldContext = createContext<{
  inputId?: string;
  labelId?: string;
  hintId?: string;
}>({});

export function Champ({
  label,
  hint,
  erreur,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  erreur?: string;
  children: ReactNode;
  className?: string;
}) {
  const fieldId = useId();
  return (
    <FieldContext.Provider
      value={{
        inputId: `${fieldId}-input`,
        labelId: label ? `${fieldId}-label` : undefined,
        hintId: hint || erreur ? `${fieldId}-hint` : undefined,
      }}
    >
      <div className={cn("block", className)}>
        {label && (
          <label
            htmlFor={`${fieldId}-input`}
            id={`${fieldId}-label`}
            className="mb-1.5 block text-[13px] font-semibold text-[var(--muted)]"
          >
            {label}
          </label>
        )}
        {children}
        {erreur ? (
          <div
            id={`${fieldId}-hint`}
            className="text-[13px] text-[var(--danger)] mt-1"
          >
            {erreur}
          </div>
        ) : hint ? (
          <div
            id={`${fieldId}-hint`}
            className="text-[12.5px] text-[var(--muted)] mt-1"
          >
            {hint}
          </div>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

const champClasse =
  "w-full h-12 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3.5 text-[15px] text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] placeholder:text-[var(--muted)]/70";

export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  const field = useContext(FieldContext);
  return (
    <input
      id={field.inputId}
      aria-labelledby={field.labelId}
      aria-describedby={field.hintId}
      className={cn(champClasse, className)}
      {...rest}
    />
  );
}

export function Textarea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const field = useContext(FieldContext);
  return (
    <textarea
      id={field.inputId}
      aria-labelledby={field.labelId}
      aria-describedby={field.hintId}
      className={cn(
        champClasse,
        "h-auto min-h-[88px] py-3 leading-snug",
        className,
      )}
      {...rest}
    />
  );
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const field = useContext(FieldContext);
  return (
    <div className="relative">
      <select
        id={field.inputId}
        aria-labelledby={field.labelId}
        aria-describedby={field.hintId}
        className={cn(champClasse, "appearance-none pr-9", className)}
        {...rest}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

/* ---------------- Modale / feuille ---------------- */

export function Modale({
  ouvert,
  onFermer,
  titre,
  children,
  pied,
  large,
}: {
  ouvert: boolean;
  onFermer: () => void;
  titre?: string;
  children: ReactNode;
  pied?: ReactNode;
  large?: boolean;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onFermer);
  close.current = onFermer;
  const titleId = useId();
  useEffect(() => {
    if (!ouvert) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = requestAnimationFrame(() => {
      (
        dialog.current?.querySelector(
          "input:not([type=hidden]), textarea, button",
        ) as HTMLElement | null
      )?.focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
      if (e.key !== "Tab") return;
      const items = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), select:not(:disabled), a[href]',
        ) ?? [],
      );
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(timer);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [ouvert]);

  if (!ouvert) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sans-impression">
      <div className="absolute inset-0 bg-black/55" onClick={onFermer} />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titre ? titleId : undefined}
        className={cn(
          "dialog-panel relative w-full bg-[var(--surface)] rounded-t-2xl sm:rounded-2xl border border-[var(--border)] p-5 sm:p-7 max-h-[92dvh] flex flex-col",
          large ? "sm:max-w-3xl" : "sm:max-w-md",
        )}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          {titre && (
            <h3
              id={titleId}
              className="text-[19px] font-semibold tracking-tight leading-snug"
            >
              {titre}
            </h3>
          )}
          <button
            onClick={onFermer}
            className="ml-auto -mt-1 -mr-1 w-10 h-10 rounded-full grid place-items-center text-[var(--muted)]"
            aria-label="Fermer"
          >
            <IconeCroix className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto -mx-1 px-1 grow">{children}</div>
        {pied && (
          <div className="pt-3 mt-2 border-t border-[var(--border)]">
            {pied}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Toast ---------------- */

type ToastItem = { id: number; message: string; ton: Ton };
const ToastCtx = createContext<(message: string, ton?: Ton) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const compteur = useRef(0);

  const toast = useCallback((message: string, ton: Ton = "neutre") => {
    compteur.current += 1;
    const id = compteur.current;
    setItems((x) => [...x, { id, message, ton }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 4200);
  }, []);

  const valeur = useMemo(() => toast, [toast]);
  useEffect(() => {
    const show = (event: Event) =>
      toast((event as CustomEvent<string>).detail, "danger");
    window.addEventListener("jefac-error", show);
    return () => window.removeEventListener("jefac-error", show);
  }, [toast]);

  return (
    <ToastCtx.Provider value={valeur}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] w-[min(92vw,420px)] space-y-2 sans-impression pointer-events-none"
      >
        {items.map((i) => (
          <div
            key={i.id}
            className={cn(
              "toast-item rounded-2xl px-4 py-3 text-[14px] font-medium shadow-[var(--shadow)] bg-[var(--text)] text-[var(--bg)]",
            )}
          >
            {i.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

/* ---------------- Divers ---------------- */

export function EtatVide({
  titre,
  texte,
  action,
}: {
  titre: string;
  texte?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-10 px-6">
      <div className="text-[15px] font-bold">{titre}</div>
      {texte && (
        <div className="text-[14px] text-[var(--muted)] mt-1.5">{texte}</div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Tuile({
  valeur,
  libelle,
  ton = "neutre",
  className,
}: {
  valeur: ReactNode;
  libelle: string;
  ton?: Ton;
  className?: string;
}) {
  const tons: Record<Ton, string> = {
    neutre: "text-[var(--text)]",
    ok: "text-[var(--ok)]",
    warn: "text-[var(--warn)]",
    danger: "text-[var(--danger)]",
    info: "text-[var(--info)]",
    accent: "text-[var(--accent)]",
  };
  return (
    <div className={cn("rounded-2xl bg-[var(--surface-2)] p-3", className)}>
      <div className={cn("text-[22px] font-extrabold leading-none", tons[ton])}>
        {valeur}
      </div>
      <div className="text-[12.5px] text-[var(--muted)] mt-1 leading-tight">
        {libelle}
      </div>
    </div>
  );
}

export function Barre({
  valeur,
  max = 100,
  ton = "accent",
  className,
}: {
  valeur: number;
  max?: number;
  ton?: Ton;
  className?: string;
}) {
  const pct = max ? Math.min(100, Math.round((valeur / max) * 100)) : 0;
  const tons: Record<Ton, string> = {
    neutre: "bg-[var(--muted)]",
    ok: "bg-[var(--ok)]",
    warn: "bg-[var(--warn)]",
    danger: "bg-[var(--danger)]",
    info: "bg-[var(--info)]",
    accent: "bg-[var(--accent)]",
  };
  return (
    <div
      className={cn(
        "h-2 rounded-full bg-[var(--surface-3)] overflow-hidden",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-all", tons[ton])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Avatar({ nom, taille = 40 }: { nom: string; taille?: number }) {
  const ini = nom
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");
  return (
    <div
      className="rounded-full bg-[var(--accent-soft)] text-[var(--accent)] grid place-items-center font-bold"
      style={{ width: taille, height: taille, fontSize: taille * 0.38 }}
    >
      {ini}
    </div>
  );
}

export function LigneMenu({
  titre,
  sousTitre,
  gauche,
  droite,
  onClick,
  ton,
}: {
  titre: ReactNode;
  sousTitre?: ReactNode;
  gauche?: ReactNode;
  droite?: ReactNode;
  onClick?: () => void;
  ton?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-[var(--surface-2)]",
        onClick && "cursor-pointer",
      )}
    >
      {gauche && <div className="text-[var(--accent)]">{gauche}</div>}
      <div className="min-w-0 grow">
        <div className={cn("font-semibold text-[15px]", ton)}>{titre}</div>
        {sousTitre && (
          <div className="text-[13px] text-[var(--muted)] mt-0.5 leading-snug">
            {sousTitre}
          </div>
        )}
      </div>
      {droite}
    </button>
  );
}
