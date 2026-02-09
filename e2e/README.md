# Playwright E2E Testing Suite

## Tổng quan

Bộ test E2E (End-to-End) cho hệ thống CPK/SPC Calculator sử dụng Playwright. Bao gồm các test cho authentication, navigation, API health checks, audit logs, performance và accessibility.

## Cài đặt

```bash
cd e2e
npm install
npx playwright install chromium
```

## Chạy tests

```bash
# Chạy tất cả tests
npm test

# Chạy chỉ API tests (không cần browser)
npm run test:api

# Chạy chỉ UI tests
npm run test:ui

# Chạy trên mobile viewport
npm run test:mobile

# Chạy với URL khác
BASE_URL=https://your-app.manus.space npm test
```

## Test Files

| File | Mô tả | Tests |
|------|--------|-------|
| `auth.spec.ts` | Authentication & Login flow | 5 |
| `navigation.spec.ts` | Navigation & Dashboard routing | 7 |
| `api-health.spec.ts` | API Health Check endpoints | 10 |
| `audit-logs.spec.ts` | Audit Logs page UI | 6 |
| `performance.spec.ts` | Performance & Accessibility | 9 |

**Tổng: 37 E2E tests**

## Xem báo cáo

```bash
npm run report
```

Báo cáo HTML được lưu tại `playwright-report/`.

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Install dependencies
        run: |
          cd e2e
          npm install
          npx playwright install chromium --with-deps
      - name: Start server
        run: |
          npm start &
          npx wait-on http://localhost:3000
      - name: Run E2E tests
        run: cd e2e && npm test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: e2e/playwright-report/
```

## Cấu hình

Chỉnh sửa `playwright.config.ts` để thay đổi:

- **baseURL**: URL của ứng dụng (mặc định: `http://localhost:3000`)
- **projects**: Browsers và devices để test
- **retries**: Số lần retry khi test fail (CI: 2, local: 0)
- **workers**: Số workers chạy song song

## Lưu ý

- Dev server phải đang chạy trước khi chạy tests
- API tests (`api-health.spec.ts`) không cần authentication
- UI tests có thể bị ảnh hưởng bởi trạng thái auth
- Screenshots và videos được lưu khi test fail
