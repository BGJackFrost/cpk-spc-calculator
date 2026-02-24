import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration
 * CPK/SPC Calculator System
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
  ],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  // Dev server is expected to be running already
  // webServer: {
  //   command: "cd .. && pnpm dev",
  //   url: "http://localhost:3000",
  //   reuseExistingServer: true,
  //   timeout: 120000,
  // },
});
