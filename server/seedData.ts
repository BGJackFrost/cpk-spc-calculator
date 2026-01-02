/**
 * Seed Data Script for SPC/CPK Calculator
 * This script creates sample data for testing the system
 */

import { getDb } from "./db";
import {
  databaseConnections,
  products,
  productionLines,
  workstations,
  machines,
  productSpecifications,
  productStationMappings,
  samplingConfigs,
  spcRulesConfig,
  permissions,
  rolePermissions,
  predictiveAlertThresholds,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Default permissions for the system
const DEFAULT_PERMISSIONS = [
  { code: "dashboard.view", name: "Xem Dashboard", description: "Xem trang Dashboard", module: "dashboard" },
  { code: "dashboard.config", name: "Cấu hình Dashboard", description: "Cấu hình hiển thị Dashboard", module: "dashboard" },
  { code: "analyze.view", name: "Xem Phân tích", description: "Xem trang Phân tích SPC/CPK", module: "analyze" },
  { code: "analyze.execute", name: "Thực hiện Phân tích", description: "Thực hiện phân tích SPC/CPK", module: "analyze" },
  { code: "analyze.export", name: "Xuất báo cáo", description: "Xuất báo cáo PDF/Excel", module: "analyze" },
  { code: "history.view", name: "Xem Lịch sử", description: "Xem lịch sử phân tích", module: "history" },
  { code: "mapping.view", name: "Xem Mapping", description: "Xem cấu hình mapping", module: "mapping" },
  { code: "mapping.manage", name: "Quản lý Mapping", description: "Tạo/sửa/xóa mapping", module: "mapping" },
  { code: "product.view", name: "Xem Sản phẩm", description: "Xem danh sách sản phẩm", module: "product" },
  { code: "product.manage", name: "Quản lý Sản phẩm", description: "Tạo/sửa/xóa sản phẩm", module: "product" },
  { code: "specification.view", name: "Xem Tiêu chuẩn", description: "Xem tiêu chuẩn USL/LSL", module: "specification" },
  { code: "specification.manage", name: "Quản lý Tiêu chuẩn", description: "Tạo/sửa/xóa tiêu chuẩn", module: "specification" },
  { code: "production_line.view", name: "Xem Dây chuyền", description: "Xem dây chuyền sản xuất", module: "production_line" },
  { code: "production_line.manage", name: "Quản lý Dây chuyền", description: "Tạo/sửa/xóa dây chuyền", module: "production_line" },
  { code: "sampling.view", name: "Xem Lấy mẫu", description: "Xem phương pháp lấy mẫu", module: "sampling" },
  { code: "sampling.manage", name: "Quản lý Lấy mẫu", description: "Tạo/sửa/xóa phương pháp lấy mẫu", module: "sampling" },
  { code: "spc_plan.view", name: "Xem Kế hoạch SPC", description: "Xem kế hoạch lấy mẫu SPC", module: "spc_plan" },
  { code: "spc_plan.manage", name: "Quản lý Kế hoạch SPC", description: "Tạo/sửa/xóa kế hoạch SPC", module: "spc_plan" },
  { code: "notification.view", name: "Xem Thông báo", description: "Xem cấu hình thông báo", module: "notification" },
  { code: "notification.manage", name: "Quản lý Thông báo", description: "Cấu hình thông báo email", module: "notification" },
  { code: "user.view", name: "Xem Người dùng", description: "Xem danh sách người dùng", module: "user" },
  { code: "user.manage", name: "Quản lý Người dùng", description: "Quản lý người dùng", module: "user" },
  { code: "permission.view", name: "Xem Phân quyền", description: "Xem cấu hình phân quyền", module: "permission" },
  { code: "permission.manage", name: "Quản lý Phân quyền", description: "Cấu hình phân quyền", module: "permission" },
  { code: "settings.view", name: "Xem Cài đặt", description: "Xem cài đặt hệ thống", module: "settings" },
  { code: "settings.manage", name: "Quản lý Cài đặt", description: "Cấu hình cài đặt hệ thống", module: "settings" },
];

// Role permission mappings
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: DEFAULT_PERMISSIONS.map(p => p.code), // Admin has all permissions
  operator: [
    "dashboard.view", "dashboard.config",
    "analyze.view", "analyze.execute", "analyze.export",
    "history.view",
    "mapping.view",
    "product.view",
    "specification.view",
    "production_line.view",
    "sampling.view",
    "spc_plan.view",
    "notification.view", "notification.manage",
  ],
  viewer: [
    "dashboard.view",
    "analyze.view",
    "history.view",
    "mapping.view",
    "product.view",
    "specification.view",
    "production_line.view",
    "sampling.view",
    "spc_plan.view",
  ],
  user: [
    "dashboard.view",
    "analyze.view",
    "history.view",
  ],
};

// Sample database connection (demo - not real)
const SAMPLE_DATABASE_CONNECTIONS = [
  {
    name: "MachineDatabase Demo",
    connectionString: "mysql://demo:demo123@localhost:3306/machine_db",
    databaseType: "mysql",
    description: "Demo database connection for testing",
    isActive: 1,
    createdBy: 1,
  },
];

// Sample products
const SAMPLE_PRODUCTS = [
  { code: "PCB-001", name: "PCB Board Type A", description: "Main circuit board for electronic devices", category: "PCB", createdBy: 1 },
  { code: "PCB-002", name: "PCB Board Type B", description: "Secondary circuit board", category: "PCB", createdBy: 1 },
  { code: "IC-001", name: "IC Chip 8-bit", description: "8-bit integrated circuit", category: "IC", createdBy: 1 },
  { code: "IC-002", name: "IC Chip 16-bit", description: "16-bit integrated circuit", category: "IC", createdBy: 1 },
  { code: "CAP-001", name: "Capacitor 100uF", description: "Electrolytic capacitor 100uF", category: "Capacitor", createdBy: 1 },
  { code: "RES-001", name: "Resistor 10K", description: "Carbon film resistor 10K ohm", category: "Resistor", createdBy: 1 },
];

// Sample production lines
const SAMPLE_PRODUCTION_LINES = [
  { name: "SMT Line 1", code: "SMT-L1", description: "Surface Mount Technology Line 1", location: "Building A, Floor 1", isActive: 1, createdBy: 1 },
  { name: "SMT Line 2", code: "SMT-L2", description: "Surface Mount Technology Line 2", location: "Building A, Floor 1", isActive: 1, createdBy: 1 },
  { name: "THT Line 1", code: "THT-L1", description: "Through Hole Technology Line 1", location: "Building A, Floor 2", isActive: 1, createdBy: 1 },
  { name: "Assembly Line 1", code: "ASM-L1", description: "Final Assembly Line 1", location: "Building B, Floor 1", isActive: 1, createdBy: 1 },
];

// Sample workstations
const SAMPLE_WORKSTATIONS = [
  { name: "Solder Paste Printing", code: "SPP-01", description: "Solder paste printing station", sequence: 1 },
  { name: "Pick and Place", code: "PNP-01", description: "Component placement station", sequence: 2 },
  { name: "Reflow Oven", code: "RFO-01", description: "Reflow soldering oven", sequence: 3 },
  { name: "AOI Inspection", code: "AOI-01", description: "Automated Optical Inspection", sequence: 4 },
  { name: "ICT Testing", code: "ICT-01", description: "In-Circuit Testing station", sequence: 5 },
  { name: "FCT Testing", code: "FCT-01", description: "Functional Circuit Testing", sequence: 6 },
];

// Sample product specifications (USL/LSL)
const SAMPLE_SPECIFICATIONS = [
  { productCode: "PCB-001", stationCode: "AOI-01", parameterName: "Solder Joint Height", usl: 0.5, lsl: 0.1, target: 0.3, unit: "mm" },
  { productCode: "PCB-001", stationCode: "AOI-01", parameterName: "Component Offset", usl: 0.2, lsl: -0.2, target: 0, unit: "mm" },
  { productCode: "PCB-001", stationCode: "ICT-01", parameterName: "Resistance", usl: 10.5, lsl: 9.5, target: 10, unit: "kOhm" },
  { productCode: "PCB-001", stationCode: "FCT-01", parameterName: "Voltage Output", usl: 5.25, lsl: 4.75, target: 5.0, unit: "V" },
  { productCode: "IC-001", stationCode: "ICT-01", parameterName: "Current Draw", usl: 105, lsl: 95, target: 100, unit: "mA" },
  { productCode: "IC-001", stationCode: "FCT-01", parameterName: "Clock Speed", usl: 8.1, lsl: 7.9, target: 8.0, unit: "MHz" },
];

// Sample sampling configs
const SAMPLE_SAMPLING_CONFIGS = [
  { name: "Hourly Sampling", timeUnit: "hour" as const, sampleSize: 5, intervalValue: 1, intervalUnit: "hour" as const, subgroupSize: 5 },
  { name: "30-min Sampling", timeUnit: "minute" as const, sampleSize: 5, intervalValue: 30, intervalUnit: "minute" as const, subgroupSize: 5 },
  { name: "Daily Sampling", timeUnit: "day" as const, sampleSize: 25, intervalValue: 1, intervalUnit: "day" as const, subgroupSize: 5 },
  { name: "Shift Sampling", timeUnit: "hour" as const, sampleSize: 10, intervalValue: 8, intervalUnit: "hour" as const, subgroupSize: 5 },
];

// Sample product-station mappings
const SAMPLE_MAPPINGS = [
  {
    productCode: "PCB-001",
    stationName: "Solder Paste Printing",
    connectionId: 1,
    tableName: "solder_paste_data",
    productCodeColumn: "product_code",
    stationColumn: "station",
    valueColumn: "thickness",
    timestampColumn: "measured_at",
    usl: 150,
    lsl: 100,
    target: 125,
    isActive: 1,
    createdBy: 1,
  },
  {
    productCode: "PCB-001",
    stationName: "AOI Inspection",
    connectionId: 1,
    tableName: "aoi_inspection_data",
    productCodeColumn: "product_code",
    stationColumn: "station",
    valueColumn: "defect_count",
    timestampColumn: "inspected_at",
    usl: 5,
    lsl: 0,
    target: 0,
    isActive: 1,
    createdBy: 1,
  },
  {
    productCode: "PCB-001",
    stationName: "Reflow Oven",
    connectionId: 1,
    tableName: "reflow_temperature_data",
    productCodeColumn: "product_code",
    stationColumn: "station",
    valueColumn: "peak_temp",
    timestampColumn: "recorded_at",
    usl: 260,
    lsl: 230,
    target: 245,
    isActive: 1,
    createdBy: 1,
  },
  {
    productCode: "IC-001",
    stationName: "ICT Testing",
    connectionId: 1,
    tableName: "ict_test_data",
    productCodeColumn: "product_code",
    stationColumn: "station",
    valueColumn: "test_value",
    timestampColumn: "tested_at",
    usl: 105,
    lsl: 95,
    target: 100,
    isActive: 1,
    createdBy: 1,
  },
  {
    productCode: "IC-001",
    stationName: "FCT Testing",
    connectionId: 1,
    tableName: "fct_test_data",
    productCodeColumn: "product_code",
    stationColumn: "station",
    valueColumn: "output_voltage",
    timestampColumn: "tested_at",
    usl: 525,
    lsl: 475,
    target: 500,
    isActive: 1,
    createdBy: 1,
  },
];

// Sample SPC rules config
const SAMPLE_SPC_RULES = {
  rule1Enabled: true, rule1Sigma: 3,
  rule2Enabled: true, rule2Points: 9, rule2Side: "same" as const,
  rule3Enabled: true, rule3Points: 6, rule3Direction: "increasing" as const,
  rule4Enabled: true, rule4Points: 14, rule4Pattern: "alternating" as const,
  rule5Enabled: true, rule5Points: 2, rule5Sigma: 2,
  rule6Enabled: true, rule6Points: 4, rule6Sigma: 1,
  rule7Enabled: true, rule7Points: 15, rule7Sigma: 1,
  rule8Enabled: true, rule8Points: 8, rule8Sigma: 1,
};

// Sample Predictive Alert Thresholds
const SAMPLE_PREDICTIVE_THRESHOLDS = [
  {
    name: "Ngưỡng cảnh báo OEE Dây chuyền PCB",
    description: "Cảnh báo khi OEE dự báo giảm dưới ngưỡng cho dây chuyền PCB Assembly",
    productionLineId: null, // Will be set to first production line
    predictionType: "oee" as const,
    oeeWarningThreshold: "75.00",
    oeeCriticalThreshold: "65.00",
    oeeDeclineThreshold: "5.00",
    defectWarningThreshold: "3.00",
    defectCriticalThreshold: "5.00",
    defectIncreaseThreshold: "20.00",
    autoAdjustEnabled: 1,
    autoAdjustSensitivity: "medium" as const,
    autoAdjustPeriodDays: 30,
    emailAlertEnabled: 1,
    alertEmails: "admin@example.com",
    alertFrequency: "immediate" as const,
    isActive: 1,
  },
  {
    name: "Ngưỡng cảnh báo Defect Rate Dây chuyền IC",
    description: "Cảnh báo khi tỷ lệ lỗi dự báo tăng cao cho dây chuyền IC Testing",
    productionLineId: null, // Will be set to second production line
    predictionType: "defect_rate" as const,
    oeeWarningThreshold: "75.00",
    oeeCriticalThreshold: "65.00",
    oeeDeclineThreshold: "5.00",
    defectWarningThreshold: "2.50",
    defectCriticalThreshold: "4.00",
    defectIncreaseThreshold: "15.00",
    autoAdjustEnabled: 0,
    autoAdjustSensitivity: "low" as const,
    autoAdjustPeriodDays: 60,
    emailAlertEnabled: 1,
    alertEmails: "quality@example.com,supervisor@example.com",
    alertFrequency: "hourly" as const,
    isActive: 1,
  },
  {
    name: "Ngưỡng cảnh báo tổng hợp (OEE + Defect)",
    description: "Cảnh báo tổng hợp cả OEE và tỷ lệ lỗi cho tất cả dây chuyền",
    productionLineId: null,
    predictionType: "both" as const,
    oeeWarningThreshold: "70.00",
    oeeCriticalThreshold: "60.00",
    oeeDeclineThreshold: "8.00",
    defectWarningThreshold: "3.50",
    defectCriticalThreshold: "6.00",
    defectIncreaseThreshold: "25.00",
    autoAdjustEnabled: 1,
    autoAdjustSensitivity: "high" as const,
    autoAdjustPeriodDays: 14,
    emailAlertEnabled: 1,
    alertEmails: "manager@example.com",
    alertFrequency: "daily" as const,
    isActive: 1,
  },
];

/**
 * Initialize default permissions
 */
export async function initializePermissions(): Promise<{ created: number; skipped: number }> {
  const db = await getDb();
  if (!db) {
    console.warn("[Seed] Database not available");
    return { created: 0, skipped: 0 };
  }

  let created = 0;
  let skipped = 0;

  // Create permissions
  for (const perm of DEFAULT_PERMISSIONS) {
    const existing = await db.select().from(permissions).where(eq(permissions.code, perm.code)).limit(1);
    if (existing.length === 0) {
      await db.insert(permissions).values(perm);
      created++;
    } else {
      skipped++;
    }
  }

  // Create role permissions
  const allPerms = await db.select().from(permissions);
  const permCodeToId = new Map(allPerms.map(p => [p.code, p.id]));

  for (const [role, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
    for (const code of permCodes) {
      const permId = permCodeToId.get(code);
      if (permId) {
        const existing = await db.select().from(rolePermissions)
          .where(eq(rolePermissions.role, role as any))
          .limit(1);
        
        // Simple check - in production would need more sophisticated logic
        if (existing.length === 0 || !existing.some(e => e.permissionId === permId)) {
          try {
            await db.insert(rolePermissions).values({
              role: role as any,
              permissionId: permId,
            });
          } catch (e) {
            // Ignore duplicate key errors
          }
        }
      }
    }
  }

  console.log(`[Seed] Permissions initialized: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

/**
 * Seed sample data for testing
 */
export async function seedSampleData(): Promise<{
  connections: number;
  products: number;
  productionLines: number;
  workstations: number;
  specifications: number;
  samplingConfigs: number;
  mappings: number;
  predictiveThresholds: number;
}> {
  const db = await getDb();
  if (!db) {
    console.warn("[Seed] Database not available");
    return { connections: 0, products: 0, productionLines: 0, workstations: 0, specifications: 0, samplingConfigs: 0, mappings: 0 };
  }

  const result = {
    connections: 0,
    products: 0,
    productionLines: 0,
    workstations: 0,
    specifications: 0,
    samplingConfigs: 0,
    mappings: 0,
    predictiveThresholds: 0,
  };

  // Seed database connections
  for (const conn of SAMPLE_DATABASE_CONNECTIONS) {
    const existing = await db.select().from(databaseConnections).where(eq(databaseConnections.name, conn.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(databaseConnections).values(conn);
      result.connections++;
    }
  }

  // Seed products
  for (const prod of SAMPLE_PRODUCTS) {
    const existing = await db.select().from(products).where(eq(products.code, prod.code)).limit(1);
    if (existing.length === 0) {
      await db.insert(products).values(prod);
      result.products++;
    }
  }

  // Seed production lines
  const lineIds: number[] = [];
  for (const line of SAMPLE_PRODUCTION_LINES) {
    const existing = await db.select().from(productionLines).where(eq(productionLines.code, line.code)).limit(1);
    if (existing.length === 0) {
      const insertResult = await db.insert(productionLines).values(line);
      lineIds.push(insertResult[0].insertId);
      result.productionLines++;
    } else {
      lineIds.push(existing[0].id);
    }
  }

  // Seed workstations for first production line
  if (lineIds.length > 0) {
    for (const ws of SAMPLE_WORKSTATIONS) {
      const existing = await db.select().from(workstations).where(eq(workstations.code, ws.code)).limit(1);
      if (existing.length === 0) {
        await db.insert(workstations).values({
          ...ws,
          productionLineId: lineIds[0],
          isActive: 1,
        });
        result.workstations++;
      }
    }
  }

  // Seed sampling configs
  for (const config of SAMPLE_SAMPLING_CONFIGS) {
    const existing = await db.select().from(samplingConfigs).where(eq(samplingConfigs.name, config.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(samplingConfigs).values({
        ...config,
        isActive: 1,
      });
      result.samplingConfigs++;
    }
  }

  // Seed product-station mappings
  for (const mapping of SAMPLE_MAPPINGS) {
    const existing = await db.select().from(productStationMappings)
      .where(eq(productStationMappings.productCode, mapping.productCode))
      .limit(1);
    
    // Check if this exact mapping exists
    const exactMatch = existing.find(e => 
      e.productCode === mapping.productCode && 
      e.stationName === mapping.stationName
    );
    
    if (!exactMatch) {
      await db.insert(productStationMappings).values(mapping);
      result.mappings++;
    }
  }

  // Seed predictive alert thresholds
  for (let i = 0; i < SAMPLE_PREDICTIVE_THRESHOLDS.length; i++) {
    const threshold = SAMPLE_PREDICTIVE_THRESHOLDS[i];
    const existing = await db.select().from(predictiveAlertThresholds)
      .where(eq(predictiveAlertThresholds.name, threshold.name))
      .limit(1);
    
    if (existing.length === 0) {
      // Assign production line ID if available
      const productionLineId = lineIds[i] || null;
      await db.insert(predictiveAlertThresholds).values({
        ...threshold,
        productionLineId,
      });
      result.predictiveThresholds++;
    }
  }

  console.log(`[Seed] Sample data created:`, result);
  return result;
}

/**
 * Run all seed operations
 */
export async function runAllSeeds(): Promise<void> {
  console.log("[Seed] Starting seed operations...");
  
  await initializePermissions();
  await seedSampleData();
  
  console.log("[Seed] All seed operations completed");
}
