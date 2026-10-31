import {
  FileText,
  Users,
  CreditCard,
  ShieldCheck,
  Phone,
  MapPin,
  ArrowUpRight,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { AppShell } from "@/components/AppShell";
import { useNav } from "@/navigation";

export function EcranAPropos() {
  const nav = useNav();
  const features = [
    {
      icon: FileText,
      titre: "Transmission en temps réel",
      texte:
        "Saisie et envoi automatisé des rapports dominicaux avec export PDF.",
    },
    {
      icon: Users,
      titre: "Gestion des effectifs",
      texte:
        "Suivi par tranche d'âge (Cadets, Juniors, JFC, Grands jeunes) et passation guidée.",
    },
    {
      icon: CreditCard,
      titre: "Suivi des abonnements",
      texte: "Transparence des paiements et rappels intégrés.",
    },
    {
      icon: ShieldCheck,
      titre: "Sécurité et autonomie",
      texte:
        "Accès sécurisé par rôle, fonctionnement optimisé pour les connexions mobiles.",
    },
  ];
  return (
    <AppShell
      titre="À propos"
      sousTitre="Le mouvement, au plus près de vos paroisses"
      retour
      onRetour={nav.retour}
    >
      <article className="entry mx-auto max-w-[740px]">
        <div className="flex items-center gap-6 pb-8 pt-2">
          <Logo taille={95} />
          <div>
            <p className="eyebrow mb-2">Au service du mouvement</p>
            <h1 className="page-title">JEFAC Rapports</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Version 1.0 (PWA)
            </p>
          </div>
        </div>
        <section className="about-section">
          <span className="about-number">01</span>
          <div>
            <h2>Notre mission</h2>
            <p>
              JEFAC Rapports est la solution numérique conçue pour moderniser et
              simplifier le suivi des activités de formation du dimanche au sein
              des paroisses du doyenné. Elle permet une transmission rapide des
              effectifs, la gestion simplifiée des jeunes par tranche d'âge, le
              contrôle des abonnements, ainsi qu'un pilotage centralisé pour les
              responsables.
            </p>
          </div>
        </section>
        <section className="about-section">
          <span className="about-number">02</span>
          <div>
            <h2>Fonctionnalités clés</h2>
            {features.map(({ icon: Icon, titre, texte }) => (
              <div className="feature-line" key={titre}>
                <Icon />
                <div>
                  <h3 className="mb-1 text-sm font-semibold">{titre}</h3>
                  <p>{texte}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="about-section">
          <span className="about-number">03</span>
          <div>
            <h2>Support & Assistance</h2>
            <p>
              Pour toute question technique, besoin d'accompagnement ou demande
              d'assistance :
            </p>
            <a
              className="mt-5 flex w-fit items-center gap-3 rounded-xl bg-[var(--blue-soft)] px-4 py-3 text-sm font-semibold text-[var(--blue)]"
              href="tel:+243853993269"
            >
              <Phone size={17} /> +243 853 993 269 <ArrowUpRight size={16} />
            </a>
            <div className="mt-4 flex items-center gap-2 text-sm text-[var(--muted)]">
              <MapPin size={16} /> Kinshasa, République Démocratique du Congo
            </div>
          </div>
        </section>
        <footer className="border-t border-[var(--border)] pb-6 pt-7">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Mentions légales & Copyright
          </h2>
          <p className="mt-4 text-sm text-[var(--muted)]">
            © 2026 JEFAC Rapports. Tous droits réservés.
          </p>
          <p className="mt-2 text-sm">
            Développé et conçu par l'entreprise{" "}
            <strong className="text-[var(--accent)]">LIOMBA</strong>.
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Solutions logicielles et innovations numériques.
          </p>
        </footer>
      </article>
    </AppShell>
  );
}
