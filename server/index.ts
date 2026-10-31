import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";
import { dirname, extname, resolve } from "node:path";
import Database from "better-sqlite3";
import { creerDomaine, type ResultatAction } from "../src/store/domain";
import { autoriserAction, etatVisible } from "../src/store/access";
import { creerEtatVide } from "../src/lib/initial";
import type { AppState } from "../src/lib/types";

const port = Number(process.env.PORT || 3001);
const dbPath = resolve(process.env.DATABASE_PATH || "data/jefac.sqlite");
mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });
const db = new Database(dbPath);
chmodSync(dbPath, 0o600);
db.pragma("journal_mode = WAL");
db.pragma("synchronous = FULL");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS application (id INTEGER PRIMARY KEY CHECK(id = 1), contenu TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS comptes (id TEXT PRIMARY KEY, telephone TEXT UNIQUE NOT NULL, role TEXT NOT NULL, contenu TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS communiques (id TEXT PRIMARY KEY, statut TEXT NOT NULL, contenu TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, utilisateur_id TEXT NOT NULL, expiration INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS sessions_expiration ON sessions(expiration);
  CREATE INDEX IF NOT EXISTS communiques_statut ON communiques(statut);
`);

const load = (): AppState => {
  const row = db
    .prepare("SELECT contenu FROM application WHERE id = 1")
    .get() as { contenu: string } | undefined;
  return row ? JSON.parse(row.contenu) : creerEtatVide();
};
const save = db.transaction((s: AppState) => {
  const persisted = { ...s, currentUserId: null };
  db.prepare(
    "INSERT OR REPLACE INTO application(id, contenu) VALUES (1, ?)",
  ).run(JSON.stringify(persisted));
  db.exec("DELETE FROM comptes; DELETE FROM communiques;");
  const putUser = db.prepare(
    "INSERT INTO comptes(id, telephone, role, contenu) VALUES (?, ?, ?, ?)",
  );
  for (const user of s.utilisateurs)
    putUser.run(user.id, user.telephone, user.role, JSON.stringify(user));
  const putPost = db.prepare(
    "INSERT INTO communiques(id, statut, contenu) VALUES (?, ?, ?)",
  );
  for (const post of s.communiques)
    putPost.run(post.id, post.statut, JSON.stringify(post));
  db.prepare(
    "DELETE FROM sessions WHERE expiration < ? OR utilisateur_id NOT IN (SELECT id FROM comptes)",
  ).run(Date.now());
});
save(load());

const setupKey = process.env.SETUP_KEY || randomBytes(24).toString("hex");
if (!load().installationComplete && !process.env.SETUP_KEY)
  console.log(`Cle de premiere installation : ${setupKey}`);
const production = process.env.NODE_ENV === "production";
const allowedOrigin = process.env.APP_ORIGIN;
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const options = {
  hash(password: string) {
    const salt = randomBytes(16);
    return `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 32).toString("hex")}`;
  },
  verify(password: string, hash: string) {
    try {
      const [kind, salt, expected] = hash.split("$");
      if (kind !== "scrypt" || salt.length !== 32 || expected.length !== 64)
        return false;
      return timingSafeEqual(
        scryptSync(password, Buffer.from(salt, "hex"), 32),
        Buffer.from(expected, "hex"),
      );
    } catch {
      return false;
    }
  },
  generate: () => `JF-${randomBytes(6).toString("hex").toUpperCase()}`,
};

function token(req: IncomingMessage) {
  return (
    /(?:^|;\s*)jefac_session=([a-f0-9]{64})(?:;|$)/.exec(
      req.headers.cookie || "",
    )?.[1] ?? ""
  );
}
function sessionUser(req: IncomingMessage) {
  const row = db
    .prepare(
      "SELECT utilisateur_id FROM sessions WHERE token_hash = ? AND expiration > ?",
    )
    .get(digest(token(req)), Date.now()) as
    | { utilisateur_id: string }
    | undefined;
  return row?.utilisateur_id ?? null;
}
function setSession(res: ServerResponse, uid: string) {
  const raw = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(
    digest(raw),
    uid,
    Date.now() + 30 * 86400000,
  );
  res.setHeader(
    "Set-Cookie",
    `jefac_session=${raw}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${production ? "; Secure" : ""}`,
  );
}
function json(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
}
async function body(req: IncomingMessage) {
  let bytes = 0;
  const chunks: Buffer[] = [];
  for await (const part of req) {
    bytes += part.length;
    if (bytes > 3 * 1024 * 1024)
      throw new Error("Fichier trop volumineux (3 Mo maximum).");
    chunks.push(part);
  }
  return JSON.parse(Buffer.concat(chunks).toString() || "{}");
}
const attempts = new Map<string, { count: number; until: number }>();
function throttle(req: IncomingMessage, telephone: string) {
  const ip =
    process.env.TRUST_PROXY === "1"
      ? String(req.headers["x-forwarded-for"] || req.socket.remoteAddress)
          .split(",")[0]
          .trim()
      : req.socket.remoteAddress;
  for (const key of [`ip:${ip}`, `phone:${telephone}`]) {
    const item = attempts.get(key);
    if (
      item &&
      item.until > Date.now() &&
      item.count >= (key.startsWith("ip:") ? 40 : 12)
    )
      return false;
    attempts.set(key, {
      count: item && item.until > Date.now() ? item.count + 1 : 1,
      until:
        item && item.until > Date.now() ? item.until : Date.now() + 15 * 60000,
    });
  }
  return true;
}
setInterval(() => {
  for (const [key, item] of attempts)
    if (item.until < Date.now()) attempts.delete(key);
}, 60000).unref();

function validate(action: string, args: unknown[], state: AppState) {
  if (args.length > 6 || JSON.stringify(args).length > 2800000)
    throw new Error("Données invalides.");
  const allowedKeys: Record<string, string[]> = {
    majRapport: ["debut", "fin"],
    majFiche: [
      "formateur",
      "themeId",
      "themeAutre",
      "resume",
      "difficultes",
      "suggestions",
      "photo",
    ],
    modifierJeune: [
      "prenom",
      "nom",
      "sexe",
      "dateNaissance",
      "tranche",
      "telParent",
      "telJeune",
      "note",
    ],
    modifierReglage: [
      "prixMensuel",
      "prixAnnuel",
      "joursGrace",
      "numeroPaiement",
      "titulaire",
      "operateur",
    ],
  };
  if (allowedKeys[action]) {
    const index =
      action === "majFiche" ? 2 : action === "modifierReglage" ? 0 : 1;
    const data = args[index];
    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      Object.keys(data).some((key) => !allowedKeys[action].includes(key))
    )
      throw new Error("Modification non autorisée.");
  }
  const data = args[0] as Record<string, unknown> | undefined;
  if (action === "creerCompteParAdmin") {
    if (
      !data ||
      !["charge", "adjoint", "cp", "membre"].includes(String(data.role))
    )
      throw new Error("Rôle non autorisé.");
    if (
      data.role !== "membre" &&
      !state.paroisses.some((p) => p.id === data.paroisseId)
    )
      throw new Error("Choisissez une paroisse existante.");
  }
  if (
    action === "enregistrerCommunique" &&
    (!data ||
      !["information", "formation", "important"].includes(
        String(data.categorie),
      ) ||
      typeof data.publier !== "boolean")
  )
    throw new Error("Communiqué invalide.");
  if (
    action === "changerPhotoProfil" &&
    args[1] !== null &&
    (typeof args[1] !== "string" ||
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(args[1]))
  )
    throw new Error("Image invalide.");
  if (["ajouterJeune", "modifierJeune"].includes(action)) {
    const jeune =
      action === "ajouterJeune"
        ? data
        : ({
            ...state.jeunes.find((j) => j.id === args[0]),
            ...(args[1] as object),
          } as Record<string, unknown>);
    if (
      !jeune ||
      !String(jeune.prenom || "").trim() ||
      !String(jeune.nom || "").trim() ||
      !["M", "F"].includes(String(jeune.sexe)) ||
      !["CADETS", "JUNIORS", "JFC", "GRANDS"].includes(String(jeune.tranche))
    )
      throw new Error(
        "Renseignez le nom, le prénom, le sexe et la tranche du jeune.",
      );
    if (
      typeof jeune.dateNaissance !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(jeune.dateNaissance) ||
      Number.isNaN(Date.parse(jeune.dateNaissance)) ||
      jeune.dateNaissance > new Date().toISOString().slice(0, 10)
    )
      throw new Error("Date de naissance invalide.");
    if (
      ["CADETS", "JUNIORS"].includes(String(jeune.tranche)) &&
      String(jeune.telParent || "").replace(/\D/g, "").length < 9
    )
      throw new Error(
        "Le téléphone d'un parent est obligatoire pour les cadets et les juniors.",
      );
  }
  if (
    action === "assurerRapport" &&
    (typeof args[1] !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(args[1]) ||
      new Date(`${args[1]}T12:00:00Z`).getUTCDay() !== 0)
  )
    throw new Error("Choisissez un dimanche valide.");
  if (
    ["declarerPaiement", "enregistrerPaiementRecu"].includes(action) &&
    (!data ||
      !Number.isFinite(data.montant) ||
      Number(data.montant) <= 0 ||
      !["mensuel", "annuel"].includes(String(data.type)))
  )
    throw new Error("Montant ou formule invalide.");
  if (
    action === "modifierReglage" &&
    data &&
    ["prixMensuel", "prixAnnuel", "joursGrace"].some(
      (key) =>
        key in data && (!Number.isFinite(data[key]) || Number(data[key]) < 0),
    )
  )
    throw new Error("Les montants doivent être positifs.");
}

const server = createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  const path = new URL(req.url || "/", "http://localhost").pathname;
  const origin = req.headers.origin;
  const hostOrigin = `${production ? "https" : "http"}://${req.headers.host}`;
  const originOk =
    !origin ||
    origin === hostOrigin ||
    (!!allowedOrigin && origin === allowedOrigin) ||
    (!production && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin));
  if (origin && originOk) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  if (path.startsWith("/api/") && !originOk)
    return json(res, 403, { ok: false, message: "Origine non autorisée." });
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    });
    res.end();
    return;
  }
  try {
    if (path === "/api/health")
      return json(res, 200, {
        service: "jefac",
        database: "SQLite",
        configured: !!load().installationComplete,
      });
    if (path === "/api/state" && req.method === "GET")
      return json(res, 200, { state: etatVisible(load(), sessionUser(req)) });
    if (path === "/api/backup" && req.method === "GET") {
      const s = load();
      const uid = sessionUser(req);
      if (
        !s.utilisateurs.some(
          (u) =>
            u.id === uid && u.role === "responsable" && u.statut === "actif",
        )
      )
        return json(res, 403, { ok: false, message: "Accès refusé." });
      res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="jefac-${new Date().toISOString().slice(0, 10)}.sqlite"`,
        "Cache-Control": "no-store",
      });
      res.end(db.serialize());
      return;
    }
    if (["/api/login", "/api/setup"].includes(path) && req.method === "POST") {
      const data = await body(req);
      if (
        typeof data.telephone !== "string" ||
        typeof data.mdp !== "string" ||
        data.mdp.length > 256
      )
        return json(res, 400, {
          ok: false,
          message: "Identifiants invalides.",
        });
      if (!throttle(req, data.telephone.replace(/\D/g, "").slice(-9)))
        return json(res, 429, {
          ok: false,
          message: "Trop de tentatives. Réessayez dans 15 minutes.",
        });
      if (
        path === "/api/setup" &&
        digest(String(data.cleInstallation)) !== digest(setupKey)
      )
        return json(res, 403, {
          ok: false,
          message:
            "Clé d'installation incorrecte. Consultez la configuration du serveur.",
        });
      const result = db.transaction(() => {
        const domain = creerDomaine(load(), options);
        const r =
          path === "/api/setup"
            ? domain.actions.configurerInstallation(data)
            : domain.actions.connexion(data.telephone, data.mdp, !!data.admin);
        if (r.ok) save(domain.getState());
        return { result: r, state: domain.getState() };
      })();
      if (!result.result.ok) return json(res, 400, result.result);
      const uid = result.state.currentUserId!;
      setSession(res, uid);
      return json(res, 200, {
        ...result.result,
        state: etatVisible(result.state, uid),
      });
    }
    if (path === "/api/logout" && req.method === "POST") {
      db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(
        digest(token(req)),
      );
      res.setHeader(
        "Set-Cookie",
        `jefac_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${production ? "; Secure" : ""}`,
      );
      return json(res, 200, { ok: true, state: etatVisible(load(), null) });
    }
    if (path === "/api/action" && req.method === "POST") {
      const uid = sessionUser(req);
      if (!uid)
        return json(res, 401, {
          ok: false,
          message: "Votre session a expiré. Reconnectez-vous.",
        });
      const payload = await body(req);
      if (typeof payload.action !== "string" || !Array.isArray(payload.args))
        throw new Error("Commande invalide.");
      const result = db.transaction(() => {
        const s = { ...load(), currentUserId: uid };
        if (!autoriserAction(s, payload.action, payload.args))
          return { denied: true };
        validate(payload.action, payload.args, s);
        const domain = creerDomaine(s, options);
        const method = (
          domain.actions as unknown as Record<
            string,
            (...args: unknown[]) => unknown
          >
        )[payload.action];
        const raw = method(...payload.args) as ResultatAction | undefined;
        const response =
          raw && "ok" in raw ? raw : { ok: true, message: "Enregistré." };
        if (response.ok) {
          save(domain.getState());
          if (
            [
              "reinitialiserMotDePasse",
              "basculerStatutCompte",
              "retirerCompte",
              "supprimerCompte",
            ].includes(payload.action)
          )
            db.prepare("DELETE FROM sessions WHERE utilisateur_id = ?").run(
              payload.args[0],
            );
          if (payload.action === "changerMotDePasse")
            db.prepare(
              "DELETE FROM sessions WHERE utilisateur_id = ? AND token_hash != ?",
            ).run(uid, digest(token(req)));
        }
        return {
          ...response,
          state: etatVisible(response.ok ? domain.getState() : s, uid),
        };
      })();
      return json(
        res,
        "denied" in result ? 403 : 200,
        "denied" in result
          ? { ok: false, message: "Vous n'avez pas accès à cette action." }
          : result,
      );
    }
    if (path.startsWith("/api/"))
      return json(res, 404, { ok: false, message: "Route introuvable." });
    const root = resolve("dist");
    const file = resolve(root, `.${decodeURIComponent(path)}`);
    const target =
      file.startsWith(root + "/") && existsSync(file) && statSync(file).isFile()
        ? file
        : resolve(root, "index.html");
    if (!existsSync(target))
      return json(res, 503, {
        message: "Exécutez npm run build avant de démarrer l'application.",
      });
    const types: Record<string, string> = {
      ".html": "text/html; charset=utf-8",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".webmanifest": "application/manifest+json",
      ".js": "application/javascript",
    };
    res.writeHead(200, {
      "Content-Type": types[extname(target)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(readFileSync(target));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Données invalides.";
    json(res, 400, {
      ok: false,
      message:
        message.startsWith("SQLITE") || message.includes("Cannot")
          ? "Données invalides. Vérifiez les champs du formulaire."
          : message,
    });
  }
});
server.listen(port, "0.0.0.0", () =>
  console.log(
    `JEFAC : http://localhost:${port}/admin | http://localhost:${port}/connexion`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
