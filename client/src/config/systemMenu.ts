import {
  LayoutDashboard, TrendingUp, History, FileSpreadsheet,
  Settings, Activity, Users, Package, Ruler, Factory, Clock, Calendar,
  Mail, Shield, Server, Database, Wrench, Cog, GitBranch, FileText,
  BarChart3, AlertTriangle, Cpu, GitCompare, ArrowUpDown, Info, BookOpen,
  Layers, Key, Webhook, FileType, FolderClock, UserCog, ChevronRight,
  Gauge, ClipboardList, Building2, ShieldCheck, Boxes, Moon, Sun, Zap,
  Target, HardHat, Hammer, Truck, Brain, Bell, Download, BellRing, Award,
  Thermometer, DollarSign, CreditCard, Receipt, FileCheck, Lock, Unlock,
  Star,
  MessageSquare,
  type LucideIcon
} from "lucide-react";

// System definition
export interface SystemConfig {
  id: string;
  name: string;
  shortName: string;
  icon: LucideIcon;
  color: string;
  description: string;
  licenseKey: string; // Key to check in license
}

// Menu item definition
export interface MenuItem {
  id: string;
  icon: LucideIcon;
  labelKey: string;
  path: string;
  adminOnly?: boolean;
  licenseFeature?: string; // Feature key to check in license
}

// Menu group definition
export interface MenuGroup {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  items: MenuItem[];
  defaultOpen?: boolean;
}

// System menu configuration
export interface SystemMenuConfig {
  system: SystemConfig;
  menuGroups: MenuGroup[];
}

// ===== SYSTEM DEFINITIONS =====
export const SYSTEMS: Record<string, SystemConfig> = {
  DASHBOARD: {
    id: "dashboard",
    name: "Dashboard",
    shortName: "Dashboard",
    icon: LayoutDashboard,
    color: "emerald",
    description: "System Overview & Quick Access",
    licenseKey: "dashboard",
  },
  SPC: {
    id: "spc",
    name: "SPC/CPK System",
    shortName: "SPC/CPK",
    icon: TrendingUp,
    color: "blue",
    description: "Statistical Process Control & Process Capability Analysis",
    licenseKey: "spc_system",
  },
  MMS: {
    id: "mms",
    name: "MMS System",
    shortName: "MMS",
    icon: HardHat,
    color: "orange",
    description: "Maintenance Management System",
    licenseKey: "mms_system",
  },
  PRODUCTION: {
    id: "production",
    name: "Production System",
    shortName: "Production",
    icon: Factory,
    color: "green",
    description: "Production Line & Master Data Management",
    licenseKey: "production_system",
  },
  LICENSE: {
    id: "license",
    name: "License Server",
    shortName: "License",
    icon: Key,
    color: "purple",
    description: "License Management & Distribution",
    licenseKey: "license_server",
  },
  SYSTEM: {
    id: "system",
    name: "System Administration",
    shortName: "System",
    icon: Settings,
    color: "slate",
    description: "System Configuration & Administration",
    licenseKey: "system_admin",
  },
};

// ===== SPC SYSTEM MENU =====
export const SPC_MENU: SystemMenuConfig = {
  system: SYSTEMS.SPC,
  menuGroups: [
    {
      id: "spc-overview",
      labelKey: "menuGroup.spcOverview",
      icon: Gauge,
      defaultOpen: true,
      items: [
        { id: "dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard", path: "/dashboard" },
        { id: "realtime-line", icon: Zap, labelKey: "nav.realtimeLine", path: "/realtime-line", licenseFeature: "spc_realtime" },
        { id: "machine-overview", icon: Cpu, labelKey: "nav.machineOverview", path: "/machine-overview" },
        { id: "machine-status-report", icon: BarChart3, labelKey: "nav.machineStatusReport", path: "/machine-status-report" },
        { id: "spc-visualization", icon: Layers, labelKey: "nav.spcPlanOverview", path: "/spc-visualization" },
        { id: "supervisor-dashboard", icon: Users, labelKey: "nav.supervisorDashboard", path: "/supervisor-dashboard" },
      ],
    },
    {
      id: "spc-analysis",
      labelKey: "menuGroup.spcAnalysis",
      icon: TrendingUp,
      items: [
        { id: "analyze", icon: TrendingUp, labelKey: "nav.analyze", path: "/analyze" },
        { id: "anomaly-detection", icon: Brain, labelKey: "nav.anomalyDetection", path: "/anomaly-detection", licenseFeature: "spc_ai" },
        { id: "multi-analysis", icon: GitCompare, labelKey: "nav.multiObjectAnalysis", path: "/multi-analysis" },
        { id: "line-comparison", icon: ArrowUpDown, labelKey: "nav.lineComparison", path: "/line-comparison" },
        { id: "machine-comparison", icon: GitCompare, labelKey: "nav.machineComparison", path: "/machine-comparison" },
        { id: "history", icon: History, labelKey: "nav.history", path: "/history" },
        { id: "spc-report", icon: BarChart3, labelKey: "nav.spcReport", path: "/spc-report" },
      ],
    },
    {
      id: "spc-quality",
      labelKey: "menuGroup.spcQuality",
      icon: ClipboardList,
      items: [
        { id: "defects", icon: AlertTriangle, labelKey: "nav.defectTracking", path: "/defects" },
        { id: "defect-statistics", icon: BarChart3, labelKey: "nav.defectAnalysis", path: "/defect-statistics" },
        { id: "rules", icon: BookOpen, labelKey: "nav.spcRulesConfig", path: "/rules" },
        { id: "validation-rules", icon: ShieldCheck, labelKey: "nav.customValidation", path: "/validation-rules", adminOnly: true },
        { id: "cpk-comparison", icon: BarChart3, labelKey: "nav.cpkBenchmark", path: "/cpk-comparison" },
        { id: "shift-cpk-comparison", icon: Clock, labelKey: "nav.shiftAnalysis", path: "/shift-cpk-comparison" },
        { id: "shift-manager", icon: Users, labelKey: "nav.shiftManager", path: "/shift-manager" },
        { id: "kpi-alert-thresholds", icon: AlertTriangle, labelKey: "nav.kpiAlertThresholds", path: "/kpi-alert-thresholds", adminOnly: true },
        { id: "kpi-alert-stats", icon: BarChart3, labelKey: "nav.kpiAlertStats", path: "/kpi-alert-stats" },
        { id: "alert-dashboard", icon: BellRing, labelKey: "nav.alertDashboard", path: "/alert-dashboard" },
        { id: "weekly-kpi-trend", icon: TrendingUp, labelKey: "nav.weeklyKpiTrend", path: "/weekly-kpi-trend" },
        { id: "scheduled-kpi-reports", icon: Mail, labelKey: "nav.scheduledKpiReports", path: "/scheduled-kpi-reports", adminOnly: true },
      ],
    },
    {
      id: "spc-realtime",
      labelKey: "menuGroup.spcRealtime",
      icon: Zap,
      items: [
        { id: "realtime-machine-config", icon: Settings, labelKey: "nav.realtimeMachineConfig", path: "/realtime-machine-config", adminOnly: true },
        { id: "realtime-history", icon: History, labelKey: "nav.realtimeHistory", path: "/realtime-history" },
        { id: "alarm-threshold-config", icon: AlertTriangle, labelKey: "nav.alarmThreshold", path: "/alarm-threshold-config", adminOnly: true },
        { id: "iot-realtime-dashboard", icon: Zap, labelKey: "nav.iotRealtimeDashboard", path: "/iot-realtime-dashboard", licenseFeature: "spc_iot" },
      ],
    },
  ],
};

// ===== MMS SYSTEM MENU =====
export const MMS_MENU: SystemMenuConfig = {
  system: SYSTEMS.MMS,
  menuGroups: [
    {
      id: "mms-overview",
      labelKey: "menuGroup.mmsOverview",
      icon: Gauge,
      defaultOpen: true,
      items: [
        { id: "oee-dashboard", icon: Target, labelKey: "nav.oeeDashboard", path: "/oee-dashboard" },
        { id: "unified-dashboard", icon: Gauge, labelKey: "nav.unifiedDashboard", path: "/unified-dashboard" },
        { id: "plant-kpi", icon: BarChart3, labelKey: "nav.plantKpi", path: "/plant-kpi" },
        { id: "advanced-analytics", icon: TrendingUp, labelKey: "nav.advancedAnalytics", path: "/advanced-analytics", licenseFeature: "mms_analytics" },
        { id: "maintenance-dashboard", icon: ClipboardList, labelKey: "nav.maintenanceDashboard", path: "/maintenance-dashboard" },
      ],
    },
    {
      id: "mms-maintenance",
      labelKey: "menuGroup.mmsMaintenance",
      icon: Wrench,
      items: [
        { id: "maintenance-schedule", icon: Calendar, labelKey: "nav.maintenanceSchedule", path: "/maintenance-schedule" },
        { id: "predictive-maintenance", icon: Brain, labelKey: "nav.predictiveMaintenance", path: "/predictive-maintenance", licenseFeature: "mms_predictive" },
        { id: "equipment-qr", icon: Cpu, labelKey: "nav.equipmentQr", path: "/equipment-qr" },
      ],
    },
    {
      id: "mms-spare-parts",
      labelKey: "menuGroup.mmsSpareParts",
      icon: Boxes,
      items: [
        { id: "spare-parts", icon: Boxes, labelKey: "nav.spareParts", path: "/spare-parts" },
        { id: "spare-parts-cost-report", icon: BarChart3, labelKey: "nav.sparePartsCostReport", path: "/spare-parts-cost-report" },
        { id: "spare-parts-guide", icon: BookOpen, labelKey: "nav.sparePartsGuide", path: "/spare-parts-guide" },
        { id: "mms-data-init", icon: Database, labelKey: "nav.mmsDataInit", path: "/mms-data-init", adminOnly: true },
      ],
    },
    {
      id: "mms-config",
      labelKey: "menuGroup.mmsConfig",
      icon: Cog,
      items: [
        { id: "iot-gateway", icon: Cpu, labelKey: "nav.iotGateway", path: "/iot-gateway", adminOnly: true },
        { id: "reports-export", icon: FileText, labelKey: "nav.reportsExport", path: "/reports-export" },
        { id: "custom-report-builder", icon: FileText, labelKey: "nav.customReportBuilder", path: "/custom-report-builder" },
        { id: "alert-config", icon: AlertTriangle, labelKey: "nav.alertConfig", path: "/alert-config", adminOnly: true },
        { id: "oee-alert-thresholds", icon: Target, labelKey: "nav.oeeAlertThresholds", path: "/oee-alert-thresholds", adminOnly: true },
        { id: "ntf-config", icon: Bell, labelKey: "nav.ntfConfig", path: "/ntf-config", adminOnly: true },
        { id: "ntf-dashboard", icon: BarChart3, labelKey: "nav.ntfDashboard", path: "/ntf-dashboard", adminOnly: true },
      ],
    },
  ],
};

// ===== PRODUCTION SYSTEM MENU =====
export const PRODUCTION_MENU: SystemMenuConfig = {
  system: SYSTEMS.PRODUCTION,
  menuGroups: [
    {
      id: "production-management",
      labelKey: "menuGroup.production",
      icon: Factory,
      defaultOpen: true,
      items: [
        { id: "production-line-management", icon: Factory, labelKey: "nav.productionLine", path: "/production-line-management", adminOnly: true },
        { id: "production-lines", icon: Activity, labelKey: "nav.productionLineStatus", path: "/production-lines" },
        { id: "workstations", icon: Wrench, labelKey: "nav.workstation", path: "/workstations", adminOnly: true },
        { id: "machines", icon: Cog, labelKey: "nav.machine", path: "/machines", adminOnly: true },
        { id: "machine-types", icon: Cpu, labelKey: "nav.machineType", path: "/machine-types", adminOnly: true },
        { id: "machine-areas", icon: Layers, labelKey: "nav.machineAreas", path: "/machine-areas", adminOnly: true },
        { id: "fixtures", icon: Wrench, labelKey: "nav.fixture", path: "/fixtures", adminOnly: true },
        { id: "jigs", icon: Cog, labelKey: "nav.jig", path: "/jigs", adminOnly: true },
        { id: "processes", icon: GitBranch, labelKey: "nav.process", path: "/processes", adminOnly: true },
      ],
    },
    {
      id: "master-data",
      labelKey: "menuGroup.masterData",
      icon: Boxes,
      items: [
        { id: "products", icon: Package, labelKey: "nav.productManagement", path: "/products", adminOnly: true },
        { id: "measurement-standards", icon: Ruler, labelKey: "nav.measurementStandards", path: "/measurement-standards", adminOnly: true },
        { id: "measurement-standards-dashboard", icon: BarChart3, labelKey: "nav.measurementStandardsDashboard", path: "/measurement-standards-dashboard", adminOnly: true },
        { id: "mappings", icon: FileSpreadsheet, labelKey: "nav.mappingManagement", path: "/mappings", adminOnly: true },
        { id: "spc-plans", icon: Calendar, labelKey: "nav.spcPlanManagement", path: "/spc-plans", adminOnly: true },
        { id: "quick-spc-plan", icon: Zap, labelKey: "nav.quickSpcPlan", path: "/quick-spc-plan", adminOnly: true },
      ],
    },
  ],
};

// ===== LICENSE SERVER MENU (Admin Only - Quản lý License cho Công ty) =====
export const LICENSE_MENU: SystemMenuConfig = {
  system: SYSTEMS.LICENSE,
  menuGroups: [
    {
      id: "license-dashboard",
      labelKey: "menuGroup.licenseDashboard",
      icon: Gauge,
      defaultOpen: true,
      items: [
        { id: "license-server-dashboard", icon: Gauge, labelKey: "nav.licenseServerDashboard", path: "/license-server-dashboard", adminOnly: true },
        { id: "license-management", icon: Key, labelKey: "nav.licenseManagement", path: "/license-management", adminOnly: true },
        { id: "license-notification-report", icon: Mail, labelKey: "nav.licenseNotificationReport", path: "/license-notification-report", adminOnly: true },
        { id: "license-dashboard", icon: BarChart3, labelKey: "nav.licenseDashboard", path: "/license-dashboard", adminOnly: true },
      ],
    },
    {
      id: "license-customers",
      labelKey: "menuGroup.licenseCustomers",
      icon: Building2,
      items: [
        { id: "license-customers", icon: Building2, labelKey: "nav.licenseCustomers", path: "/license-customers", adminOnly: true },
        { id: "license-revenue", icon: BarChart3, labelKey: "nav.licenseRevenue", path: "/license-revenue", adminOnly: true },
      ],
    },
    {
      id: "license-settings",
      labelKey: "menuGroup.licenseSettings",
      icon: Settings,
      items: [
        { id: "license-server-settings", icon: Server, labelKey: "nav.licenseServerSettings", path: "/license-server-settings", adminOnly: true },
      ],
    },
  ],
};

// ===== SYSTEM ADMIN MENU =====
export const SYSTEM_MENU: SystemMenuConfig = {
  system: SYSTEMS.SYSTEM,
  menuGroups: [
    {
      id: "users-management",
      labelKey: "menuGroup.users",
      icon: Users,
      defaultOpen: true,
      items: [
        { id: "users", icon: Users, labelKey: "nav.userManagement", path: "/users" },
        { id: "local-users", icon: UserCog, labelKey: "nav.localUserManagement", path: "/local-users", adminOnly: true },
        { id: "login-history", icon: History, labelKey: "nav.loginHistory", path: "/login-history", adminOnly: true },
        { id: "organization", icon: Building2, labelKey: "nav.organization", path: "/organization", adminOnly: true },
        { id: "approval-workflow", icon: GitBranch, labelKey: "nav.approvalWorkflow", path: "/approval-workflow", adminOnly: true },
        { id: "module-permissions", icon: Shield, labelKey: "nav.modulePermissions", path: "/module-permissions", adminOnly: true },
        { id: "pending-approvals", icon: Clock, labelKey: "nav.pendingApprovals", path: "/pending-approvals" },
      ],
    },
    {
      id: "system-config",
      labelKey: "menuGroup.system",
      icon: Settings,
      items: [
        { id: "app-settings", icon: Cog, labelKey: "nav.appSettings", path: "/app-settings", adminOnly: true },
        { id: "settings", icon: Settings, labelKey: "nav.settingsAndConnections", path: "/settings", adminOnly: true },
        { id: "database-unified", icon: Database, labelKey: "nav.databaseUnified", path: "/database-unified", adminOnly: true },
        { id: "database-wizard", icon: Database, labelKey: "nav.databaseWizard", path: "/database-wizard", adminOnly: true },
        { id: "data-migration", icon: ArrowUpDown, labelKey: "nav.dataMigration", path: "/data-migration", adminOnly: true },
        { id: "schema-comparison", icon: Database, labelKey: "nav.schemaComparison", path: "/schema-comparison", adminOnly: true },
        { id: "backup-history", icon: FolderClock, labelKey: "nav.backupHistory", path: "/backup-history", adminOnly: true },
      ],
    },
    {
      id: "notifications",
      labelKey: "menuGroup.notifications",
      icon: Bell,
      items: [
        { id: "email-notifications", icon: Mail, labelKey: "nav.emailNotification", path: "/email-notifications", adminOnly: true },
        { id: "smtp-settings", icon: Server, labelKey: "nav.smtpConfig", path: "/smtp-settings", adminOnly: true },
        { id: "twilio-settings", icon: Bell, labelKey: "nav.twilioSettings", path: "/twilio-settings", adminOnly: true },
        { id: "sms-config", icon: MessageSquare, labelKey: "nav.smsConfig", path: "/sms-config", adminOnly: true },
        { id: "performance-drop-alert", icon: TrendingUp, labelKey: "nav.performanceDropAlert", path: "/performance-drop-alert", adminOnly: true },
        { id: "webhook-settings", icon: Webhook, labelKey: "nav.webhookSettings", path: "/webhook-settings", adminOnly: true },
        { id: "webhooks", icon: Webhook, labelKey: "nav.webhookManagement", path: "/webhooks", adminOnly: true },
        { id: "notification-center", icon: Bell, labelKey: "nav.notificationCenter", path: "/notification-center" },
        { id: "alert-analytics", icon: BarChart3, labelKey: "nav.alertAnalytics", path: "/alert-analytics", adminOnly: true },
        { id: "unified-alert-kpi", icon: BarChart3, labelKey: "nav.unifiedAlertKpi", path: "/unified-alert-kpi", adminOnly: true },
      ],
    },
    {
      id: "system-tools",
      labelKey: "menuGroup.systemTools",
      icon: Wrench,
      items: [
        { id: "audit-logs", icon: FileText, labelKey: "nav.auditLog", path: "/audit-logs" },
        { id: "seed-data", icon: Database, labelKey: "nav.seedData", path: "/seed-data", adminOnly: true },
        { id: "report-templates", icon: FileType, labelKey: "nav.reportTemplates", path: "/report-templates", adminOnly: true },
        { id: "export-history", icon: FolderClock, labelKey: "nav.exportHistory", path: "/export-history" },
        { id: "scheduled-jobs", icon: Clock, labelKey: "nav.scheduledJobs", path: "/scheduled-jobs", adminOnly: true },
        { id: "rate-limit-dashboard", icon: Shield, labelKey: "nav.rateLimitDashboard", path: "/rate-limit-dashboard", adminOnly: true },
        { id: "admin-monitoring", icon: Activity, labelKey: "nav.adminMonitoring", path: "/admin-monitoring", adminOnly: true },
        { id: "performance-trends", icon: TrendingUp, labelKey: "nav.performanceTrends", path: "/performance-trends", adminOnly: true },
        { id: "system-health", icon: Activity, labelKey: "nav.systemHealth", path: "/system-health", adminOnly: true },
        { id: "security-dashboard", icon: Shield, labelKey: "nav.securityDashboard", path: "/security-dashboard", adminOnly: true },
        { id: "iot-dashboard", icon: Cpu, labelKey: "nav.iotDashboard", path: "/iot-dashboard", adminOnly: true },
        { id: "ai-ml-dashboard", icon: Brain, labelKey: "nav.aiMlDashboard", path: "/ai-ml-dashboard", adminOnly: true },
      ],
    },
    {
      id: "system-info",
      labelKey: "menuGroup.systemInfo",
      icon: Info,
      items: [
        { id: "company-info", icon: Building2, labelKey: "nav.companyInfo", path: "/company-info", adminOnly: true },
        { id: "quick-access-management", icon: Star, labelKey: "nav.quickAccessManagement", path: "/quick-access" },
        { id: "about", icon: Info, labelKey: "nav.about", path: "/about" },
      ],
    },
  ],
};

// ===== DASHBOARD SYSTEM MENU =====
// Dashboard sidebar chỉ có 2 phần:
// 1. Tổng quan - cố định với menu Dashboard
// 2. Quick Access - động, load từ database và cho phép tạo category tùy chỉnh
export const DASHBOARD_MENU: SystemMenuConfig = {
  system: SYSTEMS.DASHBOARD,
  menuGroups: [
    {
      id: "dashboard-overview",
      labelKey: "menuGroup.dashboardOverview",
      icon: LayoutDashboard,
      defaultOpen: true,
      items: [
        { id: "main-dashboard", icon: LayoutDashboard, labelKey: "nav.mainDashboard", path: "/dashboard" },
      ],
    },
    {
      id: "quick-access",
      labelKey: "menuGroup.quickAccess",
      icon: Star,
      defaultOpen: true,
      items: [
        // Quick access items và categories sẽ được load động từ database
        // Bao gồm cả categories tùy chỉnh của user
      ],
    },
  ],
};

// All system menus
export const ALL_SYSTEM_MENUS: Record<string, SystemMenuConfig> = {
  dashboard: DASHBOARD_MENU,
  spc: SPC_MENU,
  mms: MMS_MENU,
  production: PRODUCTION_MENU,
  license: LICENSE_MENU,
  system: SYSTEM_MENU,
};

// Get menu for a specific system
export function getSystemMenu(systemId: string): SystemMenuConfig | null {
  return ALL_SYSTEM_MENUS[systemId] || null;
}

// Get all systems
export function getAllSystems(): SystemConfig[] {
  return Object.values(SYSTEMS);
}

// Default system
export const DEFAULT_SYSTEM = "spc";
