# Báo cáo Audit Database Queries & Security

**Ngày audit:** 22/12/2024  
**Phiên bản:** 3.0.0  
**Tác giả:** Manus AI

---

## 1. Tổng quan Audit

### 1.1 Phạm vi Audit

Báo cáo này bao gồm phân tích chi tiết về:
- Database queries có nguy cơ chậm (slow queries)
- Security vulnerabilities từ npm audit
- Recommendations để tối ưu performance và bảo mật

### 1.2 Kết quả Tổng hợp

| Hạng mục | Số lượng | Mức độ |
|----------|----------|--------|
| Queries không có LIMIT | 193 | Cần review |
| Tables thiếu indexes | 15+ | Cần thêm |
| Security vulnerabilities | 9 | 3 HIGH, 6 MODERATE |
| Dependencies có lỗ hổng | 4 | Cần update |

---

## 2. Phân tích Slow Queries

### 2.1 Queries Không Có LIMIT (Critical)

Phát hiện **193 queries** không có LIMIT clause, có thể gây ra performance issues khi dữ liệu lớn.

#### Các file có nhiều queries cần tối ưu:

| File | Số queries | Ưu tiên |
|------|------------|---------|
| server/db.ts | 89 | CAO |
| server/routers.ts | 42 | CAO |
| server/settingsExportService.ts | 25 | TRUNG BÌNH |
| server/routers-extended.ts | 12 | TRUNG BÌNH |
| server/backupService.ts | 10 | TRUNG BÌNH |

#### Top 10 Queries Cần Tối Ưu Ngay:

```typescript
// 1. server/db.ts:284 - Lấy tất cả users
return await db.select().from(users);
// FIX: Thêm pagination
return await db.select().from(users).limit(100).offset(page * 100);

// 2. server/db.ts:725 - Lấy tất cả production lines
return await db.select().from(productionLines).where(eq(productionLines.isActive, 1));
// FIX: Thêm limit hoặc cache

// 3. server/db.ts:1172 - Lấy tất cả products
return await db.select().from(products).where(eq(products.isActive, 1));
// FIX: Thêm pagination

// 4. server/db.ts:1491 - Lấy tất cả permissions
return await db.select().from(permissions).orderBy(permissions.module);
// FIX: Cache kết quả (permissions ít thay đổi)

// 5. server/db.ts:1683 - Lấy tất cả workstations
return await db.select().from(workstations).orderBy(workstations.productionLineId);
// FIX: Thêm limit

// 6. server/db.ts:1690 - Lấy tất cả machines
return await db.select().from(machines).orderBy(machines.workstationId);
// FIX: Thêm limit

// 7. server/routers.ts:4555 - Lấy tất cả licenses
const allLicenses = await db.select().from(licenses);
// FIX: Thêm pagination cho dashboard

// 8. server/settingsExportService.ts:136-146 - Export nhiều bảng
exportData.sections.products = await db.select().from(products);
// FIX: Stream data thay vì load tất cả vào memory

// 9. server/licenseServerDb.ts:697-699 - Lấy tất cả licenses, activations, customers
const licenses = await db.select().from(licenseServerLicenses);
const activations = await db.select().from(licenseServerActivations);
// FIX: Chỉ lấy data cần thiết với filters

// 10. server/routers.ts:6284-6285 - Lấy tất cả machine statuses
const statuses = await db.select().from(machineOnlineStatus);
const machineList = await db.select().from(machines);
// FIX: Join query thay vì 2 queries riêng
```

### 2.2 Tables Cần Thêm Indexes

Dựa trên phân tích queries, các bảng sau cần thêm indexes:

| Table | Columns cần index | Lý do |
|-------|-------------------|-------|
| spc_analysis_history | mappingId, createdAt | Queries thường xuyên filter theo mapping và sort theo time |
| audit_logs | userId, createdAt, action | Queries filter theo user và time range |
| work_orders | machineId, status, createdAt | Queries filter theo machine và status |
| login_history | userId, createdAt | Queries filter theo user và time |
| spc_realtime_data | planId, sampledAt | Queries filter theo plan và sort theo time |
| spc_summary_stats | planId, periodStart, periodType | Queries filter theo plan và period |
| licenses | licenseStatus, expiryDate | Queries filter theo status và expiry |
| webhooks | isActive, createdAt | Queries filter theo active status |
| machine_online_status | machineId | Queries lookup theo machine |
| realtime_alerts | acknowledgedAt, createdAt | Queries filter unacknowledged alerts |
| spare_parts_inventory | sparePartId | Queries lookup inventory |
| oee_records | machineId, recordDate | Queries filter theo machine và date |
| defect_records | productId, createdAt | Queries filter theo product và time |
| email_notification_settings | notifyOnSpcViolation | Queries filter theo notification type |
| validation_rule_logs | ruleId, executedAt | Queries filter theo rule và time |

### 2.3 Script Tạo Indexes

```sql
-- spc_analysis_history indexes
CREATE INDEX idx_spc_history_mapping ON spc_analysis_history(mappingId);
CREATE INDEX idx_spc_history_created ON spc_analysis_history(createdAt);
CREATE INDEX idx_spc_history_mapping_created ON spc_analysis_history(mappingId, createdAt DESC);

-- audit_logs indexes
CREATE INDEX idx_audit_user ON audit_logs(userId);
CREATE INDEX idx_audit_created ON audit_logs(createdAt);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_user_created ON audit_logs(userId, createdAt DESC);

-- work_orders indexes
CREATE INDEX idx_workorder_machine ON work_orders(machineId);
CREATE INDEX idx_workorder_status ON work_orders(status);
CREATE INDEX idx_workorder_created ON work_orders(createdAt);
CREATE INDEX idx_workorder_machine_status ON work_orders(machineId, status);

-- login_history indexes
CREATE INDEX idx_login_user ON login_history(userId);
CREATE INDEX idx_login_created ON login_history(createdAt);
CREATE INDEX idx_login_user_created ON login_history(userId, createdAt DESC);

-- spc_realtime_data indexes
CREATE INDEX idx_realtime_plan ON spc_realtime_data(planId);
CREATE INDEX idx_realtime_sampled ON spc_realtime_data(sampledAt);
CREATE INDEX idx_realtime_plan_sampled ON spc_realtime_data(planId, sampledAt DESC);

-- spc_summary_stats indexes
CREATE INDEX idx_summary_plan ON spc_summary_stats(planId);
CREATE INDEX idx_summary_period ON spc_summary_stats(periodStart);
CREATE INDEX idx_summary_plan_period ON spc_summary_stats(planId, periodStart DESC);

-- licenses indexes
CREATE INDEX idx_license_status ON licenses(licenseStatus);
CREATE INDEX idx_license_expiry ON licenses(expiryDate);
CREATE INDEX idx_license_status_expiry ON licenses(licenseStatus, expiryDate);

-- machine_online_status indexes
CREATE INDEX idx_machine_status_machine ON machine_online_status(machineId);

-- realtime_alerts indexes
CREATE INDEX idx_alerts_ack ON realtime_alerts(acknowledgedAt);
CREATE INDEX idx_alerts_created ON realtime_alerts(createdAt);

-- spare_parts_inventory indexes
CREATE INDEX idx_inventory_part ON spare_parts_inventory(sparePartId);

-- oee_records indexes
CREATE INDEX idx_oee_machine ON oee_records(machineId);
CREATE INDEX idx_oee_date ON oee_records(recordDate);
CREATE INDEX idx_oee_machine_date ON oee_records(machineId, recordDate DESC);
```

---

## 3. Security Audit Results

### 3.1 Vulnerabilities Summary

Phát hiện **9 vulnerabilities** từ npm audit:

| Severity | Số lượng | Package |
|----------|----------|---------|
| HIGH | 3 | @trpc/server, mdast-util-to-hast |
| MODERATE | 6 | Various markdown packages |

### 3.2 Chi tiết Vulnerabilities

#### HIGH Severity

**1. @trpc/server - Prototype Pollution (CVE-2025-68130)**

| Thông tin | Chi tiết |
|-----------|----------|
| Package | @trpc/server |
| Phiên bản bị ảnh hưởng | >=11.0.0 <11.8.0 |
| Phiên bản fix | >=11.8.0 |
| Mức độ | HIGH |
| Loại lỗ hổng | Prototype Pollution |

**Mô tả:** Hàm `formDataToObject` trong tRPC không validate các keys nguy hiểm như `__proto__`, `constructor`, cho phép attacker thực hiện prototype pollution attack.

**Impact:**
- Authorization bypass
- Denial of Service
- Remote Code Execution (trong một số trường hợp)

**Fix:**
```bash
pnpm update @trpc/server@^11.8.0
```

**2. mdast-util-to-hast - Cross-Site Scripting (XSS)**

| Thông tin | Chi tiết |
|-----------|----------|
| Package | mdast-util-to-hast |
| Phiên bản bị ảnh hưởng | <13.2.1 |
| Phiên bản fix | >=13.2.1 |
| Mức độ | HIGH |
| Loại lỗ hổng | XSS |

**Mô tả:** Package xử lý markdown có thể bị XSS attack thông qua malicious markdown content.

**Fix:**
```bash
pnpm update streamdown@latest
# hoặc
pnpm update mdast-util-to-hast@^13.2.1
```

#### MODERATE Severity

| Package | Vulnerability | Fix |
|---------|---------------|-----|
| react-markdown | Dependency vulnerability | Update streamdown |
| remark-rehype | Dependency vulnerability | Update streamdown |
| rehype-raw | Dependency vulnerability | Update streamdown |
| hast-util-raw | Dependency vulnerability | Update streamdown |

### 3.3 Commands để Fix

```bash
# Fix tất cả vulnerabilities
cd /home/ubuntu/cpk-spc-calculator

# 1. Update @trpc/server (CRITICAL)
pnpm update @trpc/server@^11.8.0

# 2. Update markdown packages
pnpm update streamdown@latest

# 3. Verify fixes
pnpm audit

# 4. Run tests sau khi update
pnpm test
```

---

## 4. Recommendations

### 4.1 Immediate Actions (Tuần này)

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| P0 | Update @trpc/server to 11.8.0 | 1h | Fix critical security vulnerability |
| P0 | Update markdown packages | 1h | Fix XSS vulnerabilities |
| P1 | Thêm indexes cho spc_analysis_history | 2h | Improve query performance 50%+ |
| P1 | Thêm indexes cho audit_logs | 1h | Improve audit queries |
| P1 | Thêm pagination cho getAllUsers | 2h | Prevent memory issues |

### 4.2 Short-term Actions (2 tuần)

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| P2 | Implement query result caching | 8h | Reduce database load 30% |
| P2 | Add cursor-based pagination | 8h | Better UX for large datasets |
| P2 | Optimize settingsExportService | 4h | Prevent timeout on export |
| P2 | Add connection pooling monitoring | 4h | Better visibility |

### 4.3 Long-term Actions (1 tháng)

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| P3 | Implement read replicas | 16h | Scale read operations |
| P3 | Add query performance monitoring | 8h | Proactive optimization |
| P3 | Implement data archiving | 16h | Keep tables small |

---

## 5. Performance Metrics to Track

### 5.1 Query Performance

| Metric | Current | Target |
|--------|---------|--------|
| Avg query time | Unknown | <50ms |
| P95 query time | Unknown | <200ms |
| Queries without index | 193 | 0 |
| Full table scans | Unknown | <5% |

### 5.2 Security Metrics

| Metric | Current | Target |
|--------|---------|--------|
| High vulnerabilities | 3 | 0 |
| Moderate vulnerabilities | 6 | 0 |
| Outdated dependencies | 4 | 0 |

---

## 6. Kết luận

Audit phát hiện các vấn đề chính cần xử lý:

1. **Security (CRITICAL):** 3 vulnerabilities HIGH cần fix ngay, đặc biệt là @trpc/server prototype pollution
2. **Performance:** 193 queries không có LIMIT, cần thêm pagination và indexes
3. **Scalability:** Nhiều queries load toàn bộ data, cần refactor cho large datasets

**Next Steps:**
1. Fix security vulnerabilities ngay (1-2 giờ)
2. Thêm indexes cho top 5 tables (4 giờ)
3. Implement pagination cho critical endpoints (8 giờ)

---

*Báo cáo này được tạo bởi Manus AI vào ngày 22/12/2024.*
