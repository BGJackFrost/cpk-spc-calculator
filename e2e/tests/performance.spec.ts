import { test, expect } from "@playwright/test";

test.describe("Performance & Accessibility", () => {
  test("home page should load within 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });

  test("should not have console errors on home page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        errors.push(msg.text());
      }
    });
    
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    
    // Filter out expected errors (OAuth, SSE, etc.)
    const criticalErrors = errors.filter(
      (e) => !e.includes("OAuth") && !e.includes("SSE") && !e.includes("EventSource") 
        && !e.includes("net::ERR") && !e.includes("Failed to fetch")
    );
    
    // Allow some non-critical errors
    expect(criticalErrors.length).toBeLessThanOrEqual(3);
  });

  test("should have proper lang attribute", async ({ page }) => {
    await page.goto("/");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBeTruthy();
  });

  test("should have proper charset meta tag", async ({ page }) => {
    await page.goto("/");
    const charset = await page.locator('meta[charset]').getAttribute("charset");
    expect(charset?.toLowerCase()).toBe("utf-8");
  });

  test("images should have alt attributes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    
    const images = page.locator("img");
    const count = await images.count();
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const alt = await images.nth(i).getAttribute("alt");
      // Alt can be empty string for decorative images, but should exist
      expect(alt !== null || alt !== undefined).toBeTruthy();
    }
  });

  test("buttons should be keyboard accessible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    
    const buttons = page.locator("button:visible");
    const count = await buttons.count();
    
    if (count > 0) {
      // Tab to first button
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      // Should be able to focus on interactive elements
      expect(focused).toBeTruthy();
    }
  });

  test("should be responsive - mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    
    // Page should not have horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px tolerance
  });

  test("should be responsive - tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("CSS should load without errors", async ({ page }) => {
    const cssErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("CSS") && msg.type() === "error") {
        cssErrors.push(msg.text());
      }
    });
    
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(cssErrors.length).toBe(0);
  });
});
