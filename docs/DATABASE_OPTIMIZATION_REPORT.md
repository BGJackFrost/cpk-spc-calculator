# Database Optimization Report - Phase 1

## Overview

This document outlines the database optimization measures implemented in Phase 1 of the system upgrade plan.

## 1. Database Indexes Added

### SPC Analysis History Table
| Index Name | Columns | Purpose |
|------------|---------|---------|
| idx_spc_analysis_history_product_code | productCode | Filter by product |
| idx_spc_analysis_history_station_name | stationName | Filter by station |
| idx_spc_analysis_history_created_at | createdAt | Time-based queries |
| idx_spc_analysis_history_cpk | cpk | CPK threshold queries |
| idx_spc_analysis_history_mapping | mappingId | Join with mappings |
| idx_spc_analysis_history_composite | productCode, stationName, createdAt | Combined filters |

### SPC Sampling Plans Table
| Index Name | Columns | Purpose |
|------------|---------|---------|
| idx_spc_sampling_plans_status | status | Filter active plans |
| idx_spc_sampling_plans_production_line | productionLineId | Filter by line |
| idx_spc_sampling_plans_product | productId | Filter by product |
| idx_spc_sampling_plans_active | isActive | Active status filter |

### Audit Logs Table
| Index Name | Columns | Purpose |
|------------|---------|---------|
| idx_audit_logs_user | userId | User activity queries |
| idx_audit_logs_action | action | Action type filters |
| idx_audit_logs_created_at | createdAt | Time-based queries |
| idx_audit_logs_entity | entityType, entityId | Entity lookups |

### Other Tables
- **machines**: workstationId, machineTypeId, isActive
- **fixtures**: machineId, isActive
- **products**: code, isActive
- **workstations**: productionLineId, isActive
- **production_lines**: isActive
- **spc_realtime_data**: planId, machineId, timestamp, composite
- **spc_defect_records**: categoryId, productionLineId, createdAt, status
- **user_quick_access**: user_id, user_id+sort_order
- **login_history**: userId, createdAt, eventType
- **product_specifications**: productId, workstationId
- **product_station_mappings**: productCode, stationName, isActive

## 2. Caching Layer Enhancements

### Cache Key Structure
```typescript
cacheKeys = {
  // Master data (TTL: 5 minutes)
  products, productById, workstations, machines, machineTypes,
  fixtures, productionLines, specifications, mappings
  
  // SPC data (TTL: 30 seconds)
  spcPlans, spcPlanById, analysisHistory, realtimeData, summaryStats
  
  // Dashboard (TTL: 1 minute)
  dashboardStats, dashboardConfig
  
  // Quick Access, Rules, Defects
  quickAccess, spcRules, caRules, cpkRules, defectCategories, defectStats
}
```

### TTL Configuration
| Category | TTL | Use Case |
|----------|-----|----------|
| SHORT | 30 seconds | Real-time data, frequently changing |
| MEDIUM | 1 minute | Dashboard stats, user configs |
| LONG | 5 minutes | Master data (products, machines) |
| VERY_LONG | 30 minutes | Rarely changing configs |

### Cache Invalidation Patterns
```typescript
invalidationPatterns = {
  products: ['products:'],
  workstations: ['workstations:'],
  machines: ['machines:'],
  productionLines: ['productionLines:', 'spcPlans:line:'],
  spcPlans: ['spcPlans:', 'realtimeData:', 'summaryStats:'],
  analysisHistory: ['analysisHistory:'],
  rules: ['spcRules:', 'caRules:', 'cpkRules:'],
  defects: ['defectCategories:', 'defectStats:'],
  quickAccess: ['quickAccess:'],
  dashboard: ['dashboard:']
}
```

## 3. Connection Pool Configuration

```typescript
poolConfig = {
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 30000,
  idleTimeout: 60000,
}
```

## 4. Expected Performance Improvements

### Query Performance
| Query Type | Before | After (Estimated) |
|------------|--------|-------------------|
| SPC Analysis by product/station | Full scan | Index seek |
| Audit logs by user | Full scan | Index seek |
| Active SPC plans | Full scan | Index seek |
| Recent defect records | Full scan | Index seek |

### Cache Hit Rates (Expected)
| Data Type | Expected Hit Rate |
|-----------|-------------------|
| Master data | 80-90% |
| Dashboard stats | 70-80% |
| SPC plans | 60-70% |
| Real-time data | 40-50% |

## 5. How to Run Migration

```bash
# Run index migration
cd /home/ubuntu/cpk-spc-calculator
node server/run-index-migration.mjs
```

## 6. Monitoring

### Cache Statistics
Access cache stats via API:
```typescript
import { getCacheStats } from './cache';
const stats = getCacheStats();
// { size: number, keys: string[] }
```

### Index Usage
Monitor index usage with MySQL:
```sql
SHOW INDEX FROM spc_analysis_history;
EXPLAIN SELECT * FROM spc_analysis_history WHERE productCode = 'XXX';
```

## 7. Next Steps (Phase 2)

1. Query optimization for complex JOINs
2. Implement query result pagination
3. Add query execution time logging
4. Consider Redis for distributed caching
5. Database connection health monitoring

---
*Generated: December 2024*
*Version: 1.0*
