import { test, expect } from "@playwright/test";

test.describe("API Health Check Endpoints", () => {
  test("GET /api/health should return healthy status", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("healthy");
    expect(body).toHaveProperty("uptime");
    expect(body).toHaveProperty("timestamp");
  });

  test("GET /api/health/live should return alive status", async ({ request }) => {
    const response = await request.get("/api/health/live");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("alive");
  });

  test("GET /api/health/ready should return ready status", async ({ request }) => {
    const response = await request.get("/api/health/ready");
    const body = await response.json();
    // May return 200 or 503 depending on DB connection
    expect([200, 503]).toContain(response.status());
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("checks");
  });

  test("GET /api/health/detailed should return detailed metrics", async ({ request }) => {
    const response = await request.get("/api/health/detailed");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("system");
    expect(body).toHaveProperty("database");
    expect(body).toHaveProperty("services");
    expect(body.system).toHaveProperty("memory");
    expect(body.system).toHaveProperty("cpu");
  });

  test("GET /api/metrics should return Prometheus format", async ({ request }) => {
    const response = await request.get("/api/metrics");
    expect(response.status()).toBe(200);
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("text/plain");
    const body = await response.text();
    expect(body).toContain("app_health_status");
    expect(body).toContain("app_uptime_seconds");
    expect(body).toContain("system_memory");
  });

  test("GET /api/openapi.json should return OpenAPI spec", async ({ request }) => {
    const response = await request.get("/api/openapi.json");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.openapi).toBe("3.0.3");
    expect(body.info.title).toContain("CPK/SPC");
    expect(body).toHaveProperty("paths");
    expect(Object.keys(body.paths).length).toBeGreaterThan(100);
  });

  test("GET /api/docs should return Swagger UI HTML", async ({ request }) => {
    const response = await request.get("/api/docs");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("swagger-ui");
    expect(body).toContain("CPK/SPC");
  });

  test("GET /api/docs/stats should return API statistics", async ({ request }) => {
    const response = await request.get("/api/docs/stats");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("totalEndpoints");
    expect(body).toHaveProperty("categories");
    expect(body.totalEndpoints).toBeGreaterThan(100);
  });

  test("Health check response time should be under 500ms", async ({ request }) => {
    const start = Date.now();
    await request.get("/api/health");
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });

  test("Liveness probe response time should be under 100ms", async ({ request }) => {
    const start = Date.now();
    await request.get("/api/health/live");
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
