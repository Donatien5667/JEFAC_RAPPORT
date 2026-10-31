import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 1000 },
]) {
  test(`the original JEFAC logo survives an HTML-only export at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const html = readFileSync("dist/index.html", "utf8");
    const externalImages: string[] = [];
    await page.route("http://jefac-preview.test/**", async (route) => {
      if (route.request().resourceType() === "document") {
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: html,
        });
      } else {
        if (route.request().resourceType() === "image")
          externalImages.push(route.request().url());
        await route.abort();
      }
    });
    await page.goto("http://jefac-preview.test/connexion");
    await expect(
      page.getByRole("heading", { name: "Heureux de vous retrouver." }),
    ).toBeVisible();
    const logo = page.getByAltText("Logo JEFAC, Excellence et Rayonnement");
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute("src", /^data:image\/jpeg;base64,/);
    await expect
      .poll(() =>
        logo.evaluate(
          (image: HTMLImageElement) =>
            image.complete &&
            image.naturalWidth === 389 &&
            image.naturalHeight === 501,
        ),
      )
      .toBe(true);
    await expect(
      page.getByText(
        /Envoyer le lien ne permet pas encore aux autres téléphones/,
      ),
    ).toBeVisible();
    expect(externalImages).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/logo-embedded-${viewport.width}.png`,
      fullPage: true,
    });
  });
}

test("PWA icons contain their image data rather than missing PNG paths", async ({
  page,
  request,
}) => {
  const response = await request.get(
    "http://localhost:5173/manifest.webmanifest",
  );
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  await page.goto("http://localhost:5173/");
  for (const icon of manifest.icons) {
    expect(icon.src).toMatch(/^data:image\/png;base64,/);
    const size = await page.evaluate(
      (src: string) =>
        new Promise<number>((resolve) => {
          const image = new Image();
          image.onload = () => resolve(image.naturalWidth);
          image.onerror = () => resolve(0);
          image.src = src;
        }),
      icon.src,
    );
    expect(`${size}x${size}`).toBe(icon.sizes);
  }
  const favicon = page.locator('link[rel="icon"]');
  await expect(favicon).toHaveAttribute("href", /^data:image\/png;base64,/);
});
