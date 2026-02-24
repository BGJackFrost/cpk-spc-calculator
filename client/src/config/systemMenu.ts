import {
  LayoutDashboard, TrendingUp, History, FileSpreadsheet,
  Settings, Activity, Users, Package, Ruler, Factory, Clock, Calendar,
  Mail, Shield, Server, Database, Wrench, Cog, GitBranch, FileText,
  BarChart3, AlertTriangle, Cpu, GitCompare, ArrowUpDown, Info, BookOpen,
  Layers, Key, Webhook, FileType, FolderClock, UserCog, ChevronRight,
  Gauge, ClipboardList, Building2, ShieldCheck, Boxes, Moon, Sun, Zap,
  Target, HardHat, Hammer, Truck, Brain, Bell, Download, BellRing, Award,
  Thermometer, DollarSign, CreditCard, Receipt, FileCheck, Lock, Unlock,
  Star, Lightbulb, Map, Box, Focus, Send,
  MessageSquare,
  Video,
  Camera,
  ArrowLeftRight,
  Radio,
  Wifi,
  Smartphone,
  GitMerge,
  LayoutGrid,
  Eye,
  Images,
  Columns,
  ScanEye,
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
  ADMIN: {
    id: "admin",
    name: "Admin Panel",
    shortName: "Admin",
    icon: Shield,
    color: "purple",
    description: "System Administration & Performance Monitoring",
    licenseKey: "admin_panel",
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
  AI: {
    id: "ai",
    name: "AI System",
    shortName: "AI",
    icon: Brain,
    color: "violet",
    description: "AI/ML Analytics, Predictions & Automation",
    licenseKey: "ai_system",
  },
  IOT: {
    id: "iot",
    name: "IoT System",
    shortName: "IoT",
    icon: Radio,
    color: "cyan",
    description: "IoT Gateway, Sensors & Realtime Data Collection",
    licenseKey: "iot_system",
  },
  AOI_AVI: {
    id: "aoi_avi",
    name: "AOI/AVI System",
    shortName: "AOI/AVI",
    icon: ScanEye,
    color: "rose",
    description: "Automated Optical/Visual Inspection",
    licenseKey: "aoi_avi_system",
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
        { id: "cpk-forecast", icon: TrendingUp, labelKey: "nav.cpkForecast", path: "/cpk-forecast" },
        { id: "quality-trend-report", icon: TrendingUp, labelKey: "nav.qualityTrendReport", path: "/quality-trend-report" },
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
        { id: "oee-analysis", icon: TrendingUp, labelKey: "nav.oeeAnalysis", path: "/oee-analysis" },
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
        { id: "factories", icon: Building2, labelKey: "nav.factories", path: "/factories", adminOnly: true },
        { id: "workshops", icon: Factory, labelKey: "nav.workshops", path: "/workshops", adminOnly: true },
        { id: "production-line-management", icon: GitBranch, labelKey: "nav.productionLine", path: "/production-line-management", adminOnly: true },
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
      id: "factory-visualization",
      labelKey: "menuGroup.factoryVisualization",
      icon: Map,
      items: [
        { id: "floor-plan-designer", icon: Map, labelKey: "nav.floorPlanDesigner", path: "/floor-plan-designer", adminOnly: true },
        { id: "floor-plan-2d", icon: Map, labelKey: "nav.floorPlan2D", path: "/iot-floor-plan" },
        { id: "floor-plan-3d", icon: Box, labelKey: "nav.floorPlan3D", path: "/iot-3d-floor-plan" },
        { id: "floor-plan-live", icon: Zap, labelKey: "nav.floorPlanLive", path: "/floor-plan-live" },
        { id: "model-3d-management", icon: Box, labelKey: "nav.model3DManagement", path: "/model-3d-management", adminOnly: true },
        { id: "floor-plan-heatmap", icon: Thermometer, labelKey: "nav.floorPlanHeatmap", path: "/floor-plan-heatmap" },
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

// ===== ADMIN PANEL MENU (System Monitoring & Performance) =====
export const ADMIN_MENU: SystemMenuConfig = {
  system: SYSTEMS.ADMIN,
  menuGroups: [
    {
      id: "admin-dashboard",
      labelKey: "menuGroup.adminDashboard",
      icon: Gauge,
      defaultOpen: true,
      items: [
        { id: "admin-overview", icon: LayoutDashboard, labelKey: "nav.adminOverview", path: "/admin-dashboard", adminOnly: true },
      ],
    },
    {
      id: "admin-monitoring",
      labelKey: "menuGroup.adminMonitoring",
      icon: Activity,
      items: [
        { id: "system-health", icon: Activity, labelKey: "nav.systemHealth", path: "/system-health", adminOnly: true },
        { id: "performance-trends", icon: TrendingUp, labelKey: "nav.performanceTrends", path: "/performance-trends", adminOnly: true },
        { id: "admin-monitoring", icon: Activity, labelKey: "nav.adminMonitoring", path: "/admin-monitoring", adminOnly: true },
        { id: "cache-monitoring", icon: Database, labelKey: "nav.cacheMonitoring", path: "/cache-monitoring", adminOnly: true },
        { id: "rate-limit-dashboard", icon: Shield, labelKey: "nav.rateLimitDashboard", path: "/rate-limit-dashboard", adminOnly: true },
        { id: "latency-monitoring", icon: Clock, labelKey: "nav.latencyMonitoring", path: "/latency-monitoring", adminOnly: true },
      ],
    },
    {
      id: "admin-security",
      labelKey: "menuGroup.adminSecurity",
      icon: Shield,
      items: [
        { id: "security-dashboard", icon: Shield, labelKey: "nav.securityDashboard", path: "/security-dashboard", adminOnly: true },
        { id: "audit-logs", icon: FileText, labelKey: "nav.auditLog", path: "/audit-logs", adminOnly: true },
        { id: "login-history", icon: History, labelKey: "nav.loginHistory", path: "/login-history", adminOnly: true },
      ],
    },
    {
      id: "admin-analytics",
      labelKey: "menuGroup.adminAnalytics",
      icon: BarChart3,
      items: [
        { id: "alert-analytics", icon: BarChart3, labelKey: "nav.alertAnalytics", path: "/alert-analytics", adminOnly: true },
        { id: "unified-alert-kpi", icon: Target, labelKey: "nav.unifiedAlertKpi", path: "/unified-alert-kpi", adminOnly: true },
        { id: "escalation-dashboard", icon: Bell, labelKey: "nav.escalationDashboard", path: "/escalation-dashboard", adminOnly: true },
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
        { id: "2fa-setup", icon: Shield, labelKey: "nav.twoFactorSetup", path: "/2fa-setup" },
        { id: "login-customization", icon: Eye, labelKey: "nav.loginCustomization", path: "/login-customization", adminOnly: true },
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
      id: "notification-channels",
      labelKey: "menuGroup.notificationChannels",
      icon: Send,
      items: [
        { id: "email-notifications", icon: Mail, labelKey: "nav.emailNotification", path: "/email-notifications", adminOnly: true },
        { id: "smtp-settings", icon: Server, labelKey: "nav.smtpConfig", path: "/smtp-settings", adminOnly: true },
        { id: "twilio-settings", icon: Bell, labelKey: "nav.twilioSettings", path: "/twilio-settings", adminOnly: true },
        { id: "sms-config", icon: MessageSquare, labelKey: "nav.smsConfig", path: "/sms-config", adminOnly: true },
        { id: "push-notification-settings", icon: BellRing, labelKey: "nav.pushNotificationSettings", path: "/push-notification-settings" },
      ],
    },
    {
      id: "notification-webhooks",
      labelKey: "menuGroup.notificationWebhooks",
      icon: Webhook,
      items: [
        { id: "webhook-settings", icon: Webhook, labelKey: "nav.webhookSettings", path: "/webhook-settings", adminOnly: true },
        { id: "webhooks", icon: Webhook, labelKey: "nav.webhookManagement", path: "/webhooks", adminOnly: true },
        { id: "unified-webhooks", icon: Webhook, labelKey: "nav.unifiedWebhooks", path: "/unified-webhooks", adminOnly: true },
      ],
    },
    {
      id: "notification-monitoring",
      labelKey: "menuGroup.notificationMonitoring",
      icon: Bell,
      items: [
        { id: "notification-center", icon: Bell, labelKey: "nav.notificationCenter", path: "/notification-center" },
        { id: "alert-analytics", icon: BarChart3, labelKey: "nav.alertAnalytics", path: "/alert-analytics", adminOnly: true },
        { id: "unified-alert-kpi", icon: BarChart3, labelKey: "nav.unifiedAlertKpi", path: "/unified-alert-kpi", adminOnly: true },
        { id: "performance-drop-alert", icon: TrendingUp, labelKey: "nav.performanceDropAlert", path: "/performance-drop-alert", adminOnly: true },
        { id: "widget-config", icon: LayoutGrid, labelKey: "nav.widgetConfig", path: "/widget-config" },
        { id: "conflict-resolution", icon: GitMerge, labelKey: "nav.conflictResolution", path: "/conflict-resolution" },
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
        { id: "cache-monitoring", icon: Database, labelKey: "nav.cacheMonitoring", path: "/cache-monitoring", adminOnly: true },
      ],
    },
    {
      id: "system-info",
      labelKey: "menuGroup.systemInfo",
      icon: Info,
      items: [
        { id: "company-info", icon: Building2, labelKey: "nav.companyInfo", path: "/company-info", adminOnly: true },
        { id: "quick-access-management", icon: Star, labelKey: "nav.quickAccessManagement", path: "/quick-access" },
        { id: "user-guide", icon: BookOpen, labelKey: "nav.userGuide", path: "/user-guide" },
        { id: "video-management", icon: Video, labelKey: "nav.videoManagement", path: "/video-management", adminOnly: true },
        { id: "about", icon: Info, labelKey: "nav.about", path: "/about" },
      ],
    },
    {
      id: "license-management",
      labelKey: "menuGroup.licenseManagement",
      icon: Key,
      items: [
        { id: "license-dashboard", icon: BarChart3, labelKey: "nav.licenseDashboard", path: "/license-dashboard", adminOnly: true },
        { id: "license-notification-report", icon: Bell, labelKey: "nav.licenseNotificationReport", path: "/license-notification-report", adminOnly: true },
      ],
    },
  ],
};
// ===== DASHBOARD SYSTEM MENU ======
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

// ===== AI SYSTEM MENU =====
export const AI_MENU: SystemMenuConfig = {
  system: SYSTEMS.AI,
  menuGroups: [
    {
      id: "ai-dashboard",
      labelKey: "menuGroup.aiDashboard",
      icon: Gauge,
      defaultOpen: true,
      items: [
        { id: "ai-overview", icon: Brain, labelKey: "nav.aiOverview", path: "/ai-dashboard" },
        { id: "ai-ml-dashboard", icon: Activity, labelKey: "nav.aiMlDashboard", path: "/ai-ml-dashboard" },
        { id: "ai-ml-health", icon: Activity, labelKey: "nav.aiMlHealth", path: "/ai-ml-health" },
        { id: "ai-data-drift", icon: AlertTriangle, labelKey: "nav.aiDataDrift", path: "/ai-data-drift" },
        { id: "ai-predictions", icon: TrendingUp, labelKey: "nav.aiPredictions", path: "/ai-predictions" },
        { id: "ai-alerts", icon: AlertTriangle, labelKey: "nav.aiAlerts", path: "/ai-alerts" },
      ],
    },
    {
      id: "ai-analysis",
      labelKey: "menuGroup.aiAnalysis",
      icon: TrendingUp,
      items: [
        { id: "anomaly-detection", icon: AlertTriangle, labelKey: "nav.anomalyDetection", path: "/anomaly-detection", licenseFeature: "ai_anomaly" },
        { id: "ai-spc-analysis", icon: BarChart3, labelKey: "nav.aiSpcAnalysis", path: "/ai-spc-analysis" },
        { id: "ai-root-cause", icon: GitBranch, labelKey: "nav.aiRootCause", path: "/ai-root-cause" },
        { id: "ai-correlation", icon: GitCompare, labelKey: "nav.aiCorrelation", path: "/ai-correlation" },
        { id: "ai-trend-analysis", icon: TrendingUp, labelKey: "nav.aiTrendAnalysis", path: "/ai-trend-analysis" },
      ],
    },
    {
      id: "ai-predictive",
      labelKey: "menuGroup.aiPredictive",
      icon: Target,
      items: [
        { id: "cpk-forecast", icon: TrendingUp, labelKey: "nav.cpkForecast", path: "/ai-predictive" },
        { id: "cpk-forecasting", icon: TrendingUp, labelKey: "nav.cpkForecasting", path: "/cpk-forecasting" },
        { id: "defect-detection", icon: AlertTriangle, labelKey: "nav.defectDetection", path: "/defect-detection" },
        { id: "cpk-comparison-ai", icon: GitCompare, labelKey: "nav.cpkComparison", path: "/cpk-comparison" },
        { id: "predictive-maintenance", icon: Wrench, labelKey: "nav.predictiveMaintenance", path: "/predictive-maintenance", licenseFeature: "ai_predictive" },
        { id: "ai-oee-forecast", icon: Target, labelKey: "nav.aiOeeForecast", path: "/ai-oee-forecast" },
        { id: "ai-defect-prediction", icon: AlertTriangle, labelKey: "nav.aiDefectPrediction", path: "/ai-defect-prediction" },
        { id: "ai-yield-optimization", icon: BarChart3, labelKey: "nav.aiYieldOptimization", path: "/ai-yield-optimization" },
        { id: "ai-predictive-alerts", icon: Bell, labelKey: "nav.aiPredictiveAlerts", path: "/ai-predictive-alerts", adminOnly: true },
        { id: "ai-predictive-alert-dashboard", icon: BellRing, labelKey: "nav.aiPredictiveAlertDashboard", path: "/ai-predictive-alert-dashboard" },
        { id: "ai-forecast-accuracy", icon: Target, labelKey: "nav.aiForecastAccuracy", path: "/ai-forecast-accuracy" },
      ],
    },
    {
      id: "ai-nlp",
      labelKey: "menuGroup.aiNlp",
      icon: MessageSquare,
      items: [
        { id: "ai-chat", icon: MessageSquare, labelKey: "nav.aiChat", path: "/ai-natural-language", licenseFeature: "ai_chat" },
        { id: "ai-reports", icon: FileText, labelKey: "nav.aiReports", path: "/ai-reports" },
        { id: "ai-insights", icon: Lightbulb, labelKey: "nav.aiInsights", path: "/ai-insights" },
      ],
    },
    {
      id: "ai-training",
      labelKey: "menuGroup.aiTraining",
      icon: Cpu,
      items: [
        { id: "ai-model-management", icon: Brain, labelKey: "nav.aiModelManagement", path: "/ai-model-training", adminOnly: true },
        { id: "ai-analytics-dashboard", icon: BarChart3, labelKey: "nav.aiAnalyticsDashboard", path: "/ai-analytics-dashboard", adminOnly: true },
        { id: "ai-training-jobs", icon: Activity, labelKey: "nav.aiTrainingJobs", path: "/ai-training-jobs", adminOnly: true },
        { id: "ai-model-comparison", icon: GitCompare, labelKey: "nav.aiModelComparison", path: "/ai-model-comparison", adminOnly: true },
        { id: "ai-model-performance", icon: BarChart3, labelKey: "nav.aiModelPerformance", path: "/ai-model-performance" },
        { id: "ai-ab-testing", icon: Target, labelKey: "nav.aiAbTesting", path: "/ai-ab-testing", adminOnly: true },
        { id: "ai-model-versioning", icon: GitBranch, labelKey: "nav.aiModelVersioning", path: "/ai-model-versioning", adminOnly: true },
        { id: "model-version-comparison", icon: GitCompare, labelKey: "nav.modelVersionComparison", path: "/model-version-comparison", adminOnly: true },
      ],
    },
    {
      id: "ai-vision",
      labelKey: "menuGroup.aiVision",
      icon: Video,
      items: [
        { id: "ai-vision-detection", icon: Video, labelKey: "nav.aiVisionDetection", path: "/ai-vision-detection", licenseFeature: "ai_vision" },
        { id: "image-comparison", icon: ArrowLeftRight, labelKey: "nav.imageComparison", path: "/image-comparison", licenseFeature: "ai_vision" },
        { id: "sn-images", icon: Images, labelKey: "nav.snImages", path: "/sn-images", licenseFeature: "ai_vision" },
        { id: "sn-image-compare", icon: Columns, labelKey: "nav.snImageCompare", path: "/sn-image-compare", licenseFeature: "ai_vision" },
        { id: "sn-image-history", icon: History, labelKey: "nav.snImageHistory", path: "/sn-image-history", licenseFeature: "ai_vision" },
        { id: "camera-management", icon: Camera, labelKey: "nav.cameraManagement", path: "/camera-management", licenseFeature: "ai_vision" },
        { id: "camera-capture", icon: Camera, labelKey: "nav.cameraCapture", path: "/camera-capture", licenseFeature: "ai_vision" },
        { id: "alert-email-config", icon: Mail, labelKey: "nav.alertEmailConfig", path: "/alert-email-config", licenseFeature: "ai_vision" },
        { id: "auto-capture", icon: Camera, labelKey: "nav.autoCapture", path: "/auto-capture", licenseFeature: "ai_vision" },
        { id: "image-history", icon: Calendar, labelKey: "nav.imageHistory", path: "/image-history", licenseFeature: "ai_vision" },
        { id: "camera-capture-schedule", icon: Clock, labelKey: "nav.cameraCaptureSchedule", path: "/camera-capture-schedule", licenseFeature: "ai_vision" },
        { id: "quality-statistics-report", icon: BarChart3, labelKey: "nav.qualityStatisticsReport", path: "/quality-statistics-report", licenseFeature: "ai_vision" },
      ],
    },
    {
      id: "ai-settings",
      labelKey: "menuGroup.aiSettings",
      icon: Settings,
      items: [
        { id: "ai-config", icon: Cog, labelKey: "nav.aiConfig", path: "/ai-config", adminOnly: true },
        { id: "ai-thresholds", icon: Gauge, labelKey: "nav.aiThresholds", path: "/ai-thresholds", adminOnly: true },
        { id: "ai-data-sources", icon: Database, labelKey: "nav.aiDataSources", path: "/ai-data-sources", adminOnly: true },
        { id: "ai-audit-logs", icon: FileText, labelKey: "nav.aiAuditLogs", path: "/ai-audit-logs", adminOnly: true },
      ],
    },
  ],
};

// ===== IOT SYSTEM MENU =====
export const IOT_MENU: SystemMenuConfig = {
  system: SYSTEMS.IOT,
  menuGroups: [
    {
      id: "iot-overview",
      labelKey: "menuGroup.iotOverview",
      icon: Gauge,
      defaultOpen: true,
      items: [
        { id: "iot-dashboard", icon: LayoutDashboard, labelKey: "nav.iotDashboard", path: "/iot-dashboard" },
        { id: "iot-overview-dashboard", icon: Gauge, labelKey: "nav.iotOverviewDashboard", path: "/iot-overview-dashboard" },
        { id: "iot-device-crud", icon: Cpu, labelKey: "nav.iotDeviceCrud", path: "/iot-device-crud" },
        { id: "iot-alarm-crud", icon: Bell, labelKey: "nav.iotAlarmCrud", path: "/iot-alarm-crud" },
        { id: "iot-realtime-dashboard", icon: Zap, labelKey: "nav.iotRealtimeDashboard", path: "/iot-realtime-dashboard", licenseFeature: "iot_realtime" },
        { id: "iot-monitoring-realtime", icon: Activity, labelKey: "nav.iotMonitoringRealtime", path: "/iot-monitoring-realtime", licenseFeature: "iot_realtime" },
        { id: "sensor-dashboard", icon: Thermometer, labelKey: "nav.sensorDashboard", path: "/sensor-dashboard" },
        { id: "iot-unified-dashboard", icon: Gauge, labelKey: "nav.iotUnifiedDashboard", path: "/iot-unified-dashboard" },
        { id: "unified-realtime-dashboard", icon: Layers, labelKey: "nav.unifiedRealtimeDashboard", path: "/unified-realtime-dashboard" },
        { id: "advanced-history", icon: History, labelKey: "nav.advancedHistory", path: "/advanced-history" },
        { id: "machine-api-documentation", icon: FileText, labelKey: "nav.machineApiDocumentation", path: "/machine-api-documentation" },
      ],
    },
    {
      id: "iot-maintenance",
      labelKey: "menuGroup.iotMaintenance",
      icon: Wrench,
      items: [
        { id: "iot-work-orders", icon: ClipboardList, labelKey: "nav.iotWorkOrders", path: "/iot-work-orders" },
        { id: "iot-scheduled-ota", icon: Calendar, labelKey: "nav.iotScheduledOta", path: "/iot-scheduled-ota", adminOnly: true },
        { id: "mttr-mtbf-report", icon: BarChart3, labelKey: "nav.mttrMtbfReport", path: "/mttr-mtbf-report" },
        { id: "mttr-mtbf-comparison", icon: BarChart3, labelKey: "nav.mttrMtbfComparison", path: "/mttr-mtbf-comparison" },
        { id: "mttr-mtbf-thresholds", icon: AlertTriangle, labelKey: "nav.mttrMtbfThresholds", path: "/mttr-mtbf-thresholds", adminOnly: true },
        { id: "mttr-mtbf-prediction", icon: TrendingUp, labelKey: "nav.mttrMtbfPrediction", path: "/mttr-mtbf-prediction" },
        { id: "work-order-notification-config", icon: Bell, labelKey: "nav.workOrderNotificationConfig", path: "/work-order-notification-config", adminOnly: true },
      ],
    },
    {
      id: "iot-connections",
      labelKey: "menuGroup.iotConnections",
      icon: Wifi,
      items: [
        { id: "iot-gateway", icon: Radio, labelKey: "nav.iotGateway", path: "/iot-gateway", adminOnly: true },
        { id: "mqtt-connections", icon: Wifi, labelKey: "nav.mqttConnections", path: "/mqtt-connections", adminOnly: true },
        { id: "opcua-connections", icon: Server, labelKey: "nav.opcuaConnections", path: "/opcua-connections", adminOnly: true },
      ],
    },
    {
      id: "iot-config",
      labelKey: "menuGroup.iotConfig",
      icon: Settings,
      items: [
        { id: "iot-alarm-threshold", icon: AlertTriangle, labelKey: "nav.iotAlarmThreshold", path: "/alarm-threshold-config", adminOnly: true },
        { id: "iot-realtime-machine-config", icon: Cpu, labelKey: "nav.realtimeMachineConfig", path: "/realtime-machine-config", adminOnly: true },
        { id: "iot-realtime-history", icon: History, labelKey: "nav.realtimeHistory", path: "/realtime-history" },
        { id: "telegram-settings", icon: MessageSquare, labelKey: "nav.telegramSettings", path: "/telegram-settings", adminOnly: true },
        { id: "webhook-templates", icon: Zap, labelKey: "nav.webhookTemplates", path: "/webhook-templates", adminOnly: true },
        { id: "alert-webhook-settings", icon: Webhook, labelKey: "nav.alertWebhookSettings", path: "/alert-webhook-settings", adminOnly: true },
        { id: "webhook-escalation", icon: Bell, labelKey: "nav.webhookEscalation", path: "/webhook-escalation", adminOnly: true },
        { id: "sms-notification-settings", icon: MessageSquare, labelKey: "nav.smsNotificationSettings", path: "/sms-settings", adminOnly: true },
        { id: "escalation-dashboard", icon: BarChart3, labelKey: "nav.escalationDashboard", path: "/escalation-dashboard", adminOnly: true },
        { id: "auto-resolve-settings", icon: Zap, labelKey: "nav.autoResolveSettings", path: "/auto-resolve-settings", adminOnly: true },
        { id: "latency-monitoring", icon: Activity, labelKey: "nav.latencyMonitoring", path: "/latency-monitoring", adminOnly: true },
        { id: "notification-preferences", icon: Bell, labelKey: "nav.notificationPreferences", path: "/notification-preferences" },
        { id: "notification-history", icon: History, labelKey: "nav.notificationHistory", path: "/notification-history" },
        { id: "iot-user-guide", icon: BookOpen, labelKey: "nav.iotUserGuide", path: "/iot-user-guide" },
      ],
    },
  ],
};

// ===== AOI/AVI SYSTEM MENU =====
export const AOI_AVI_MENU: SystemMenuConfig = {
  system: SYSTEMS.AOI_AVI,
  menuGroups: [
    {
      id: "aoi-avi-overview",
      labelKey: "menuGroup.aoiAviOverview",
      icon: Gauge,
      defaultOpen: true,
      items: [
        { id: "avi-aoi-dashboard", icon: Eye, labelKey: "nav.aviAoiDashboard", path: "/avi-aoi-dashboard" },
        { id: "aoi-avi-summary", icon: BarChart3, labelKey: "nav.aoiAviSummary", path: "/aoi-avi-summary" },
        { id: "ai-vision-analysis", icon: Camera, labelKey: "nav.aiVisionAnalysis", path: "/ai-vision-analysis" },
        { id: "batch-image-analysis", icon: Images, labelKey: "nav.batchImageAnalysis", path: "/batch-image-analysis" },
        { id: "realtime-inspection", icon: Zap, labelKey: "nav.realtimeInspection", path: "/realtime-inspection" },
        { id: "dashboard-customization", icon: LayoutGrid, labelKey: "nav.dashboardCustomization", path: "/dashboard-customization" },
      ],
    },
    {
      id: "aoi-avi-inspection",
      labelKey: "menuGroup.aoiAviInspection",
      icon: ScanEye,
      items: [
        { id: "image-comparison", icon: ArrowLeftRight, labelKey: "nav.imageComparison", path: "/image-comparison", licenseFeature: "aoi_avi" },
        { id: "sn-images", icon: Images, labelKey: "nav.snImages", path: "/sn-images", licenseFeature: "aoi_avi" },
        { id: "sn-image-compare", icon: Columns, labelKey: "nav.snImageCompare", path: "/sn-image-compare", licenseFeature: "aoi_avi" },
        { id: "sn-image-history", icon: History, labelKey: "nav.snImageHistory", path: "/sn-image-history", licenseFeature: "aoi_avi" },
        { id: "defect-detection", icon: AlertTriangle, labelKey: "nav.defectDetection", path: "/ai-vision-detection", licenseFeature: "aoi_avi" },
        { id: "golden-sample", icon: Star, labelKey: "nav.goldenSample", path: "/golden-sample", licenseFeature: "aoi_avi" },
        { id: "golden-sample-manager", icon: Images, labelKey: "nav.goldenSampleManager", path: "/golden-sample-manager", licenseFeature: "aoi_avi" },
        { id: "defect-type-manager", icon: AlertTriangle, labelKey: "nav.defectTypeManager", path: "/defect-type-manager", licenseFeature: "aoi_avi" },
      ],
    },
    {
      id: "aoi-avi-ai",
      labelKey: "menuGroup.aoiAviAI",
      icon: Brain,
      items: [
        { id: "ai-model-management", icon: Brain, labelKey: "nav.aiModelManagement", path: "/ai-model-management", licenseFeature: "aoi_avi" },
        { id: "ai-training-data", icon: Database, labelKey: "nav.aiTrainingData", path: "/ai-training-data", licenseFeature: "aoi_avi" },
        { id: "ai-accuracy-report", icon: Target, labelKey: "nav.aiAccuracyReport", path: "/ai-accuracy-report", licenseFeature: "aoi_avi" },
        { id: "defect-classification", icon: Layers, labelKey: "nav.defectClassification", path: "/defect-classification", licenseFeature: "aoi_avi" },
      ],
    },
    {
      id: "aoi-avi-camera",
      labelKey: "menuGroup.aoiAviCamera",
      icon: Camera,
      items: [
        { id: "camera-management", icon: Camera, labelKey: "nav.cameraManagement", path: "/camera-management", licenseFeature: "aoi_avi" },
        { id: "camera-capture", icon: Camera, labelKey: "nav.cameraCapture", path: "/camera-capture", licenseFeature: "aoi_avi" },
        { id: "camera-capture-schedule", icon: Clock, labelKey: "nav.cameraCaptureSchedule", path: "/camera-capture-schedule", licenseFeature: "aoi_avi" },
        { id: "image-history", icon: Calendar, labelKey: "nav.imageHistory", path: "/image-history", licenseFeature: "aoi_avi" },
        { id: "camera-calibration", icon: Focus, labelKey: "nav.cameraCalibration", path: "/camera-calibration", licenseFeature: "aoi_avi" },
      ],
    },
    {
      id: "aoi-avi-reports",
      labelKey: "menuGroup.aoiAviReports",
      icon: BarChart3,
      items: [
        { id: "quality-statistics-report", icon: BarChart3, labelKey: "nav.qualityStatisticsReport", path: "/quality-statistics-report", licenseFeature: "aoi_avi" },
        { id: "defect-statistics", icon: BarChart3, labelKey: "nav.defectStatistics", path: "/defect-statistics" },
        { id: "defect-pareto", icon: BarChart3, labelKey: "nav.defectPareto", path: "/defect-pareto" },
        { id: "inspection-trend", icon: TrendingUp, labelKey: "nav.inspectionTrend", path: "/inspection-trend" },
        { id: "ntf-dashboard", icon: TrendingUp, labelKey: "nav.ntfDashboard", path: "/ntf-dashboard" },
        { id: "yield-analysis", icon: Target, labelKey: "nav.yieldAnalysis", path: "/yield-analysis" },
        { id: "yield-defect-alert-history", icon: Bell, labelKey: "nav.yieldDefectAlertHistory", path: "/yield-defect-alert-history" },
      ],
    },
    {
      id: "aoi-avi-config",
      labelKey: "menuGroup.aoiAviConfig",
      icon: Settings,
      items: [
        { id: "alert-email-config", icon: Mail, labelKey: "nav.alertEmailConfig", path: "/alert-email-config", adminOnly: true, licenseFeature: "aoi_avi" },
        { id: "auto-capture", icon: Camera, labelKey: "nav.autoCapture", path: "/auto-capture", adminOnly: true, licenseFeature: "aoi_avi" },
        { id: "inspection-rules", icon: FileText, labelKey: "nav.inspectionRules", path: "/inspection-rules", adminOnly: true, licenseFeature: "aoi_avi" },
        { id: "defect-categories", icon: Layers, labelKey: "nav.defectCategories", path: "/defect-categories", adminOnly: true },
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
  admin: ADMIN_MENU,
  system: SYSTEM_MENU,
  ai: AI_MENU,
  iot: IOT_MENU,
  aoi_avi: AOI_AVI_MENU,
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
