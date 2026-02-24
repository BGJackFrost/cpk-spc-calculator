# Performance Benchmark Suite

Bộ công cụ đo hiệu suất cho CPK/SPC Calculator, đo throughput và latency cho các API endpoints quan trọng.

## Cài đặt

Không cần cài thêm dependencies. Script sử dụng Node.js built-in modules.

## Sử dụng

### Chạy benchmark đầy đủ

```bash
# Chạy tất cả endpoints (mặc định)
node benchmark/run-benchmark.mjs

# Chạy với custom options
node benchmark/run-benchmark.mjs --concurrency 20 --duration 15

# Chạy chỉ SPC endpoints
node benchmark/run-benchmark.mjs --endpoints spc

# Chạy SPC + OEE
node benchmark/run-benchmark.mjs --endpoints spc,oee

# Chạy với URL production
node benchmark/run-benchmark.mjs --url https://your-app.manus.space
```

### Options

| Option | Default | Mô tả |
|--------|---------|--------|
| `--url` | `http://localhost:3000` | Base URL của server |
| `--concurrency` | `10` | Số concurrent requests |
| `--duration` | `10` | Thời gian chạy mỗi endpoint (giây) |
| `--warmup` | `5` | Số requests warmup trước khi đo |
| `--output` | `benchmark/results.md` | File output báo cáo |
| `--endpoints` | `all` | Nhóm endpoints: `spc`, `oee`, `audit`, `health`, `all` |

### Endpoint Groups

| Group | Endpoints | Mô tả |
|-------|-----------|--------|
| `health` | 5 | Health check, liveness, readiness, metrics |
| `spc` | 8 | SPC analysis, CPK trend, products, specs, rules |
| `oee` | 6 | OEE records, dashboard, maintenance, MTTR/MTBF |
| `audit` | 5 | Audit logs, stats, users, modules |

### Metrics đo được

| Metric | Mô tả |
|--------|--------|
| Throughput | Số requests/second thành công |
| Avg Latency | Latency trung bình (ms) |
| P50 | Percentile 50 - median latency |
| P95 | Percentile 95 - latency cho 95% requests |
| P99 | Percentile 99 - worst case latency |
| Error Rate | Tỷ lệ lỗi (%) |

### Đánh giá hiệu suất

| P95 Latency | Đánh giá | Hành động |
|-------------|----------|-----------|
| < 200ms | Xuất sắc | Không cần tối ưu |
| 200-500ms | Tốt | Chấp nhận được |
| 500-2000ms | Trung bình | Xem xét thêm index/cache |
| > 2000ms | Chậm | Cần tối ưu ngay |

## Output

Kết quả được lưu dưới dạng Markdown tại `benchmark/results.md` (hoặc file tùy chỉnh), bao gồm bảng tổng quan, chi tiết từng nhóm, đánh giá tự động, và khuyến nghị tối ưu.

## Tích hợp CI/CD

```yaml
# GitHub Actions example
- name: Run Performance Benchmark
  run: |
    node benchmark/run-benchmark.mjs --duration 5 --output benchmark/ci-results.md
    cat benchmark/ci-results.md >> $GITHUB_STEP_SUMMARY
```
