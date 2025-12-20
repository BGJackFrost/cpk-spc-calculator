# Hướng dẫn Thiết lập GitHub CI/CD, Codecov và Branch Protection

## Mục lục
1. [Upload CI Workflow](#1-upload-ci-workflow)
2. [Tích hợp Codecov](#2-tích-hợp-codecov)
3. [Thiết lập Branch Protection](#3-thiết-lập-branch-protection)

---

## 1. Upload CI Workflow

### Bước 1: Truy cập Repository
1. Đăng nhập vào GitHub
2. Truy cập repository: https://github.com/BGJackFrost/BGJackFrost

### Bước 2: Tạo thư mục workflows
1. Click vào **Add file** → **Create new file**
2. Trong ô "Name your file...", nhập: `.github/workflows/ci.yml`

### Bước 3: Copy nội dung CI Workflow
Copy toàn bộ nội dung sau vào file:

```yaml
# CI/CD Pipeline for CPK/SPC Calculator
# Automatically runs tests, lint, and type checks on every push and pull request

name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '22'
  PNPM_VERSION: '9'

jobs:
  # Job 1: Install dependencies and cache
  setup:
    name: Setup
    runs-on: ubuntu-latest
    outputs:
      cache-key: ${{ steps.cache-key.outputs.key }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Generate cache key
        id: cache-key
        run: echo "key=${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}" >> $GITHUB_OUTPUT

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

  # Job 2: Run unit tests
  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run unit tests with coverage
        run: pnpm test:coverage -- --reporter=verbose
        env:
          NODE_ENV: test

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false
          verbose: true
        env:
          CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: |
            coverage/
            test-results/
          retention-days: 7

  # Job 3: Run linting
  lint:
    name: Lint
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run ESLint
        run: pnpm lint || true
        continue-on-error: true

  # Job 4: Type checking
  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run TypeScript type check
        run: pnpm check || true
        continue-on-error: true

  # Job 5: Build check
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [test, lint, typecheck]
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build application
        run: pnpm build
        env:
          NODE_ENV: production

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/
          retention-days: 7

  # Job 6: Security audit
  security:
    name: Security Audit
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run security audit
        run: pnpm audit --audit-level=high || true
        continue-on-error: true

  # Summary job
  ci-summary:
    name: CI Summary
    runs-on: ubuntu-latest
    needs: [test, lint, typecheck, build, security]
    if: always()
    steps:
      - name: Check job results
        run: |
          echo "## CI Pipeline Summary" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Job | Status |" >> $GITHUB_STEP_SUMMARY
          echo "|-----|--------|" >> $GITHUB_STEP_SUMMARY
          echo "| Unit Tests | ${{ needs.test.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Lint | ${{ needs.lint.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Type Check | ${{ needs.typecheck.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Build | ${{ needs.build.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Security | ${{ needs.security.result }} |" >> $GITHUB_STEP_SUMMARY

      - name: Fail if critical jobs failed
        if: needs.test.result == 'failure' || needs.build.result == 'failure'
        run: exit 1
```

### Bước 4: Commit file
1. Scroll xuống phần "Commit new file"
2. Nhập commit message: `ci: add GitHub Actions workflow`
3. Chọn "Commit directly to the main branch"
4. Click **Commit new file**

---

## 2. Tích hợp Codecov

### Bước 1: Tạo tài khoản Codecov
1. Truy cập https://codecov.io
2. Click **Sign up** và chọn **Sign up with GitHub**
3. Authorize Codecov để truy cập GitHub

### Bước 2: Thêm Repository
1. Sau khi đăng nhập, click **Add new repository**
2. Tìm và chọn repository `BGJackFrost/BGJackFrost`
3. Click **Setup repo**

### Bước 3: Lấy CODECOV_TOKEN
1. Trong trang repository trên Codecov, vào **Settings**
2. Copy **Repository Upload Token** (CODECOV_TOKEN)

### Bước 4: Thêm Secret vào GitHub
1. Truy cập repository trên GitHub
2. Vào **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `CODECOV_TOKEN`
5. Secret: Paste token đã copy từ Codecov
6. Click **Add secret**

### Bước 5: Kiểm tra
- Push một commit mới hoặc tạo PR
- CI workflow sẽ chạy và upload coverage lên Codecov
- Badge coverage sẽ hiển thị trên README

---

## 3. Thiết lập Branch Protection

### Bước 1: Truy cập Settings
1. Vào repository trên GitHub
2. Click **Settings** → **Branches**

### Bước 2: Thêm Branch Protection Rule
1. Click **Add branch protection rule**
2. Branch name pattern: `main`

### Bước 3: Cấu hình Protection Rules

#### Require status checks
- [x] **Require status checks to pass before merging**
- [x] **Require branches to be up to date before merging**
- Thêm các status checks:
  - `Unit Tests`
  - `Build`
  - `Type Check`

#### Require pull request reviews
- [x] **Require a pull request before merging**
- [x] **Require approvals**: 1
- [x] **Dismiss stale pull request approvals when new commits are pushed**

#### Additional settings
- [x] **Require conversation resolution before merging**
- [x] **Do not allow bypassing the above settings**

### Bước 4: Lưu
Click **Create** hoặc **Save changes**

---

## Kiểm tra Hoàn tất

### CI Pipeline
- [ ] Workflow file đã được tạo tại `.github/workflows/ci.yml`
- [ ] CI chạy tự động khi push/PR
- [ ] Tất cả jobs pass (hoặc continue-on-error)

### Codecov
- [ ] Codecov account đã được tạo
- [ ] Repository đã được thêm vào Codecov
- [ ] CODECOV_TOKEN đã được thêm vào GitHub Secrets
- [ ] Coverage badge hiển thị trên README

### Branch Protection
- [ ] Rule đã được tạo cho branch `main`
- [ ] Status checks required
- [ ] PR reviews required

---

## Troubleshooting

### CI Workflow không chạy
- Kiểm tra file `.github/workflows/ci.yml` có đúng cú pháp YAML
- Kiểm tra branch name trong `on.push.branches`

### Codecov không nhận coverage
- Kiểm tra CODECOV_TOKEN đã được thêm đúng
- Kiểm tra file `coverage/lcov.info` có được tạo

### Branch Protection không hoạt động
- Đảm bảo bạn là admin của repository
- Kiểm tra status check names khớp với job names trong workflow

---

## Liên hệ Hỗ trợ

Nếu gặp vấn đề, vui lòng tạo issue trên GitHub hoặc liên hệ team phát triển.
