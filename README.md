# CPK/SPC Calculator - Hệ thống Tính toán CPK/SPC

[![CI Pipeline](https://github.com/BGJackFrost/BGJackFrost/actions/workflows/ci.yml/badge.svg)](https://github.com/BGJackFrost/BGJackFrost/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-900%2B%20passed-brightgreen)](https://github.com/BGJackFrost/BGJackFrost/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## Tổng quan

Hệ thống tính toán CPK/SPC chuyên nghiệp cho quản lý chất lượng sản xuất. Tích hợp đầy đủ các tính năng:

- **SPC Analysis**: Phân tích thống kê quy trình với 8 SPC Rules
- **CPK Calculation**: Tính toán chỉ số năng lực quy trình (Cp, Cpk, Pp, Ppk)
- **MMS Integration**: Quản lý bảo trì máy móc (OEE, Work Orders, Spare Parts)
- **Real-time Dashboard**: Giám sát dây chuyền sản xuất theo thời gian thực
- **Multi-database Support**: Hỗ trợ MySQL, PostgreSQL với failover tự động

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend**: Node.js, Express, tRPC
- **Database**: MySQL/PostgreSQL với Drizzle ORM
- **Authentication**: Manus OAuth + Local Auth với 2FA
- **Testing**: Vitest (900+ unit tests), Playwright (E2E)

## Cài đặt

```bash
# Clone repository
git clone https://github.com/BGJackFrost/BGJackFrost.git
cd cpk-spc-calculator

# Cài đặt dependencies
pnpm install

# Cấu hình environment
cp .env.example .env

# Chạy development server
pnpm dev
```

## Scripts

| Script | Mô tả |
|--------|-------|
| `pnpm dev` | Chạy development server |
| `pnpm build` | Build production |
| `pnpm test` | Chạy unit tests |
| `pnpm test:e2e` | Chạy E2E tests |
| `pnpm lint` | Kiểm tra linting |
| `pnpm typecheck` | Kiểm tra TypeScript |
| `pnpm db:push` | Đẩy schema lên database |

## Testing

### Unit Tests

```bash
# Chạy tất cả tests
pnpm test

# Chạy tests với watch mode
pnpm test -- --watch

# Chạy tests cụ thể
pnpm test -- --run server/dashboard.components.test.ts
```

### E2E Tests

```bash
# Cài đặt Playwright browsers
pnpm exec playwright install

# Chạy E2E tests
pnpm test:e2e

# Chạy với UI mode
pnpm test:e2e:ui
```

## CI/CD Pipeline

Pipeline tự động chạy trên mỗi push/PR:

1. **Setup**: Cài đặt dependencies và cache
2. **Unit Tests**: Chạy 900+ unit tests với Vitest
3. **Lint**: Kiểm tra code style với ESLint
4. **Type Check**: Kiểm tra TypeScript types
5. **Build**: Build production
6. **Security**: Audit dependencies
7. **E2E Tests**: Chạy Playwright tests (main branch only)

## Cấu trúc thư mục

```
cpk-spc-calculator/
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   └── lib/           # Utilities
├── server/                 # Backend Express/tRPC
│   ├── routers/           # tRPC routers
│   ├── services/          # Business logic
│   └── *.test.ts          # Unit tests
├── drizzle/               # Database schema
├── shared/                # Shared types
├── docs/                  # Documentation
└── .github/workflows/     # CI/CD pipelines
```

## Tính năng chính

### SPC/CPK Analysis
- Phân tích 8 SPC Rules (Western Electric Rules)
- Tính toán Cp, Cpk, Pp, Ppk, Ca
- Control Charts (X-bar, R-chart)
- Histogram và phân bố

### MMS (Maintenance Management System)
- OEE Dashboard (Availability, Performance, Quality)
- Work Order Management
- Spare Parts Inventory
- Predictive Maintenance

### Dashboard
- Real-time monitoring
- Customizable widgets
- Multi-language (Vi/En)
- Dark/Light theme

### Security
- 2FA Authentication
- Rate Limiting
- Audit Logs
- Role-based Access Control

## Documentation

- [Hướng dẫn sử dụng](docs/USER_GUIDE.md)
- [Triển khai Offline](docs/DEPLOYMENT_OFFLINE_GUIDE.md)
- [API Documentation](docs/API.md)
- [Migration Guide](docs/POSTGRESQL_MIGRATION_PLAN_BY_MODULE.md)

## Contributing

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Tạo Pull Request

## License

MIT License - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## Support

Nếu gặp vấn đề, vui lòng tạo issue trên GitHub hoặc liên hệ team phát triển.
