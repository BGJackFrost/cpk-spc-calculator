/**
 * k6 Stress Test - CPK/SPC Calculator System
 * 
 * Tập trung vào các endpoint quan trọng nhất dưới tải cao.
 * Mục tiêu: Tìm breaking point của hệ thống.
 * 
 * Usage:
 *   k6 run stress-test.js
 *   k6 run stress-test.js --env BASE_URL=https://your-app.manus.space
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

const errorRate = new Rate("errors");
const dbQueryLatency = new Trend("db_query_latency", true);
const concurrentUsers = new Counter("concurrent_users");

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  scenarios: {
    stress_ramp: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 50 },    // Warm up
        { duration: "2m", target: 100 },   // Normal load
        { duration: "2m", target: 200 },   // Above normal
        { duration: "2m", target: 300 },   // Stress begins
        { duration: "2m", target: 500 },   // Heavy stress
        { duration: "1m", target: 750 },   // Near breaking point
        { duration: "1m", target: 1000 },  // Breaking point test
        { duration: "2m", target: 0 },     // Recovery
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<5000"],       // 95% under 5s
    http_req_failed: ["rate<0.10"],           // Error rate under 10%
    errors: ["rate<0.15"],                    // Custom errors under 15%
    db_query_latency: ["p(95)<5000"],         // DB queries under 5s
  },
};

function trpcQuery(procedure, input = undefined) {
  const encodedInput = input ? encodeURIComponent(JSON.stringify(input)) : "";
  const path = input
    ? `/api/trpc/${procedure}?input=${encodedInput}`
    : `/api/trpc/${procedure}`;
  const res = http.get(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    timeout: "30s",
  });
  return res;
}

export default function () {
  concurrentUsers.add(1);

  // Mix of endpoints simulating real user behavior
  const scenario = Math.random();

  if (scenario < 0.3) {
    // 30% - Health checks (lightweight)
    group("Health", () => {
      const res = http.get(`${BASE_URL}/api/health`);
      check(res, { "health ok": (r) => r.status === 200 }) || errorRate.add(1);
    });
  } else if (scenario < 0.5) {
    // 20% - SPC queries (medium weight)
    group("SPC", () => {
      const res = trpcQuery("spcAnalysis.list", { page: 1, pageSize: 10 });
      dbQueryLatency.add(res.timings.duration);
      check(res, { "spc ok": (r) => r.status === 200 }) || errorRate.add(1);
    });
  } else if (scenario < 0.65) {
    // 15% - OEE queries (medium weight)
    group("OEE", () => {
      const res = trpcQuery("oee.list", { page: 1, pageSize: 10 });
      dbQueryLatency.add(res.timings.duration);
      check(res, { "oee ok": (r) => r.status === 200 }) || errorRate.add(1);
    });
  } else if (scenario < 0.75) {
    // 10% - Audit log queries (heavy)
    group("Audit", () => {
      const res = trpcQuery("audit.advancedSearch", { page: 1, pageSize: 25, sortOrder: "desc" });
      dbQueryLatency.add(res.timings.duration);
      check(res, { "audit ok": (r) => r.status === 200 }) || errorRate.add(1);
    });
  } else if (scenario < 0.85) {
    // 10% - Dashboard stats (heavy - multiple DB queries)
    group("Dashboard", () => {
      const res = trpcQuery("audit.stats");
      dbQueryLatency.add(res.timings.duration);
      check(res, { "stats ok": (r) => r.status === 200 }) || errorRate.add(1);
    });
  } else if (scenario < 0.95) {
    // 10% - Static page load
    group("Page Load", () => {
      const res = http.get(`${BASE_URL}/`);
      check(res, { "page ok": (r) => r.status === 200 }) || errorRate.add(1);
    });
  } else {
    // 5% - Metrics endpoint
    group("Metrics", () => {
      const res = http.get(`${BASE_URL}/api/metrics`);
      check(res, { "metrics ok": (r) => r.status === 200 }) || errorRate.add(1);
    });
  }

  // Realistic think time
  sleep(Math.random() * 3 + 0.5);
}

export function setup() {
  console.log(`\n🔥 STRESS TEST starting against ${BASE_URL}`);
  console.log("   Stages: 50 → 100 → 200 → 300 → 500 → 750 → 1000 → 0 VUs");
  console.log("   Duration: ~13 minutes\n");

  const res = http.get(`${BASE_URL}/api/health`);
  if (res.status !== 200) {
    console.error("❌ Server not reachable!");
    return { ok: false };
  }
  return { ok: true };
}

export function teardown(data) {
  console.log("\n📊 Stress test completed.");
  console.log("   Look for:");
  console.log("   - At which VU count did errors start appearing?");
  console.log("   - At which VU count did p95 latency exceed 5s?");
  console.log("   - Did the system recover after load decreased?\n");
}
