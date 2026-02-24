/**
 * k6 Spike Test - CPK/SPC Calculator System
 * 
 * Mô phỏng đột ngột tăng tải (ví dụ: đầu ca sản xuất, 
 * khi nhiều operator cùng truy cập hệ thống).
 * 
 * Usage:
 *   k6 run spike-test.js
 *   k6 run spike-test.js --env BASE_URL=https://your-app.manus.space
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const responseTime = new Trend("response_time", true);

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  scenarios: {
    spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },    // Normal baseline
        { duration: "10s", target: 500 },   // SPIKE! (đầu ca)
        { duration: "2m", target: 500 },    // Hold spike
        { duration: "10s", target: 1000 },  // DOUBLE SPIKE!
        { duration: "1m", target: 1000 },   // Hold peak
        { duration: "30s", target: 50 },    // Rapid decrease
        { duration: "1m", target: 50 },     // Recovery period
        { duration: "30s", target: 0 },     // Cool down
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<10000"],      // Allow higher latency during spike
    http_req_failed: ["rate<0.15"],           // Allow 15% errors during spike
    response_time: ["p(99)<15000"],           // 99th percentile under 15s
  },
};

function trpcQuery(procedure, input = undefined) {
  const encodedInput = input ? encodeURIComponent(JSON.stringify(input)) : "";
  const path = input
    ? `/api/trpc/${procedure}?input=${encodedInput}`
    : `/api/trpc/${procedure}`;
  return http.get(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    timeout: "30s",
  });
}

export default function () {
  // Simulate operator workflow: check dashboard → view SPC → check OEE
  
  // Step 1: Load dashboard page
  group("Dashboard Load", () => {
    const res = http.get(`${BASE_URL}/`);
    responseTime.add(res.timings.duration);
    check(res, { "page loaded": (r) => r.status === 200 }) || errorRate.add(1);
  });

  sleep(0.5);

  // Step 2: Check health/status
  group("System Check", () => {
    const res = http.get(`${BASE_URL}/api/health`);
    responseTime.add(res.timings.duration);
    check(res, { "health ok": (r) => r.status === 200 }) || errorRate.add(1);
  });

  sleep(0.3);

  // Step 3: View SPC data
  group("SPC Data", () => {
    const res = trpcQuery("spcAnalysis.list", { page: 1, pageSize: 10 });
    responseTime.add(res.timings.duration);
    check(res, { "spc data ok": (r) => r.status === 200 }) || errorRate.add(1);
  });

  sleep(0.5);

  // Step 4: Check OEE
  group("OEE Check", () => {
    const res = trpcQuery("oee.dashboard");
    responseTime.add(res.timings.duration);
    check(res, { "oee ok": (r) => r.status === 200 }) || errorRate.add(1);
  });

  // Think time between iterations (operator reading data)
  sleep(Math.random() * 5 + 1);
}

export function setup() {
  console.log(`\n⚡ SPIKE TEST starting against ${BASE_URL}`);
  console.log("   Simulates: Đầu ca sản xuất - nhiều operator cùng truy cập");
  console.log("   Pattern: 10 → 500 → 1000 → 50 → 0 VUs");
  console.log("   Duration: ~6 minutes\n");

  const res = http.get(`${BASE_URL}/api/health`);
  if (res.status !== 200) {
    console.error("❌ Server not reachable!");
  }
}

export function teardown() {
  console.log("\n📊 Spike test completed.");
  console.log("   Key questions:");
  console.log("   - Did the system handle the sudden spike?");
  console.log("   - How quickly did it recover?");
  console.log("   - Were there cascading failures?\n");
}
