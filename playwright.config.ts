import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3127",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "npx next start -p 3127",
    port: 3127,
    timeout: 90000,
    reuseExistingServer: true,
  },
});
