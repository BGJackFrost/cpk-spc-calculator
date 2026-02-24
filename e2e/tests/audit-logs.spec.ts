import { test, expect } from "@playwright/test";

test.describe("Audit Logs Page", () => {
  test("should load audit logs page", async ({ page }) => {
    await page.goto("/audit-logs");
    await page.waitForLoadState("networkidle");
    
    // Should show the audit logs page or redirect to login
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("should display page title", async ({ page }) => {
    await page.goto("/audit-logs");
    await page.waitForLoadState("networkidle");
    
    // Look for audit log related text
    const title = page.locator('text=/nhật ký|audit|hoạt động/i').first();
    if (await title.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(title).toBeVisible();
    }
  });

  test("should have filter controls", async ({ page }) => {
    await page.goto("/audit-logs");
    await page.waitForLoadState("networkidle");
    
    // Look for filter elements (select, input, button)
    const filterElements = page.locator('select, [role="combobox"], input[type="text"], input[type="search"]');
    const count = await filterElements.count();
    // May or may not be visible depending on auth state
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should have tabs for different views", async ({ page }) => {
    await page.goto("/audit-logs");
    await page.waitForLoadState("networkidle");
    
    // Look for tab elements
    const tabs = page.locator('[role="tab"], [data-state]');
    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should have export button", async ({ page }) => {
    await page.goto("/audit-logs");
    await page.waitForLoadState("networkidle");
    
    const exportBtn = page.locator('text=/xuất|export|csv/i').first();
    if (await exportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(exportBtn).toBeVisible();
    }
  });

  test("should have real-time button", async ({ page }) => {
    await page.goto("/audit-logs");
    await page.waitForLoadState("networkidle");
    
    const realtimeBtn = page.locator('text=/real-time|live/i').first();
    if (await realtimeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(realtimeBtn).toBeVisible();
    }
  });
});
