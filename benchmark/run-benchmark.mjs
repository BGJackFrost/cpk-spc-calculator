#!/usr/bin/env node
/**
 * CPK/SPC Calculator - Performance Benchmark Suite
 * 
 * Đo throughput và latency cho các API endpoints quan trọng:
 * - SPC Analysis endpoints
 * - OEE Calculation endpoints
 * - Audit Log queries
 * - Health Check endpoints
 * 
 * Sử dụng: node benchmark/run-benchmark.mjs [options]
 * 
 * Options:
 *   --url <base_url>       Base URL (default: http://localhost:3000)
 *   --concurrency <n>      Số concurrent requests (default: 10)
 *   --duration <seconds>   Thời gian chạy mỗi test (default: 10)
 *   --warmup <n>           Số requests warmup (default: 5)
 *   --output <file>        File output (default: benchmark/results.md)
 *   --endpoints <list>     Comma-separated endpoint groups: spc,oee,audit,health,all (default: all)
 */

import http from "http";
import https from "https";
import { writeFileSync } from "fs";
import { performance } from "perf_hooks";

// ─── Configuration ───────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const BASE_URL = getArg("url", "http://localhost:3000");
const CONCURRENCY = parseInt(getArg("concurrency", "10"));
const DURATION_SEC = parseInt(getArg("duration", "10"));
const WARMUP_COUNT = parseInt(getArg("warmup", "5"));
const OUTPUT_FILE = getArg("output", "benchmark/results.md");
const ENDPOINT_GROUPS = getArg("endpoints", "all").split(",");

const isHttps = BASE_URL.startsWith("https");
const httpModule = isHttps ? https : http;

// ─── tRPC Request Helper ─────────────────────────────────────────
function trpcQuery(path, input = {}) {
  const encodedInput = encodeURIComponent(JSON.stringify({ "0": { json: input } }));
  return `${BASE_URL}/api/trpc/${path}?batch=1&input=${encodedInput}`;
}

function restGet(path) {
  return `${BASE_URL}${path}`;
}

// ─── Endpoint Definitions ────────────────────────────────────────
const ENDPOINTS = {
  health: [
    { name: "Health Check (basic)", url: restGet("/api/health"), method: "GET", group: "Health" },
    { name: "Health Check (detailed)", url: restGet("/api/health/detailed"), method: "GET", group: "Health" },
    { name: "Liveness Probe", url: restGet("/api/health/live"), method: "GET", group: "Health" },
    { name: "Readiness Probe", url: restGet("/api/health/ready"), method: "GET", group: "Health" },
    { name: "Prometheus Metrics", url: restGet("/api/metrics"), method: "GET", group: "Health" },
  ],
  spc: [
    { name: "SPC Analysis History (page 1)", url: trpcQuery("spcHistory.list", { page: 1, pageSize: 20 }), method: "GET", group: "SPC Analysis" },
    { name: "SPC Analysis History (page 1, 50 items)", url: trpcQuery("spcHistory.list", { page: 1, pageSize: 50 }), method: "GET", group: "SPC Analysis" },
    { name: "Product List", url: trpcQuery("product.list"), method: "GET", group: "SPC Analysis" },
    { name: "Product Specifications", url: trpcQuery("productSpec.list"), method: "GET", group: "SPC Analysis" },
    { name: "SPC Sampling Plans", url: trpcQuery("spcPlan.list"), method: "GET", group: "SPC Analysis" },
    { name: "SPC Rules Config", url: trpcQuery("spcRulesConfig.get"), method: "GET", group: "SPC Analysis" },
    { name: "CPK Trend (30 days)", url: trpcQuery("cpkHistory.trend", { days: 30 }), method: "GET", group: "SPC Analysis" },
    { name: "Defect Categories", url: trpcQuery("defect.categories"), method: "GET", group: "SPC Analysis" },
  ],
  oee: [
    { name: "OEE Records List", url: trpcQuery("oee.list", { page: 1, pageSize: 20 }), method: "GET", group: "OEE Calculation" },
    { name: "OEE Dashboard Stats", url: trpcQuery("oee.dashboardStats"), method: "GET", group: "OEE Calculation" },
    { name: "Production Lines", url: trpcQuery("productionLine.list"), method: "GET", group: "OEE Calculation" },
    { name: "Machine Types", url: trpcQuery("machineType.list"), method: "GET", group: "OEE Calculation" },
    { name: "Maintenance Work Orders", url: trpcQuery("maintenanceWorkOrder.list", { page: 1, pageSize: 20 }), method: "GET", group: "OEE Calculation" },
    { name: "MTTR/MTBF Stats", url: trpcQuery("mttrMtbf.stats"), method: "GET", group: "OEE Calculation" },
  ],
  audit: [
    { name: "Audit Logs (page 1)", url: trpcQuery("audit.advancedSearch", { page: 1, pageSize: 20 }), method: "GET", group: "Audit Log" },
    { name: "Audit Logs (page 1, 50 items)", url: trpcQuery("audit.advancedSearch", { page: 1, pageSize: 50 }), method: "GET", group: "Audit Log" },
    { name: "Audit Stats", url: trpcQuery("audit.stats"), method: "GET", group: "Audit Log" },
    { name: "Audit Users", url: trpcQuery("audit.users"), method: "GET", group: "Audit Log" },
    { name: "Audit Modules", url: trpcQuery("audit.modules"), method: "GET", group: "Audit Log" },
  ],
};

// ─── HTTP Request Function ───────────────────────────────────────
function makeRequest(url, method = "GET") {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method,
      headers: { "Accept": "application/json" },
      timeout: 30000,
      rejectUnauthorized: false,
    };

    const req = httpModule.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        const latency = performance.now() - start;
        resolve({
          statusCode: res.statusCode,
          latency,
          bodySize: Buffer.byteLength(body, "utf8"),
          success: res.statusCode >= 200 && res.statusCode < 400,
        });
      });
    });

    req.on("error", (err) => {
      const latency = performance.now() - start;
      resolve({ statusCode: 0, latency, bodySize: 0, success: false, error: err.message });
    });

    req.on("timeout", () => {
      req.destroy();
      const latency = performance.now() - start;
      resolve({ statusCode: 0, latency, bodySize: 0, success: false, error: "timeout" });
    });

    req.end();
  });
}

// ─── Benchmark Runner ────────────────────────────────────────────
async function benchmarkEndpoint(endpoint, concurrency, durationMs, warmupCount) {
  // Warmup
  for (let i = 0; i < warmupCount; i++) {
    await makeRequest(endpoint.url, endpoint.method);
  }

  const results = [];
  const startTime = performance.now();
  let activeRequests = 0;
  let totalRequests = 0;

  return new Promise((resolve) => {
    function checkDone() {
      if (performance.now() - startTime >= durationMs && activeRequests === 0) {
        const latencies = results.filter(r => r.success).map(r => r.latency).sort((a, b) => a - b);
        const errors = results.filter(r => !r.success).length;
        const totalTime = (performance.now() - startTime) / 1000;

        if (latencies.length === 0) {
          resolve({
            name: endpoint.name,
            group: endpoint.group,
            totalRequests,
            successCount: 0,
            errorCount: errors,
            throughput: 0,
            avgLatency: 0,
            minLatency: 0,
            maxLatency: 0,
            p50: 0,
            p95: 0,
            p99: 0,
            avgBodySize: 0,
          });
          return;
        }

        const p = (pct) => latencies[Math.floor(latencies.length * pct / 100)] || 0;
        const avgBody = results.reduce((s, r) => s + r.bodySize, 0) / results.length;

        resolve({
          name: endpoint.name,
          group: endpoint.group,
          totalRequests,
          successCount: latencies.length,
          errorCount: errors,
          throughput: (latencies.length / totalTime).toFixed(2),
          avgLatency: (latencies.reduce((s, l) => s + l, 0) / latencies.length).toFixed(2),
          minLatency: latencies[0].toFixed(2),
          maxLatency: latencies[latencies.length - 1].toFixed(2),
          p50: p(50).toFixed(2),
          p95: p(95).toFixed(2),
          p99: p(99).toFixed(2),
          avgBodySize: Math.round(avgBody),
        });
      }
    }

    function sendRequest() {
      if (performance.now() - startTime >= durationMs) {
        checkDone();
        return;
      }

      activeRequests++;
      totalRequests++;

      makeRequest(endpoint.url, endpoint.method).then((result) => {
        results.push(result);
        activeRequests--;
        sendRequest();
        checkDone();
      });
    }

    // Start concurrent requests
    for (let i = 0; i < concurrency; i++) {
      sendRequest();
    }
  });
}

// ─── Report Generator ────────────────────────────────────────────
function generateReport(allResults, config) {
  const now = new Date().toISOString().replace("T", " ").split(".")[0];
  let md = `# Performance Benchmark Report\n\n`;
  md += `> **Ngày chạy:** ${now}\n`;
  md += `> **Base URL:** ${config.baseUrl}\n`;
  md += `> **Concurrency:** ${config.concurrency} concurrent requests\n`;
  md += `> **Duration:** ${config.duration}s per endpoint\n`;
  md += `> **Warmup:** ${config.warmup} requests\n\n`;
  md += `---\n\n`;

  // Summary table
  md += `## Tổng quan\n\n`;
  md += `| Endpoint | Throughput (req/s) | Avg (ms) | P50 (ms) | P95 (ms) | P99 (ms) | Errors |\n`;
  md += `|----------|-------------------|----------|----------|----------|----------|--------|\n`;

  for (const r of allResults) {
    const errorPct = r.totalRequests > 0 ? ((r.errorCount / r.totalRequests) * 100).toFixed(1) : "0.0";
    md += `| ${r.name} | ${r.throughput} | ${r.avgLatency} | ${r.p50} | ${r.p95} | ${r.p99} | ${r.errorCount} (${errorPct}%) |\n`;
  }
  md += `\n`;

  // Group results
  const groups = {};
  for (const r of allResults) {
    if (!groups[r.group]) groups[r.group] = [];
    groups[r.group].push(r);
  }

  for (const [group, results] of Object.entries(groups)) {
    md += `## ${group}\n\n`;
    md += `| Metric | ${results.map(r => r.name.substring(0, 30)).join(" | ")} |\n`;
    md += `|--------|${results.map(() => "--------").join("|")}|\n`;
    md += `| Total Requests | ${results.map(r => r.totalRequests).join(" | ")} |\n`;
    md += `| Success | ${results.map(r => r.successCount).join(" | ")} |\n`;
    md += `| Errors | ${results.map(r => r.errorCount).join(" | ")} |\n`;
    md += `| Throughput (req/s) | ${results.map(r => r.throughput).join(" | ")} |\n`;
    md += `| Avg Latency (ms) | ${results.map(r => r.avgLatency).join(" | ")} |\n`;
    md += `| Min Latency (ms) | ${results.map(r => r.minLatency).join(" | ")} |\n`;
    md += `| P50 Latency (ms) | ${results.map(r => r.p50).join(" | ")} |\n`;
    md += `| P95 Latency (ms) | ${results.map(r => r.p95).join(" | ")} |\n`;
    md += `| P99 Latency (ms) | ${results.map(r => r.p99).join(" | ")} |\n`;
    md += `| Max Latency (ms) | ${results.map(r => r.maxLatency).join(" | ")} |\n`;
    md += `| Avg Response Size | ${results.map(r => `${r.avgBodySize} B`).join(" | ")} |\n`;
    md += `\n`;

    // Performance assessment
    md += `### Đánh giá\n\n`;
    for (const r of results) {
      const p95 = parseFloat(r.p95);
      const tp = parseFloat(r.throughput);
      let status = "🟢 Tốt";
      let note = "";
      if (p95 > 2000) { status = "🔴 Chậm"; note = "P95 > 2s, cần tối ưu query hoặc thêm cache"; }
      else if (p95 > 500) { status = "🟡 Trung bình"; note = "P95 > 500ms, xem xét thêm index hoặc cache"; }
      else if (p95 > 200) { status = "🟢 Tốt"; note = "Hiệu suất chấp nhận được"; }
      else { status = "🟢 Xuất sắc"; note = "Hiệu suất rất tốt"; }

      if (r.errorCount > 0) {
        status = "⚠️ Có lỗi";
        note += ` | ${r.errorCount} errors detected`;
      }

      md += `- **${r.name}**: ${status} — ${note} (${tp} req/s, P95=${p95}ms)\n`;
    }
    md += `\n`;
  }

  // Recommendations
  md += `## Khuyến nghị Tối ưu\n\n`;
  const slowEndpoints = allResults.filter(r => parseFloat(r.p95) > 500);
  const errorEndpoints = allResults.filter(r => r.errorCount > 0);

  if (slowEndpoints.length > 0) {
    md += `### Endpoints cần tối ưu (P95 > 500ms)\n\n`;
    for (const r of slowEndpoints) {
      md += `1. **${r.name}** (P95: ${r.p95}ms)\n`;
      md += `   - Kiểm tra query plan với EXPLAIN ANALYZE\n`;
      md += `   - Thêm composite indexes cho các cột filter\n`;
      md += `   - Xem xét cache kết quả với TTL phù hợp\n`;
    }
    md += `\n`;
  }

  if (errorEndpoints.length > 0) {
    md += `### Endpoints có lỗi\n\n`;
    for (const r of errorEndpoints) {
      md += `1. **${r.name}** (${r.errorCount} errors / ${r.totalRequests} requests)\n`;
      md += `   - Kiểm tra server logs để xác định nguyên nhân\n`;
      md += `   - Có thể do connection pool exhaustion hoặc timeout\n`;
    }
    md += `\n`;
  }

  if (slowEndpoints.length === 0 && errorEndpoints.length === 0) {
    md += `Tất cả endpoints đều hoạt động tốt. Không có vấn đề hiệu suất nghiêm trọng.\n\n`;
  }

  md += `---\n\n`;
  md += `*Benchmark chạy bởi CPK/SPC Calculator Performance Suite*\n`;

  return md;
}

// ─── Main ────────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║   CPK/SPC Calculator - Performance Benchmark Suite  ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log();
  console.log(`  Base URL:     ${BASE_URL}`);
  console.log(`  Concurrency:  ${CONCURRENCY}`);
  console.log(`  Duration:     ${DURATION_SEC}s per endpoint`);
  console.log(`  Warmup:       ${WARMUP_COUNT} requests`);
  console.log(`  Output:       ${OUTPUT_FILE}`);
  console.log(`  Groups:       ${ENDPOINT_GROUPS.join(", ")}`);
  console.log();

  // Connectivity check
  console.log("🔍 Kiểm tra kết nối...");
  try {
    const check = await makeRequest(restGet("/api/health"));
    if (!check.success) {
      console.error(`❌ Server không phản hồi (status: ${check.statusCode})`);
      process.exit(1);
    }
    console.log(`✅ Server OK (${check.latency.toFixed(0)}ms)\n`);
  } catch (e) {
    console.error(`❌ Không thể kết nối tới ${BASE_URL}`);
    process.exit(1);
  }

  // Select endpoints
  let selectedEndpoints = [];
  const includeAll = ENDPOINT_GROUPS.includes("all");
  for (const [group, endpoints] of Object.entries(ENDPOINTS)) {
    if (includeAll || ENDPOINT_GROUPS.includes(group)) {
      selectedEndpoints.push(...endpoints);
    }
  }

  console.log(`📊 Chạy benchmark cho ${selectedEndpoints.length} endpoints...\n`);

  const allResults = [];
  for (let i = 0; i < selectedEndpoints.length; i++) {
    const ep = selectedEndpoints[i];
    const progress = `[${i + 1}/${selectedEndpoints.length}]`;
    process.stdout.write(`  ${progress} ${ep.name.padEnd(40)} `);

    const result = await benchmarkEndpoint(ep, CONCURRENCY, DURATION_SEC * 1000, WARMUP_COUNT);
    allResults.push(result);

    const p95 = parseFloat(result.p95);
    const icon = result.errorCount > 0 ? "⚠️" : p95 > 2000 ? "🔴" : p95 > 500 ? "🟡" : "🟢";
    console.log(`${icon} ${result.throughput} req/s | P50=${result.p50}ms P95=${result.p95}ms P99=${result.p99}ms | Errors: ${result.errorCount}`);
  }

  // Generate report
  console.log(`\n📝 Tạo báo cáo...`);
  const report = generateReport(allResults, {
    baseUrl: BASE_URL,
    concurrency: CONCURRENCY,
    duration: DURATION_SEC,
    warmup: WARMUP_COUNT,
  });

  writeFileSync(OUTPUT_FILE, report, "utf8");
  console.log(`✅ Báo cáo đã lưu tại: ${OUTPUT_FILE}`);

  // Quick summary
  console.log(`\n═══ Tóm tắt ═══`);
  const avgThroughput = allResults.reduce((s, r) => s + parseFloat(r.throughput), 0) / allResults.length;
  const avgP95 = allResults.reduce((s, r) => s + parseFloat(r.p95), 0) / allResults.length;
  const totalErrors = allResults.reduce((s, r) => s + r.errorCount, 0);
  console.log(`  Avg Throughput: ${avgThroughput.toFixed(1)} req/s`);
  console.log(`  Avg P95:        ${avgP95.toFixed(1)} ms`);
  console.log(`  Total Errors:   ${totalErrors}`);
  console.log();
}

main().catch(console.error);
