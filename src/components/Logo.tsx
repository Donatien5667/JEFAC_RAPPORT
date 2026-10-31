import { cn } from "@/utils/cn";
import { JEFAC_LOGO_SRC } from "@/assets/jefac-logo";

export function Logo({
  taille = 56,
  avecTexte = false,
  className,
}: {
  taille?: number;
  avecTexte?: boolean;
  className?: string;
  monochrome?: boolean;
}) {
  return (
    <div className={cn("brand-logo flex items-center gap-3", className)}>
      <img
        src={JEFAC_LOGO_SRC}
        alt="Logo JEFAC, Excellence et Rayonnement"
        width={taille}
        height={taille}
        decoding="async"
        draggable={false}
        style={{ width: taille, height: taille }}
        className="shrink-0 object-contain"
      />
      {avecTexte && (
        <div className="leading-tight">
          <div className="text-[22px] font-extrabold tracking-tight text-[var(--accent)]">
            JEFAC
            <span className="font-medium text-[var(--text)]"> Rapports</span>
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[.13em] text-[var(--muted)]">
            Excellence et Rayonnement
          </div>
        </div>
      )}
    </div>
  );
}

export function LogoEcran({ className }: { className?: string }) {
  return <Logo taille={110} className={className} />;
}
