import { test, expect } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JEFAC_LOGO_SRC } from "../src/assets/jefac-logo";

let server: ChildProcess;
test.beforeAll(async () => {
  const folder = mkdtempSync(join(tmpdir(), "jefac-e2e-"));
  server = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
    env: {
      ...process.env,
      PORT: "3099",
      DATABASE_PATH: join(folder, "test.sqlite"),
      SETUP_KEY: "jefac-private-integration-key",
    },
    stdio: "pipe",
  });
  await expect
    .poll(async () => {
      try {
        return (await fetch("http://localhost:3099/api/health")).status;
      } catch {
        return 0;
      }
    })
    .toBe(200);
});
test.afterAll(() => {
  server?.kill("SIGTERM");
});

test("shared admin setup, account creation, announcements and user profile", async ({
  browser,
}) => {
  test.setTimeout(120000);
  const adminContext = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
  });
  const userContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
  });
  const admin = await adminContext.newPage();
  const member = await userContext.newPage();
  const errors: string[] = [];
  admin.on("pageerror", (e) => errors.push(e.message));
  member.on("pageerror", (e) => errors.push(e.message));
  await admin.goto("http://localhost:3099/admin");
  await expect(
    admin.getByRole("heading", { name: "Heureux de vous retrouver." }),
  ).toBeVisible();
  await expect(admin.locator(".auth-brand")).toHaveCSS(
    "animation-name",
    "auth-brand-zoom",
  );
  await expect(admin.locator(".auth-form")).toHaveCSS(
    "animation-name",
    "auth-form-zoom",
  );
  const desktopLogo = admin.getByAltText(
    "Logo JEFAC, Excellence et Rayonnement",
  );
  await expect(desktopLogo).toBeVisible();
  await expect(desktopLogo).toHaveAttribute("src", /^data:image\/jpeg;base64,/);
  await expect
    .poll(() =>
      desktopLogo.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 200,
      ),
    )
    .toBe(true);
  await admin.screenshot({
    path: "test-results/login-desktop.png",
    fullPage: true,
  });
  await admin.getByRole("button", { name: /Première utilisation/ }).click();
  await admin.getByLabel("Votre nom complet").fill("Administration Test");
  await admin.getByLabel("Nom du doyenné").fill("Doyenné de test");
  await admin.getByLabel("Première paroisse").fill("Paroisse de test");
  await admin.getByLabel("Numéro de téléphone").fill("0850000099");
  await admin
    .getByLabel("Votre mot de passe administrateur")
    .fill("Admin-test-2026!");
  await admin.getByLabel("Confirmer le mot de passe").fill("Admin-test-2026!");
  await admin
    .getByLabel("Clé de première installation")
    .fill("jefac-private-integration-key");
  await admin.getByRole("button", { name: "Créer mon administration" }).click();
  await expect(
    admin.getByRole("heading", { name: "Bienvenue, Administration." }),
  ).toBeVisible();
  await expect(admin.locator(".admin-page-heading.entry").first()).toHaveCSS(
    "animation-name",
    "enter",
  );
  await admin
    .locator(".admin-nav")
    .getByRole("button", { name: "Paroisses", exact: true })
    .click();
  await admin.getByRole("button", { name: "Ouvrir paroisses" }).click();
  await expect(
    admin.getByText("Abonnement actif", { exact: true }),
  ).toBeVisible();
  await admin.getByRole("button", { name: "Désactiver l'abonnement" }).click();
  await expect(
    admin.getByText("Abonnement inactif", { exact: true }),
  ).toBeVisible();
  await admin.getByRole("button", { name: "Activer l'abonnement" }).click();
  await expect(
    admin.getByText("Abonnement actif", { exact: true }),
  ).toBeVisible();
  await admin.getByRole("button", { name: "Retour", exact: true }).click();
  await admin
    .locator(".admin-nav")
    .getByRole("button", { name: "Comptes utilisateurs" })
    .click();
  await admin
    .getByRole("button", { name: "Créer un compte", exact: true })
    .click();
  await admin
    .getByLabel("Nom complet", { exact: true })
    .fill("Responsable Test");
  await admin.getByLabel("Numéro de téléphone").fill("0850000001");
  await admin
    .getByRole("button", { name: "Créer le compte", exact: true })
    .click();
  await expect(
    admin.getByRole("dialog", { name: "Les identifiants sont prêts" }),
  ).toBeVisible();
  const initial = (
    await admin.locator("[role=dialog] .font-mono").innerText()
  ).trim();
  expect(initial).toMatch(/^JF-[A-F0-9]{12}$/);
  await admin.getByRole("button", { name: "Fermer", exact: true }).click();
  await admin
    .locator(".admin-nav")
    .getByRole("button", { name: "Communiqués", exact: true })
    .click();
  await admin.screenshot({
    path: "test-results/announcements-empty.png",
    fullPage: true,
  });
  await admin.getByRole("button", { name: "Nouveau communiqué" }).click();
  await admin
    .getByLabel("Titre du communiqué")
    .fill("Rencontre des formateurs");
  await admin
    .getByLabel("Votre message", { exact: false })
    .fill(
      "Chers responsables, notre rencontre aura lieu dimanche à 14 heures. Merci de confirmer votre présence.",
    );
  await admin.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(
    admin.getByRole("heading", { name: "Rencontre des formateurs" }),
  ).toBeVisible();

  await member.goto("http://localhost:3099/connexion");
  await member.getByLabel("Numéro de téléphone").fill("0850000001");
  await member.getByLabel("Mot de passe", { exact: true }).fill(initial);
  await member
    .getByRole("button", { name: "Se connecter", exact: true })
    .click();
  await expect(member.locator(".nav-indicator")).toHaveCount(1);
  await member.getByRole("button", { name: /Communiqués du doyenné/ }).click();
  await expect(member.getByText("Les nouvelles arrivent ici.")).toBeVisible();
  expect(
    await member.evaluate(
      () => getComputedStyle(document.documentElement).colorScheme,
    ),
  ).toBe("light");
  const denied = await userContext.request.post(
    "http://localhost:3099/api/action",
    {
      data: {
        action: "enregistrerCommunique",
        args: [
          {
            titre: "Intrusion",
            contenu: "Non autorisé",
            categorie: "information",
            publier: true,
          },
        ],
      },
    },
  );
  expect(denied.status()).toBe(403);
  const draftData = await (
    await userContext.request.get("http://localhost:3099/api/state")
  ).json();
  expect(draftData.state.communiques).toHaveLength(0);
  expect(
    draftData.state.utilisateurs.every(
      (u: { motDePasse: string; motDePasseInitial?: string }) =>
        !u.motDePasse && !u.motDePasseInitial,
    ),
  ).toBe(true);

  await admin
    .getByRole("button", { name: "Modifier Rencontre des formateurs" })
    .click();
  await admin.getByRole("button", { name: "Publier le communiqué" }).click();
  await expect(
    admin.locator(".communique-row").getByText("Publié", { exact: true }),
  ).toBeVisible();
  await admin.screenshot({
    path: "test-results/announcements-desktop.png",
    fullPage: true,
  });
  await member.reload();
  await member.getByRole("button", { name: /Communiqués du doyenné/ }).click();
  await expect(
    member.getByRole("button", { name: /Rencontre des formateurs/ }),
  ).toBeVisible();
  await member
    .getByRole("button", { name: /Rencontre des formateurs/ })
    .click();
  await expect(member.locator("[role=dialog] .post-body")).toContainText(
    "dimanche à 14 heures",
  );
  await member.getByRole("button", { name: "Fermer", exact: true }).click();
  await member.screenshot({
    path: "test-results/announcements-mobile.png",
    fullPage: true,
  });
  await member.getByRole("button", { name: "Retour", exact: true }).click();
  await member.getByRole("button", { name: "Jeunes", exact: true }).click();
  await member.getByRole("button", { name: "Ajouter un jeune" }).click();
  await member.getByLabel("Prénom", { exact: true }).fill("Alice");
  await member.getByLabel("Nom", { exact: true }).fill("Test");
  await member.getByLabel("Sexe", { exact: true }).selectOption("F");
  await member.getByLabel("Date de naissance").fill("2018-05-10");
  await member.getByLabel("Téléphone d'un parent").fill("0851111222");
  await member.getByRole("button", { name: "Enregistrer le jeune" }).click();
  await expect(member.getByText("Alice Test", { exact: true })).toBeVisible();
  await member.getByRole("button", { name: "Retour", exact: true }).click();
  await member.getByRole("button", { name: /Commencer le rapport/ }).click();
  await member.getByLabel("Heure de début").fill("09h00");
  await member.getByLabel("Heure de fin").fill("11h00");
  for (const [tranche, label] of [
    ["CADETS", "Cadets"],
    ["JUNIORS", "Juniors"],
    ["JFC", "JFC"],
    ["GRANDS", "Grands jeunes"],
  ]) {
    const fiche = member.locator(`.fiche-${tranche}`);
    if (tranche !== "CADETS")
      await fiche
        .getByRole("button", { name: new RegExp(`^${label}`) })
        .click();
    await fiche.getByLabel("Formateur / animatrice").fill("Formateur Test");
    await fiche.getByLabel("Thème (autres)").fill("La vie en communauté");
    await fiche
      .getByLabel("Résumé de la séance")
      .fill("Échanges et activités de formation.");
    if (tranche === "CADETS") {
      await fiche.getByRole("button", { name: "Présent", exact: true }).click();
      await fiche.getByRole("button", { name: "Valider l'appel" }).click();
    }
  }
  await member
    .getByRole("button", { name: "Envoyer le rapport", exact: true })
    .click();
  await member
    .getByRole("dialog")
    .getByRole("button", { name: "Envoyer", exact: true })
    .click();
  await expect(
    member.getByText("Rapport envoyé", { exact: true }),
  ).toBeVisible();
  await member.getByRole("button", { name: "Retour", exact: true }).click();
  await member.getByRole("button", { name: "Compte", exact: true }).click();
  await member.locator('input[type="file"]').setInputFiles({
    name: "photo-test.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(JEFAC_LOGO_SRC.split(",")[1], "base64"),
  });
  await expect(member.getByAltText("Photo de profil")).toBeVisible();
  await member
    .getByRole("button", { name: /Modifier mon mot de passe/ })
    .click();
  await member.getByLabel("Mot de passe actuel ou initial").fill(initial);
  await member
    .getByLabel("Nouveau mot de passe", { exact: true })
    .fill("Personnel-test-2026!");
  await member
    .getByLabel("Confirmer le nouveau mot de passe")
    .fill("Personnel-test-2026!");
  await member
    .getByRole("button", { name: "Enregistrer mon mot de passe" })
    .click();
  await expect(member.getByRole("dialog")).toHaveCount(0);
  await member
    .getByRole("button", { name: /À propos de JEFAC Rapports/ })
    .click();
  await expect(
    member.getByRole("heading", { name: "Notre mission" }),
  ).toBeVisible();
  await expect(
    member.getByText("Version 1.0 (PWA)", { exact: true }),
  ).toBeVisible();
  await expect(
    member.getByRole("link", { name: /853 993 269/ }),
  ).toHaveAttribute("href", "tel:+243853993269");
  await member.screenshot({
    path: "test-results/about-mobile.png",
    fullPage: true,
  });
  expect(
    await member.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await member.getByRole("button", { name: "Retour", exact: true }).click();
  await member
    .getByRole("button", { name: "Se déconnecter", exact: true })
    .click();
  for (const password of ["Personnel-test-2026!", initial]) {
    await member.getByLabel("Numéro de téléphone").fill("0850000001");
    await member.getByLabel("Mot de passe", { exact: true }).fill(password);
    await member
      .getByRole("button", { name: "Se connecter", exact: true })
      .click();
    await expect(
      member.getByRole("button", { name: /Communiqués du doyenné/ }),
    ).toBeVisible();
    await member.getByRole("button", { name: "Compte", exact: true }).click();
    await member
      .getByRole("button", { name: "Se déconnecter", exact: true })
      .click();
  }
  await adminContext.request.post("http://localhost:3099/api/action", {
    data: {
      action: "ajouterParoisse",
      args: ["Autre paroisse test", "Kinshasa"],
    },
  });
  const adminState = await (
    await adminContext.request.get("http://localhost:3099/api/state")
  ).json();
  const otherParish = adminState.state.paroisses.find(
    (p: { nom: string }) => p.nom === "Autre paroisse test",
  );
  const createdLater = await (
    await adminContext.request.post("http://localhost:3099/api/action", {
      data: {
        action: "creerCompteParAdmin",
        args: [
          {
            nom: "Nouveau membre",
            telephone: "0850000002",
            role: "charge",
            paroisseId: otherParish.id,
          },
        ],
      },
    })
  ).json();
  const laterContext = await browser.newContext();
  const laterLogin = await laterContext.request.post(
    "http://localhost:3099/api/login",
    {
      data: {
        telephone: "0850000002",
        mdp: createdLater.extra.motDePasseInitial,
      },
    },
  );
  expect(laterLogin.ok()).toBe(true);
  const laterState = await (
    await laterContext.request.get("http://localhost:3099/api/state")
  ).json();
  expect(laterState.state.communiques).toHaveLength(1);
  expect(laterState.state.jeunes).toHaveLength(0);
  expect(laterState.state.rapports).toHaveLength(0);
  const forbiddenReport = await laterContext.request.post(
    "http://localhost:3099/api/action",
    {
      data: {
        action: "majRapport",
        args: [adminState.state.rapports[0].id, { debut: "00h00" }],
      },
    },
  );
  expect(forbiddenReport.status()).toBe(403);
  await laterContext.close();
  await admin
    .getByRole("button", { name: "Archiver Rencontre des formateurs" })
    .click();
  await admin.getByRole("button", { name: "Archiver", exact: true }).click();
  const login = await userContext.request.post(
    "http://localhost:3099/api/login",
    { data: { telephone: "0850000001", mdp: initial } },
  );
  expect(login.ok()).toBe(true);
  const archivedState = await (
    await userContext.request.get("http://localhost:3099/api/state")
  ).json();
  expect(archivedState.state.communiques).toHaveLength(0);
  expect(errors).toEqual([]);
  await adminContext.close();
  await userContext.close();
});

test("local preview starts empty, saves real inputs and stays light on mobile", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:5173/");
  await expect(
    page.getByText("Enregistrement local", { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/login-mobile.png",
    fullPage: true,
  });
  expect(await page.getByText("Comptes de démonstration").count()).toBe(0);
  await page.getByRole("button", { name: /Première utilisation/ }).click();
  await page.getByLabel("Votre nom complet").fill("Utilisateur Local");
  await page.getByLabel("Nom du doyenné").fill("Mon doyenné local");
  await page.getByLabel("Première paroisse").fill("Ma paroisse");
  await page.getByLabel("Numéro de téléphone").fill("0850000077");
  await page
    .getByLabel("Votre mot de passe administrateur")
    .fill("Local-test-2026!");
  await page.getByLabel("Confirmer le mot de passe").fill("Local-test-2026!");
  await page.getByRole("button", { name: "Créer mon administration" }).click();
  await expect(
    page.getByRole("heading", { name: "Bienvenue, Utilisateur." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Bienvenue, Utilisateur." }),
  ).toBeVisible();
  await page.getByLabel("Rubrique").selectOption("communiques");
  await page.getByRole("button", { name: "Nouveau communiqué" }).click();
  await page.getByLabel("Titre du communiqué").fill("Information locale");
  await page
    .getByLabel("Votre message", { exact: false })
    .fill("Texte enregistré par le véritable formulaire.");
  await page.getByRole("button", { name: "Publier le communiqué" }).click();
  await expect(
    page.getByRole("heading", { name: "Information locale" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).colorScheme,
    ),
  ).toBe("light");
  await page.screenshot({
    path: "test-results/admin-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  await context.close();
});
