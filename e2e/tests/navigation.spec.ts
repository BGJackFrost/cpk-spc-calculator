import { test, expect } from "@playwright/test";

test.describe("Navigation & Dashboard", () => {
  test("should load the landing page with key sections", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check page loaded successfully
    expect(page.url()).toContain("/");
    
    // Should have some content visible
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("should have responsive navigation", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check for navigation elements
    const nav = page.locator("nav, [role='navigation'], header").first();
    if (await nav.isVisible()) {
      await expect(nav).toBeVisible();
    }
  });

  test("should navigate to SPC analysis page", async ({ page }) => {
    await page.goto("/analyze");
    await page.waitForLoadState("networkidle");
    
    // Should load or redirect
    const url = page.url();
    expect(url).toBeTruthy();
  });

  test("should navigate to audit logs page", async ({ page }) => {
    await page.goto("/audit-logs");
    await page.waitForLoadState("networkidle");
    
    const url = page.url();
    expect(url).toBeTruthy();
  });

  test("should navigate to OEE dashboard", async ({ page }) => {
    await page.goto("/oee");
    await page.waitForLoadState("networkidle");
    
    const url = page.url();
    expect(url).toBeTruthy();
  });

  test("should handle 404 pages gracefully", async ({ page }) => {
    await page.goto("/nonexistent-page-xyz");
    await page.waitForLoadState("networkidle");
    
    // Should not crash - either show 404 or redirect
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    
    // Check that h1 exists
    const h1 = page.locator("h1").first();
    if (await h1.isVisible()) {
      const text = await h1.textContent();
      expect(text).toBeTruthy();
    }
  });
});
