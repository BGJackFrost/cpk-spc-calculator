# Performance Benchmark Report

> **Ngày chạy:** 2026-02-09 07:47:23
> **Base URL:** http://localhost:3000
> **Concurrency:** 5 concurrent requests
> **Duration:** 5s per endpoint
> **Warmup:** 5 requests

---

## Tổng quan

| Endpoint | Throughput (req/s) | Avg (ms) | P50 (ms) | P95 (ms) | P99 (ms) | Errors |
|----------|-------------------|----------|----------|----------|----------|--------|
| Health Check (basic) | 1990.57 | 2.47 | 2.14 | 4.29 | 7.26 | 0 (0.0%) |
| Health Check (detailed) | 11.13 | 441.39 | 441.88 | 457.76 | 461.00 | 0 (0.0%) |
| Liveness Probe | 2450.68 | 2.01 | 1.89 | 3.01 | 5.76 | 0 (0.0%) |
| Readiness Probe | 22.88 | 215.30 | 215.76 | 219.99 | 220.34 | 0 (0.0%) |
| Prometheus Metrics | 11.11 | 441.70 | 442.12 | 451.61 | 452.78 | 0 (0.0%) |

## Health

| Metric | Health Check (basic) | Health Check (detailed) | Liveness Probe | Readiness Probe | Prometheus Metrics |
|--------|--------|--------|--------|--------|--------|
| Total Requests | 9971 | 60 | 12274 | 119 | 60 |
| Success | 9971 | 60 | 12274 | 119 | 60 |
| Errors | 0 | 0 | 0 | 0 | 0 |
| Throughput (req/s) | 1990.57 | 11.13 | 2450.68 | 22.88 | 11.11 |
| Avg Latency (ms) | 2.47 | 441.39 | 2.01 | 215.30 | 441.70 |
| Min Latency (ms) | 1.18 | 429.62 | 1.05 | 209.97 | 429.72 |
| P50 Latency (ms) | 2.14 | 441.88 | 1.89 | 215.76 | 442.12 |
| P95 Latency (ms) | 4.29 | 457.76 | 3.01 | 219.99 | 451.61 |
| P99 Latency (ms) | 7.26 | 461.00 | 5.76 | 220.34 | 452.78 |
| Max Latency (ms) | 17.70 | 461.00 | 15.95 | 221.83 | 452.78 |
| Avg Response Size | 147 B | 708 B | 54 B | 55 B | 2539 B |

### Đánh giá

- **Health Check (basic)**: 🟢 Xuất sắc — Hiệu suất rất tốt (1990.57 req/s, P95=4.29ms)
- **Health Check (detailed)**: 🟢 Tốt — Hiệu suất chấp nhận được (11.13 req/s, P95=457.76ms)
- **Liveness Probe**: 🟢 Xuất sắc — Hiệu suất rất tốt (2450.68 req/s, P95=3.01ms)
- **Readiness Probe**: 🟢 Tốt — Hiệu suất chấp nhận được (22.88 req/s, P95=219.99ms)
- **Prometheus Metrics**: 🟢 Tốt — Hiệu suất chấp nhận được (11.11 req/s, P95=451.61ms)

## Khuyến nghị Tối ưu

Tất cả endpoints đều hoạt động tốt. Không có vấn đề hiệu suất nghiêm trọng.

---

*Benchmark chạy bởi CPK/SPC Calculator Performance Suite*
