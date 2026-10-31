import { TRANCHES, type Tranche } from "./types";
import { scrypt } from "@noble/hashes/scrypt";
import { bytesToHex, hexToBytes, randomBytes } from "@noble/hashes/utils";

export const MS_DAY = 86400000;
export const JOURS = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];
export const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

const pad = (n: number) => String(n).padStart(2, "0");

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISODate(s: string): Date {
  const [y, m, j] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, j || 1);
}

export function aujourdhui(): string {
  return toISODate(new Date());
}

/** Dimanche de référence : le dimanche le plus récent (aujourd'hui si on est dimanche). */
export function dimancheReference(d: Date = new Date()): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  return addDays(x, -day);
}

export function dimancheDe(iso: string): string {
  return toISODate(dimancheReference(fromISODate(iso)));
}

export function formatDateLong(iso: string | Date): string {
  const d = typeof iso === "string" ? fromISODate(iso) : iso;
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateCourt(iso: string | Date): string {
  const d = typeof iso === "string" ? fromISODate(iso) : iso;
  return `${d.getDate()} ${MOIS[d.getMonth()].slice(0, 4)}. ${d.getFullYear()}`;
}

export function formatDateMini(iso: string | Date): string {
  const d = typeof iso === "string" ? fromISODate(iso) : iso;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function heure(d: Date = new Date()): string {
  return `${pad(d.getHours())}h${pad(d.getMinutes())}`;
}

export function ilYA(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  if (j === 1) return "hier";
  if (j < 30) return `il y a ${j} jours`;
  return formatDateMini(iso);
}

export function joursEntre(isoA: string, isoB: string): number {
  return Math.round(
    (fromISODate(isoB).getTime() - fromISODate(isoA).getTime()) / MS_DAY,
  );
}

export function ajouterMois(iso: string, mois: number): string {
  const d = fromISODate(iso);
  const jour = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + mois);
  const max = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(jour, max));
  return toISODate(d);
}

export function age(dateNaissance: string, ref: Date = new Date()): number {
  const n = fromISODate(dateNaissance);
  let a = ref.getFullYear() - n.getFullYear();
  const m = ref.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < n.getDate())) a -= 1;
  return a;
}

export type AlerteAge = "trop_jeune" | "trop_vieux" | null;

/** Tranche correspondant à l'âge, avec alerte si l'âge sort des limites de la liste. */
export function tranchePourAge(age: number): {
  tranche: Tranche | null;
  alerte: AlerteAge;
} {
  if (age < 6) return { tranche: null, alerte: "trop_jeune" };
  const t = TRANCHES.find((x) => age >= x.min && age <= x.max);
  if (t) return { tranche: t.id, alerte: null };
  return { tranche: null, alerte: "trop_vieux" };
}

export function trancheInfo(tranche: Tranche) {
  return TRANCHES.find((t) => t.id === tranche)!;
}

export function trancheSuivante(tranche: Tranche): Tranche | null {
  const i = TRANCHES.findIndex((t) => t.id === tranche);
  return i >= 0 && i < TRANCHES.length - 1 ? TRANCHES[i + 1].id : null;
}

export function naissanceDepuisAge(
  age: number,
  ref: Date = new Date(),
): string {
  return toISODate(addDays(ref, -Math.round(age * 365.25)));
}

/* ---------- Formatage ---------- */

export function formatFC(n: number): string {
  return `${n.toLocaleString("fr-FR").replace(/\u202f/g, " ")} FC`;
}

export function formatTel(t?: string | null): string {
  if (!t) return "—";
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 9)
    return `+243 ${digits.slice(-9, -6)} ${digits.slice(-6, -3)} ${digits.slice(-3)}`;
  return t;
}

export function initiales(nom: string): string {
  return nom
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() ?? "")
    .join("");
}

export function normaliserTel(t: string): string {
  return t.replace(/\D/g, "").slice(-9);
}

/* ---------- Sécurité (simulation) ---------- */

export function hashMdp(mdp: string): string {
  const salt = randomBytes(16);
  const key = scrypt(mdp, salt, { N: 16384, r: 8, p: 1, dkLen: 32 });
  return `scrypt$${bytesToHex(salt)}$${bytesToHex(key)}`;
}

function ancienHash(mdp: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < mdp.length; i++) {
    h ^= mdp.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return "jf1$" + h.toString(16).padStart(8, "0");
}

export function verifierMdp(mdp: string, hash: string): boolean {
  if (hash.startsWith("jf1$")) return ancienHash(mdp) === hash;
  try {
    const [kind, salt, stored] = hash.split("$");
    if (kind !== "scrypt" || salt.length !== 32 || stored.length !== 64)
      return false;
    const actual = scrypt(mdp, hexToBytes(salt), {
      N: 16384,
      r: 8,
      p: 1,
      dkLen: 32,
    });
    const expected = hexToBytes(stored);
    return (
      actual.reduce(
        (difference, value, index) => difference | (value ^ expected[index]),
        0,
      ) === 0
    );
  } catch {
    return false;
  }
}

export function motDePasseTemporaire(): string {
  return `JF-${bytesToHex(randomBytes(6)).toUpperCase()}`;
}

/** Copie un texte dans le presse-papiers (avec repli). */
export async function copierTexte(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    try {
      const zone = document.createElement("textarea");
      zone.value = texte;
      zone.style.position = "fixed";
      zone.style.opacity = "0";
      document.body.appendChild(zone);
      zone.select();
      document.execCommand("copy");
      document.body.removeChild(zone);
      return true;
    } catch {
      return false;
    }
  }
}

/** ---------- Identifiants ---------- */

let compteur = 0;
export function id(prefix: string): string {
  compteur += 1;
  return `${prefix}_${Date.now().toString(36)}${compteur.toString(36)}${bytesToHex(randomBytes(5))}`;
}

/* ---------- Export CSV (Excel, séparateur « ; ») ---------- */

export function exportCSV(
  nomFichier: string,
  entetes: string[],
  lignes: (string | number)[][],
) {
  const echapper = (v: string | number) => {
    const raw = String(v ?? "");
    const s = /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const contenu = [
    entetes.map(echapper).join(";"),
    ...lignes.map((l) => l.map(echapper).join(";")),
  ].join("\r\n");
  const blob = new Blob(["\ufeff" + contenu], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomFichier.endsWith(".csv") ? nomFichier : `${nomFichier}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Images ---------- */

/** Réduit la photo sur le téléphone avant l'envoi (règle du dossier). */
export function compresserImage(
  fichier: File,
  maxDim = 900,
  qualite = 0.62,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => reject(new Error("Lecture du fichier impossible"));
    lecteur.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image illisible"));
      img.onload = () => {
        let { width, height } = img;
        const ratio = Math.min(1, maxDim / Math.max(width, height));
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas indisponible"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", qualite));
      };
      img.src = String(lecteur.result);
    };
    lecteur.readAsDataURL(fichier);
  });
}
