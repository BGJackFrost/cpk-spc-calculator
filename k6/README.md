# k6 Load Testing Suite

## Tổng quan

Bộ load testing cho hệ thống CPK/SPC Calculator sử dụng [k6](https://k6.io/) - công cụ load testing hiệu suất cao. Bao gồm 3 scripts cho các kịch bản khác nhau.

## Cài đặt k6

```bash
# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# macOS
brew install k6

# Docker
docker pull grafana/k6
```

## Scripts

| Script | Mô tả | VUs | Thời gian |
|--------|--------|-----|-----------|
| `load-test.js` | Test tải tổng hợp (5 scenarios) | 1-1000 | 30s-30m |
| `stress-test.js` | Tìm breaking point | 50-1000 | ~13m |
| `spike-test.js` | Mô phỏng đột ngột tăng tải | 10-1000 | ~6m |

## Chạy tests

### Load Test (mặc định)
```bash
# Smoke test (1 VU, 30s)
k6 run load-test.js --env SCENARIO=smoke

# Load test (100 VUs, 5m)
k6 run load-test.js

# Stress test via load-test.js (500 VUs, 10m)
k6 run load-test.js --env SCENARIO=stress

# Spike test via load-test.js (1000 VUs spike)
k6 run load-test.js --env SCENARIO=spike

# Soak test (50 VUs, 30m)
k6 run load-test.js --env SCENARIO=soak
```

### Stress Test
```bash
k6 run stress-test.js
# Stages: 50 → 100 → 200 → 300 → 500 → 750 → 1000 → 0 VUs
```

### Spike Test
```bash
k6 run spike-test.js
# Simulates: Đầu ca sản xuất - nhiều operator cùng truy cập
# Pattern: 10 → 500 → 1000 → 50 → 0 VUs
```

### Custom URL
```bash
k6 run load-test.js --env BASE_URL=https://your-app.manus.space
```

## Thresholds (Ngưỡng)

| Metric | Load Test | Stress Test | Spike Test |
|--------|-----------|-------------|------------|
| HTTP p(95) | < 2000ms | < 5000ms | < 10000ms |
| Error rate | < 5% | < 10% | < 15% |
| Health p(95) | < 500ms | - | - |
| SPC p(95) | < 3000ms | - | - |
| OEE p(95) | < 3000ms | - | - |
| Audit p(95) | < 2000ms | - | - |

## Custom Metrics

- `health_latency` - Latency của health check endpoints
- `spc_latency` - Latency của SPC analysis endpoints
- `oee_latency` - Latency của OEE calculation endpoints
- `audit_latency` - Latency của audit log endpoints
- `db_query_latency` - Latency của database queries
- `response_time` - Response time tổng hợp
- `errors` - Custom error rate
- `api_calls` - Tổng số API calls

## Endpoints được test

### Health Check (lightweight)
- `GET /api/health` - Basic health check
- `GET /api/health/live` - Liveness probe
- `GET /api/metrics` - Prometheus metrics

### SPC Analysis (medium)
- `GET /api/trpc/spcAnalysis.list` - Danh sách phân tích
- `GET /api/trpc/product.list` - Danh sách sản phẩm
- `GET /api/trpc/measurementSpec.list` - Thông số đo
- `GET /api/trpc/controlPlan.list` - Kế hoạch kiểm soát

### OEE Calculation (medium)
- `GET /api/trpc/oee.list` - Danh sách OEE records
- `GET /api/trpc/oee.dashboard` - OEE dashboard
- `GET /api/trpc/productionLine.list` - Dây chuyền sản xuất

### Audit Logs (heavy)
- `GET /api/trpc/audit.advancedSearch` - Tìm kiếm nâng cao
- `GET /api/trpc/audit.stats` - Thống kê audit

## Tích hợp CI/CD

### GitHub Actions
```yaml
name: Load Tests
on:
  schedule:
    - cron: '0 2 * * 1'  # Mỗi thứ 2 lúc 2:00 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0.3.1
        with:
          filename: k6/load-test.js
          flags: --env SCENARIO=smoke --env BASE_URL=${{ secrets.APP_URL }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: k6-results
          path: k6/results/
```

## Tích hợp Grafana

Xuất kết quả k6 sang InfluxDB/Prometheus để hiển thị trên Grafana:

```bash
# Output to InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 load-test.js

# Output to Prometheus
k6 run --out experimental-prometheus-rw load-test.js
```

## Lưu ý

- Chạy load test trên môi trường staging, không phải production
- Đảm bảo server đang chạy trước khi bắt đầu test
- Spike test có thể gây ảnh hưởng đến các service khác trên cùng server
- Kết quả benchmark phụ thuộc vào cấu hình phần cứng và network
