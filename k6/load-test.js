/**
 * k6 Load Testing Suite - CPK/SPC Calculator System
 * 
 * Scenarios:
 * 1. Smoke Test: 1 VU, 30s - Verify system works
 * 2. Load Test: 100 VUs, 5m - Normal traffic
 * 3. Stress Test: 500 VUs, 10m - Heavy traffic
 * 4. Spike Test: 0→1000 VUs sudden spike
 * 5. Soak Test: 50 VUs, 30m - Extended duration
 * 
 * Usage:
 *   k6 run load-test.js                          # Default: load test
 *   k6 run load-test.js --env SCENARIO=smoke     # Smoke test
 *   k6 run load-test.js --env SCENARIO=stress    # Stress test
 *   k6 run load-test.js --env SCENARIO=spike     # Spike test
 *   k6 run load-test.js --env SCENARIO=soak      # Soak test
 *   k6 run load-test.js --env BASE_URL=https://your-app.manus.space
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// ─── Custom Metrics ──────────────────────────────────────────────
const errorRate = new Rate("errors");
const healthLatency = new Trend("health_latency", true);
const spcLatency = new Trend("spc_latency", true);
const oeeLatency = new Trend("oee_latency", true);
const auditLatency = new Trend("audit_latency", true);
const apiCalls = new Counter("api_calls");

// ─── Configuration ──────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const SCENARIO = __ENV.SCENARIO || "load";

// ─── Scenario Definitions ───────────────────────────────────────
const scenarios = {
  smoke: {
    executor: "constant-vus",
    vus: 1,
    duration: "30s",
  },
  load: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "1m", target: 50 },    // Ramp up to 50 VUs
      { duration: "3m", target: 100 },   // Stay at 100 VUs
      { duration: "1m", target: 0 },     // Ramp down
    ],
  },
  stress: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "2m", target: 100 },   // Ramp up
      { duration: "3m", target: 300 },   // Increase
      { duration: "3m", target: 500 },   // Peak
      { duration: "2m", target: 0 },     // Ramp down
    ],
  },
  spike: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "30s", target: 10 },   // Baseline
      { duration: "10s", target: 1000 }, // Spike!
      { duration: "1m", target: 1000 },  // Hold spike
      { duration: "30s", target: 10 },   // Recovery
      { duration: "1m", target: 10 },    // Stabilize
      { duration: "30s", target: 0 },    // Ramp down
    ],
  },
  soak: {
    executor: "constant-vus",
    vus: 50,
    duration: "30m",
  },
};

export const options = {
  scenarios: {
    default: scenarios[SCENARIO] || scenarios.load,
  },
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(99)<5000"],  // 95% < 2s, 99% < 5s
    http_req_failed: ["rate<0.05"],                     // Error rate < 5%
    errors: ["rate<0.1"],                               // Custom error rate < 10%
    health_latency: ["p(95)<500"],                      // Health check < 500ms
    spc_latency: ["p(95)<3000"],                        // SPC endpoints < 3s
    oee_latency: ["p(95)<3000"],                        // OEE endpoints < 3s
    audit_latency: ["p(95)<2000"],                      // Audit endpoints < 2s
  },
};

// ─── Helper Functions ───────────────────────────────────────────
function makeRequest(method, path, body = null) {
  const url = `${BASE_URL}${path}`;
  const params = {
    headers: { "Content-Type": "application/json" },
    timeout: "30s",
  };

  let res;
  if (method === "GET") {
    res = http.get(url, params);
  } else {
    res = http.post(url, body ? JSON.stringify(body) : null, params);
  }

  apiCalls.add(1);
  return res;
}

function trpcQuery(procedure, input = undefined) {
  const encodedInput = input ? encodeURIComponent(JSON.stringify(input)) : "";
  const path = input
    ? `/api/trpc/${procedure}?input=${encodedInput}`
    : `/api/trpc/${procedure}`;
  return makeRequest("GET", path);
}

// ─── Test Scenarios ─────────────────────────────────────────────
export default function () {
  // ── Health Check Endpoints ──
  group("Health Check", () => {
    const res1 = makeRequest("GET", "/api/health");
    healthLatency.add(res1.timings.duration);
    check(res1, {
      "health: status 200": (r) => r.status === 200,
      "health: status healthy": (r) => {
        try { return JSON.parse(r.body).status === "healthy"; } catch { return false; }
      },
    }) || errorRate.add(1);

    const res2 = makeRequest("GET", "/api/health/live");
    healthLatency.add(res2.timings.duration);
    check(res2, {
      "liveness: status 200": (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(0.1);
  });

  // ── SPC Analysis Endpoints ──
  group("SPC Analysis", () => {
    const res1 = trpcQuery("spcAnalysis.list", { page: 1, pageSize: 10 });
    spcLatency.add(res1.timings.duration);
    check(res1, {
      "spc list: status 200": (r) => r.status === 200,
    }) || errorRate.add(1);

    const res2 = trpcQuery("product.list");
    spcLatency.add(res2.timings.duration);
    check(res2, {
      "product list: status 200": (r) => r.status === 200,
    }) || errorRate.add(1);

    const res3 = trpcQuery("measurementSpec.list");
    spcLatency.add(res3.timings.duration);
    check(res3, {
      "spec list: status 200": (r) => r.status === 200,
    }) || errorRate.add(1);

    const res4 = trpcQuery("controlPlan.list");
    spcLatency.add(res4.timings.duration);
    check(res4, {
      "control plan list: status 200": (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(0.2);
  });

  // ── OEE Endpoints ──
  group("OEE Calculation", () => {
    const res1 = trpcQuery("oee.list", { page: 1, pageSize: 10 });
    oeeLatency.add(res1.timings.duration);
    check(res1, {
      "oee list: status 200": (r) => r.status === 200,
    }) || errorRate.add(1);

    const res2 = trpcQuery("oee.dashboard");
    oeeLatency.add(res2.timings.duration);
    check(res2, {
      "oee dashboard: status 200": (r) => r.status === 200,
    }) || errorRate.add(1);

    const res3 = trpcQuery("productionLine.list");
    oeeLatency.add(res3.timings.duration);
    check(res3, {
      "production line list: status 200": (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(0.2);
  });

  // ── Audit Log Endpoints ──
  group("Audit Logs", () => {
    const res1 = trpcQuery("audit.advancedSearch", { page: 1, pageSize: 10, sortOrder: "desc" });
    auditLatency.add(res1.timings.duration);
    check(res1, {
      "audit search: status 200": (r) => r.status === 200,
    }) || errorRate.add(1);

    const res2 = trpcQuery("audit.stats");
    auditLatency.add(res2.timings.duration);
    check(res2, {
      "audit stats: status 200": (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(0.2);
  });

  // ── Static Assets ──
  group("Static Assets", () => {
    const res = makeRequest("GET", "/");
    check(res, {
      "homepage: status 200": (r) => r.status === 200,
      "homepage: has content": (r) => r.body && r.body.length > 0,
    }) || errorRate.add(1);

    sleep(0.1);
  });

  // ── Prometheus Metrics ──
  group("Monitoring", () => {
    const res = makeRequest("GET", "/api/metrics");
    check(res, {
      "metrics: status 200": (r) => r.status === 200,
      "metrics: has content": (r) => r.body && r.body.includes("app_health_status"),
    }) || errorRate.add(1);

    sleep(0.1);
  });

  // Think time between iterations
  sleep(Math.random() * 2 + 0.5);
}

// ─── Lifecycle Hooks ────────────────────────────────────────────
export function setup() {
  console.log(`\n🚀 Starting ${SCENARIO.toUpperCase()} test against ${BASE_URL}`);
  console.log(`   Scenario: ${JSON.stringify(scenarios[SCENARIO])}\n`);

  // Verify server is reachable
  const res = http.get(`${BASE_URL}/api/health`);
  if (res.status !== 200) {
    console.error(`❌ Server not reachable at ${BASE_URL}`);
    return { serverReachable: false };
  }
  console.log(`✅ Server reachable. Status: ${JSON.parse(res.body).status}`);
  return { serverReachable: true };
}

export function teardown(data) {
  if (!data.serverReachable) {
    console.log("⚠️  Test aborted: server was not reachable");
    return;
  }
  console.log("\n📊 Test completed. Check the summary above for results.");
  console.log("   Thresholds:");
  console.log("   - HTTP request duration p(95) < 2000ms");
  console.log("   - HTTP request failed rate < 5%");
  console.log("   - Health latency p(95) < 500ms");
  console.log("   - SPC latency p(95) < 3000ms");
  console.log("   - OEE latency p(95) < 3000ms");
  console.log("   - Audit latency p(95) < 2000ms\n");
}
