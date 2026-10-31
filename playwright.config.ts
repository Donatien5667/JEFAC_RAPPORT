import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  workers: 1,
  use: { actionTimeout: 10000 },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173",
    url: "http://localhost:5173",
    reuseExistingServer: true,
  },
});
