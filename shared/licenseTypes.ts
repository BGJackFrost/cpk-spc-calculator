// License System Types
// Định nghĩa các hệ thống và chức năng có thể cấp phép

export const LICENSED_SYSTEMS = {
  spc: {
    id: "spc",
    name: "SPC/CPK",
    nameEn: "SPC/CPK",
    description: "Kiểm soát quy trình thống kê",
    descriptionEn: "Statistical Process Control",
    color: "#3b82f6", // blue-500
  },
  mms: {
    id: "mms",
    name: "MMS",
    nameEn: "MMS",
    description: "Hệ thống quản lý bảo trì",
    descriptionEn: "Maintenance Management System",
    color: "#f97316", // orange-500
  },
  production: {
    id: "production",
    name: "Sản xuất",
    nameEn: "Production",
    description: "Quản lý sản xuất & dữ liệu chính",
    descriptionEn: "Production & Master Data",
    color: "#22c55e", // green-500
  },
  license: {
    id: "license",
    name: "License",
    nameEn: "License",
    description: "Quản lý License Server",
    descriptionEn: "License Server Management",
    color: "#a855f7", // purple-500
  },
  system: {
    id: "system",
    name: "Hệ thống",
    nameEn: "System",
    description: "Cấu hình & quản trị hệ thống",
    descriptionEn: "System Configuration & Admin",
    color: "#64748b", // slate-500
  },
} as const;

export type SystemId = keyof typeof LICENSED_SYSTEMS;

// Features per system
export const SYSTEM_FEATURES: Record<SystemId, { id: string; name: string; nameEn: string; description?: string }[]> = {
  spc: [
    { id: "dashboard", name: "Dashboard", nameEn: "Dashboard" },
    { id: "realtime", name: "Realtime Dashboard", nameEn: "Realtime Dashboard" },
    { id: "ai_anomaly", name: "AI Anomaly Detection", nameEn: "AI Anomaly Detection" },
    { id: "multi_analysis", name: "Phân tích Đa đối tượng", nameEn: "Multi-object Analysis" },
    { id: "line_comparison", name: "So sánh Dây chuyền", nameEn: "Line Comparison" },
    { id: "defect_tracking", name: "Theo dõi Lỗi", nameEn: "Defect Tracking" },
    { id: "defect_analysis", name: "Phân tích Lỗi", nameEn: "Defect Analysis" },
    { id: "spc_rules", name: "Cấu hình SPC Rules", nameEn: "SPC Rules Config" },
    { id: "cpk_benchmark", name: "So sánh CPK", nameEn: "CPK Comparison" },
    { id: "shift_analysis", name: "Phân tích theo Ca", nameEn: "Shift Analysis" },
    { id: "advanced_reports", name: "Báo cáo Nâng cao", nameEn: "Advanced Reports" },
  ],
  mms: [
    { id: "oee_dashboard", name: "Dashboard OEE", nameEn: "OEE Dashboard" },
    { id: "unified_dashboard", name: "Dashboard Tổng hợp", nameEn: "Unified Dashboard" },
    { id: "plant_kpi", name: "KPI Nhà máy", nameEn: "Plant KPI" },
    { id: "maintenance_dashboard", name: "Dashboard Bảo trì", nameEn: "Maintenance Dashboard" },
    { id: "maintenance_schedule", name: "Lịch Bảo trì", nameEn: "Maintenance Schedule" },
    { id: "predictive", name: "Bảo trì Dự đoán", nameEn: "Predictive Maintenance" },
    { id: "spare_parts", name: "Quản lý Phụ tùng", nameEn: "Spare Parts Management" },
    { id: "spare_parts_cost", name: "Báo cáo Chi phí", nameEn: "Cost Report" },
    { id: "iot_gateway", name: "IoT Gateway", nameEn: "IoT Gateway" },
    { id: "advanced_analytics", name: "Phân tích Nâng cao", nameEn: "Advanced Analytics" },
  ],
  production: [
    { id: "line_management", name: "Quản lý Dây chuyền", nameEn: "Line Management" },
    { id: "workstation_management", name: "Quản lý Công trạm", nameEn: "Workstation Management" },
    { id: "machine_management", name: "Quản lý Máy móc", nameEn: "Machine Management" },
    { id: "fixture_management", name: "Quản lý Fixture", nameEn: "Fixture Management" },
    { id: "process_management", name: "Quản lý Quy trình", nameEn: "Process Management" },
    { id: "product_management", name: "Quản lý Sản phẩm", nameEn: "Product Management" },
    { id: "measurement_standards", name: "Tiêu chuẩn Đo", nameEn: "Measurement Standards" },
    { id: "mapping_management", name: "Mapping", nameEn: "Mappings" },
    { id: "spc_plans", name: "Kế hoạch SPC", nameEn: "SPC Plans" },
  ],
  license: [
    { id: "license_dashboard", name: "Dashboard License", nameEn: "License Dashboard" },
    { id: "license_management", name: "Quản lý License", nameEn: "License Management" },
    { id: "customer_management", name: "Quản lý Khách hàng", nameEn: "Customer Management" },
    { id: "revenue_reports", name: "Báo cáo Doanh thu", nameEn: "Revenue Reports" },
    { id: "bulk_create", name: "Tạo License Hàng loạt", nameEn: "Bulk License Creation" },
    { id: "server_settings", name: "Cài đặt Server", nameEn: "Server Settings" },
  ],
  system: [
    { id: "user_management", name: "Quản lý Người dùng", nameEn: "User Management" },
    { id: "local_users", name: "Người dùng Local", nameEn: "Local Users" },
    { id: "organization", name: "Cấu trúc Tổ chức", nameEn: "Organization Structure" },
    { id: "permissions", name: "Phân quyền", nameEn: "Permissions" },
    { id: "approval_workflow", name: "Workflow Phê duyệt", nameEn: "Approval Workflow" },
    { id: "settings", name: "Cài đặt", nameEn: "Settings" },
    { id: "database_management", name: "Quản lý Database", nameEn: "Database Management" },
    { id: "backup_restore", name: "Backup & Restore", nameEn: "Backup & Restore" },
    { id: "smtp_config", name: "Cấu hình SMTP", nameEn: "SMTP Config" },
    { id: "webhooks", name: "Webhook", nameEn: "Webhooks" },
    { id: "audit_log", name: "Audit Log", nameEn: "Audit Log" },
  ],
};

// License type presets
export const LICENSE_TYPE_PRESETS: Record<string, { systems: SystemId[]; features: Record<SystemId, string[]> }> = {
  trial: {
    systems: ["spc"],
    features: {
      spc: ["dashboard", "realtime"],
      mms: [],
      production: [],
      license: [],
      system: ["user_management"],
    },
  },
  standard: {
    systems: ["spc", "production"],
    features: {
      spc: ["dashboard", "realtime", "multi_analysis", "defect_tracking", "spc_rules"],
      mms: [],
      production: ["line_management", "machine_management", "product_management", "spc_plans"],
      license: [],
      system: ["user_management", "settings"],
    },
  },
  professional: {
    systems: ["spc", "mms", "production"],
    features: {
      spc: ["dashboard", "realtime", "ai_anomaly", "multi_analysis", "line_comparison", "defect_tracking", "defect_analysis", "spc_rules", "cpk_benchmark", "shift_analysis"],
      mms: ["oee_dashboard", "unified_dashboard", "maintenance_dashboard", "maintenance_schedule", "spare_parts"],
      production: ["line_management", "workstation_management", "machine_management", "fixture_management", "process_management", "product_management", "measurement_standards", "mapping_management", "spc_plans"],
      license: [],
      system: ["user_management", "local_users", "organization", "permissions", "settings", "backup_restore"],
    },
  },
  enterprise: {
    systems: ["spc", "mms", "production", "license", "system"],
    features: {
      spc: ["dashboard", "realtime", "ai_anomaly", "multi_analysis", "line_comparison", "defect_tracking", "defect_analysis", "spc_rules", "cpk_benchmark", "shift_analysis", "advanced_reports"],
      mms: ["oee_dashboard", "unified_dashboard", "plant_kpi", "maintenance_dashboard", "maintenance_schedule", "predictive", "spare_parts", "spare_parts_cost", "iot_gateway", "advanced_analytics"],
      production: ["line_management", "workstation_management", "machine_management", "fixture_management", "process_management", "product_management", "measurement_standards", "mapping_management", "spc_plans"],
      license: ["license_dashboard", "license_management", "customer_management", "revenue_reports", "bulk_create", "server_settings"],
      system: ["user_management", "local_users", "organization", "permissions", "approval_workflow", "settings", "database_management", "backup_restore", "smtp_config", "webhooks", "audit_log"],
    },
  },
};

// Helper functions
export function getSystemsFromLicenseType(licenseType: string): SystemId[] {
  return LICENSE_TYPE_PRESETS[licenseType]?.systems || [];
}

export function getFeaturesFromLicenseType(licenseType: string): Record<SystemId, string[]> {
  return LICENSE_TYPE_PRESETS[licenseType]?.features || {
    spc: [],
    mms: [],
    production: [],
    license: [],
    system: [],
  };
}

export function hasSystemAccess(license: { systems?: string | null }, systemId: SystemId): boolean {
  if (!license.systems) return false;
  try {
    const systems = JSON.parse(license.systems) as string[];
    return systems.includes(systemId);
  } catch {
    return false;
  }
}

export function hasFeatureAccess(license: { systemFeatures?: string | null }, systemId: SystemId, featureId: string): boolean {
  if (!license.systemFeatures) return false;
  try {
    const features = JSON.parse(license.systemFeatures) as Record<string, string[]>;
    return features[systemId]?.includes(featureId) || false;
  } catch {
    return false;
  }
}
