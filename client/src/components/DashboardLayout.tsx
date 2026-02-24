import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { 
  LogOut, PanelLeft, ChevronRight, Moon, Sun, User, Key
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { CSSProperties, useEffect, useRef, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "../contexts/LanguageContext";
import { NotificationBell } from "./NotificationBell";
import { WebSocketIndicator } from "./WebSocketIndicator";
import { SseIndicator } from "./SseIndicator";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import { MobileOfflineSyncIndicator } from "./MobileOfflineSyncIndicator";
import { TopNavigation } from "./TopNavigation";
// ThemeSelector removed - dark mode only
import { useSystem } from "@/contexts/SystemContext";
import { MenuGroup as SystemMenuGroup, MenuItem as SystemMenuItem } from "@/config/systemMenu";
import { useQuickAccess } from "@/hooks/useQuickAccess";
import { Star, Plus, Pin, Search, Folder, FolderOpen } from "lucide-react";
import { QuickAccessAddDialog } from "./QuickAccessAddDialog";
import { MenuItemContextMenu } from "./MenuItemContextMenu";
import { QuickAccessSearch } from "./QuickAccessSearch";

// Fallback labels for keys not in translation files (by language)
const fallbackLabelsVi: Record<string, string> = {
  "menuGroup.dashboardOverview": "Tổng quan",
  "menuGroup.quickAccess": "Truy cập nhanh",
  "menuGroup.dashboardReports": "Báo cáo",
  "nav.mainDashboard": "Dashboard chính",
  "nav.shiftReport": "Báo cáo theo Ca",
  "menuGroup.spcOverview": "Tổng quan SPC",
  "menuGroup.spcAnalysis": "Phân tích",
  "menuGroup.spcQuality": "Chất lượng",
  "menuGroup.spcConfig": "Cấu hình SPC",
  "menuGroup.spcRealtime": "Realtime SPC",
  "menuGroup.mmsOverview": "Tổng quan MMS",
  "menuGroup.mmsMaintenance": "Bảo trì",
  "menuGroup.mmsSpareParts": "Kho phụ tùng",
  "menuGroup.mmsConfig": "Cấu hình MMS",
  "menuGroup.production": "Quản lý Sản xuất",
  "menuGroup.masterData": "Dữ liệu Chính",
  "menuGroup.licenseOverview": "Tổng quan License",
  "menuGroup.licenseRevenue": "Doanh thu",
  "menuGroup.licenseActivation": "Kích hoạt",
  "menuGroup.users": "Người dùng",
  "menuGroup.system": "Hệ thống",
  "menuGroup.notifications": "Thông báo",
  "menuGroup.notificationChannels": "Kênh Thông báo",
  "menuGroup.notificationWebhooks": "Webhooks",
  "menuGroup.notificationMonitoring": "Giám sát Cảnh báo",
  "menuGroup.systemTools": "Công cụ",
  "nav.dashboard": "Dashboard",
  "nav.realtimeLine": "Realtime Dashboard",
  "nav.machineOverview": "Tổng quan Máy",
  "nav.machineStatusReport": "Báo cáo Trạng thái",
  "nav.spcPlanOverview": "SPC Plan Overview",
  "nav.supervisorDashboard": "Dashboard Giám sát",
  "nav.analyze": "Phân tích SPC/CPK",
  "nav.anomalyDetection": "AI Anomaly Detection",
  "nav.multiObjectAnalysis": "Phân tích Đa đối tượng",
  "nav.lineComparison": "So sánh Dây chuyền",
  "nav.machineComparison": "So sánh Máy",
  "nav.history": "Lịch sử Phân tích",
  "nav.spcReport": "Báo cáo SPC",
  "nav.defectTracking": "Theo dõi Lỗi",
  "nav.defectAnalysis": "Phân tích Lỗi",
  "nav.spcRulesConfig": "Cấu hình SPC Rules",
  "nav.customValidation": "Validation Rules",
  "nav.cpkBenchmark": "So sánh CPK",
  "nav.shiftAnalysis": "Phân tích theo Ca",
  "nav.cpkForecast": "Dự báo CPK",
  "nav.shiftManager": "Dashboard Quản lý Ca",
  "nav.kpiAlertThresholds": "Ngưỡng Cảnh báo KPI",
  "nav.kpiAlertStats": "Thống kê Cảnh báo KPI",
  "nav.weeklyKpiTrend": "Xu hướng KPI theo Tuần",
  "nav.scheduledKpiReports": "Lịch Gửi Báo cáo",
  "nav.realtimeConveyor": "Dây chuyền Realtime",
  "nav.productionLineStatus": "Trạng thái Dây chuyền",
  "nav.realtimeMachineConfig": "Cấu hình Máy Realtime",
  "nav.realtimeHistory": "Lịch sử Realtime",
  "nav.alarmThreshold": "Ngưỡng Cảnh báo",
  "nav.machineAreas": "Khu vực Máy",
  "nav.oeeDashboard": "Dashboard OEE",
  "nav.oeeAnalysis": "Phân tích OEE",
  "nav.unifiedDashboard": "Dashboard Tổng hợp",
  "nav.plantKpi": "KPI Nhà máy",
  "nav.advancedAnalytics": "Phân tích Nâng cao",
  "nav.maintenanceDashboard": "Dashboard Bảo trì",
  "nav.maintenanceSchedule": "Lịch Bảo trì",
  "nav.predictiveMaintenance": "Bảo trì Dự đoán",
  "nav.equipmentQr": "Tra cứu QR",
  "nav.spareParts": "Quản lý Phụ tùng",
  "nav.sparePartsCostReport": "Báo cáo Chi phí",
  "nav.sparePartsGuide": "Hướng dẫn",
  "nav.mmsDataInit": "Khởi tạo Dữ liệu",
  "nav.iotGateway": "IoT Gateway",
  "nav.reportsExport": "Xuất Báo cáo",
  "nav.customReportBuilder": "Tạo Báo cáo",
  "nav.alertConfig": "Cấu hình Cảnh báo",
  "nav.oeeAlertThresholds": "Ngưỡng OEE",
  "nav.ntfConfig": "Cấu hình NTF",
  "nav.ntfDashboard": "Dashboard NTF",
  "nav.productionLine": "Dây chuyền Sản xuất",
  "nav.factories": "Nhà máy",
  "nav.workshops": "Xưởng sản xuất",
  "nav.workstation": "Công trạm",
  "nav.machine": "Máy móc",
  "nav.machineType": "Loại Máy",
  "nav.fixture": "Fixture",
  "nav.process": "Quy trình",
  "nav.productManagement": "Sản phẩm",
  "nav.measurementStandards": "Tiêu chuẩn Đo",
  "nav.measurementStandardsDashboard": "Dashboard Tiêu chuẩn",
  "nav.mappingManagement": "Mapping",
  "nav.spcPlanManagement": "Kế hoạch SPC",
  "nav.quickSpcPlan": "Quick SPC Plan",
  "nav.licenseServerDashboard": "Dashboard License",
  "nav.licenseManagement": "Quản lý License",
  "nav.licenseCustomers": "Khách hàng",
  "nav.licenseRevenue": "Doanh thu",
  "nav.licenseServerSettings": "Cài đặt Server",
  "nav.licensePortal": "Kích hoạt License",
  "nav.userManagement": "Quản lý Người dùng",
  "nav.localUserManagement": "Người dùng Local",
  "nav.loginHistory": "Lịch sử Đăng nhập",
  "nav.organization": "Cấu trúc Tổ chức",
  "nav.approvalWorkflow": "Workflow Phê duyệt",
  "nav.modulePermissions": "Phân quyền Module",
  "nav.pendingApprovals": "Chờ Phê duyệt",
  "nav.settingsAndConnections": "Cài đặt",
  "nav.databaseUnified": "Quản lý Database",
  "nav.databaseWizard": "Database Wizard",
  "nav.dataMigration": "Di chuyển Dữ liệu",
  "nav.schemaComparison": "So sánh Schema",
  "nav.backupHistory": "Backup & Restore",
  "nav.companyInfo": "Thông tin Công ty",
  "nav.emailNotification": "Email Notification",
  "nav.smtpConfig": "Cấu hình SMTP",
  "nav.webhookManagement": "Webhook",
  "nav.notificationCenter": "Trung tâm Thông báo",
  "nav.auditLog": "Audit Log",
  "nav.seedData": "Seed Data",
  "nav.reportTemplates": "Mẫu Báo cáo",
  "nav.exportHistory": "Lịch sử Export",
  "nav.scheduledJobs": "Scheduled Jobs",
  "nav.rateLimitDashboard": "Rate Limit",
  "nav.adminMonitoring": "Admin Monitoring",
  "nav.performanceTrends": "Performance Trends",
  "nav.systemHealth": "System Health",
  "nav.securityDashboard": "Security Dashboard",
  "nav.iotDashboard": "IoT Dashboard",
  "nav.iotDeviceCrud": "Quản lý Thiết bị",
  "nav.iotAlarmCrud": "Quản lý Cảnh báo",
  "nav.iotRealtimeDashboard": "IoT Realtime Dashboard",
  "nav.iotMonitoringRealtime": "Giám sát IoT Realtime",
  "nav.aiModelPerformance": "Hiệu suất AI Model",
  "nav.aiMlDashboard": "AI/ML Dashboard",
  "nav.aiMlHealth": "Sức khỏe AI/ML",
  "nav.aiDataDrift": "Giám sát Data Drift",
  "nav.about": "Thông tin",
  "menuGroup.licenseManagement": "Quản lý License",
  "nav.licenseDashboard": "Dashboard License",
  "nav.licenseNotificationReport": "Báo cáo Thông báo License",
  "nav.imageHistory": "Lịch sử Ảnh (Timeline)",
  "nav.cameraCaptureSchedule": "Lịch Chụp Tự động",
  "nav.qualityStatisticsReport": "Báo cáo Thống kê Chất lượng",
  "nav.userGuide": "Hướng dẫn Sử dụng",
  "nav.videoManagement": "Quản lý Video",
  "menuGroup.myLicense": "License của tôi",
  "nav.myLicenseStatus": "Trạng thái License",
  "nav.activateLicense": "Kích hoạt License",
  "nav.licenseHistory": "Lịch sử License",
  "nav.licenseUsage": "Sử dụng License",
  "nav.licenseSupport": "Hỗ trợ License",
  "nav.systemSettings": "Cài đặt Hệ thống",
  "nav.themeSettings": "Cài đặt Giao diện",
  "nav.generalSettings": "Cài đặt Chung",
  "nav.appSettings": "Cài đặt Ứng dụng",
  "menuGroup.licenseDashboard": "Dashboard License",
  "menuGroup.licenseCustomers": "Khách hàng License",
  "menuGroup.licenseSettings": "Cài đặt License",
  "nav.licenseActivation": "Kích hoạt License",
  "menuGroup.systemInfo": "Thông tin",
  "nav.unifiedAlertKpi": "Dashboard Alert & KPI",
  "nav.alertAnalytics": "Phân tích Cảnh báo",
  "nav.twilioSettings": "Cấu hình Twilio",
  "nav.smsConfig": "Cấu hình SMS",
  "nav.performanceDropAlert": "Cảnh báo Hiệu suất",
  "nav.webhookSettings": "Cấu hình Webhook",
  // AI System labels
  "menuGroup.aiDashboard": "Tổng quan AI",
  "menuGroup.aiAnalysis": "Phân tích AI",
  "menuGroup.aiPredictive": "Dự đoán",
  "menuGroup.aiNlp": "Ngôn ngữ Tự nhiên",
  "menuGroup.aiTraining": "Huấn luyện Model",
  "menuGroup.aiSettings": "Cài đặt AI",
  "nav.aiOverview": "Tổng quan AI",
  "nav.aiPredictions": "Dự đoán AI",
  "nav.aiAlerts": "Cảnh báo AI",
  "nav.aiSpcAnalysis": "Phân tích SPC với AI",
  "nav.aiRootCause": "Phân tích Nguyên nhân",
  "nav.aiCorrelation": "Phân tích Tương quan",
  "nav.aiTrendAnalysis": "Phân tích Xu hướng",
  "nav.aiOeeForecast": "Dự báo OEE",
  "nav.aiDefectPrediction": "Dự đoán Lỗi",
  "nav.aiYieldOptimization": "Tối ưu Năng suất",
  "nav.aiChat": "AI Chat",
  "nav.aiReports": "Báo cáo AI",
  "nav.aiInsights": "Insights AI",
  "nav.aiTrainingJobs": "Huấn luyện Model",
  "nav.aiModelComparison": "So sánh Model",
  "nav.aiModelAccuracy": "Accuracy Dashboard",
  "nav.aiAbTesting": "A/B Testing",
  "nav.aiConfig": "Cấu hình AI",
  "nav.aiThresholds": "Ngưỡng AI",
  "nav.aiDataSources": "Nguồn Dữ liệu AI",
  "nav.aiAuditLogs": "Nhật ký AI",
  // IoT System labels
  "menuGroup.iotOverview": "Tổng quan IoT",
  "menuGroup.iotConnections": "Kết nối",
  "menuGroup.iotConfig": "Cấu hình IoT",
  "nav.sensorDashboard": "Dashboard Cảm biến",
  "nav.mqttConnections": "Kết nối MQTT",
  "nav.opcuaConnections": "Kết nối OPC-UA",
  "nav.iotAlarmThreshold": "Ngưỡng Cảnh báo IoT",
  "nav.cacheMonitoring": "Giám sát Cache",
  "nav.smsNotificationSettings": "Cấu hình SMS",
  "nav.escalationDashboard": "Dashboard Escalation",
  "nav.autoResolveSettings": "Cấu hình Auto-resolve",
  "nav.pushNotificationSettings": "Cài đặt Push Notification",
  "nav.widgetConfig": "Cấu hình Widget",
  "nav.conflictResolution": "Xử lý Xung đột",
  "nav.firmwareOta": "Firmware OTA Update",
  "nav.floorPlanIntegration": "Sơ đồ Mặt bằng",
  "nav.predictiveMaintenanceAI": "Bảo trì Dự đoán AI",
  "nav.iotOverviewDashboard": "Dashboard Tổng quan IoT",
  "nav.notificationPreferences": "Cài đặt Thông báo",
  "nav.mttrMtbfComparison": "So sánh MTTR/MTBF",
  "nav.iotUserGuide": "Hướng dẫn IoT",
  "menuGroup.aiVision": "AI Vision",
  "nav.aiVisionDetection": "Phát hiện Lỗi AI",
  "nav.imageComparison": "So sánh Hình ảnh",
  "nav.snImages": "Hình ảnh SN",
  "nav.snImageCompare": "So sánh SN",
  "nav.snImageHistory": "Lịch sử SN",
  "nav.cameraCapture": "Camera Realtime",
  "nav.alertEmailConfig": "Cấu hình Email Cảnh báo",
  "nav.unifiedRealtimeDashboard": "Dashboard Tổng hợp Realtime",
  "nav.aiVisionAnalysis": "Phân tích AI Vision",
  "nav.floorPlanLive": "Floor Plan Live",
  "nav.aviAoiDashboard": "AVI/AOI Dashboard",
  // AOI/AVI System labels
  "menuGroup.aoiAviOverview": "Tổng quan AOI/AVI",
  "menuGroup.aoiAviInspection": "Kiểm tra",
  "menuGroup.aoiAviAI": "AI & Machine Learning",
  "menuGroup.aoiAviCamera": "Camera",
  "menuGroup.aoiAviReports": "Báo cáo",
  "menuGroup.aoiAviConfig": "Cấu hình",
  "nav.defectDetection": "Phát hiện Lỗi",
  "nav.autoCapture": "Chụp Tự động",
  "nav.defectStatistics": "Thống kê Lỗi",
  "nav.realtimeInspection": "Kiểm tra Realtime",
  "nav.goldenSample": "Mẫu Chuẩn",
  "nav.goldenSampleManager": "Quản lý Mẫu Chuẩn",
  "nav.defectTypeManager": "Quản lý Loại Lỗi",
  "nav.aoiAviSummary": "Dashboard Tổng hợp",
  "nav.aiModelManagement": "Quản lý Model AI",
  "nav.aiTrainingData": "Dữ liệu Training",
  "nav.aiAccuracyReport": "Báo cáo Độ chính xác",
  "nav.defectClassification": "Phân loại Lỗi",
  "nav.cameraCalibration": "Hiệu chuẩn Camera",
  "nav.defectPareto": "Pareto Lỗi",
  "nav.inspectionTrend": "Xu hướng Kiểm tra",
  "nav.yieldAnalysis": "Phân tích Yield",
  "nav.inspectionRules": "Quy tắc Kiểm tra",
  "nav.defectCategories": "Danh mục Lỗi",
  "nav.notificationHistory": "Lịch sử Thông báo",
  // Factory Visualization labels
  "menuGroup.factoryVisualization": "Trực quan hóa Nhà máy",
  "nav.floorPlanDesigner": "Thiết kế Sơ đồ",
  "nav.floorPlan2D": "Sơ đồ 2D",
  "nav.floorPlan3D": "Sơ đồ 3D",
  "nav.model3DManagement": "Quản lý Model 3D",
  "nav.floorPlanHeatmap": "Bản đồ Nhiệt",
  "nav.iotFloorPlan": "Sơ đồ IoT",
  "nav.iot3DFloorPlan": "Sơ đồ 3D IoT",
};

const fallbackLabelsEn: Record<string, string> = {
  "menuGroup.dashboardOverview": "Overview",
  "menuGroup.quickAccess": "Quick Access",
  "menuGroup.dashboardReports": "Reports",
  "nav.mainDashboard": "Main Dashboard",
  "nav.shiftReport": "Shift Report",
  "menuGroup.spcOverview": "SPC Overview",
  "menuGroup.spcAnalysis": "Analysis",
  "menuGroup.spcQuality": "Quality",
  "menuGroup.spcConfig": "SPC Config",
  "menuGroup.spcRealtime": "Realtime SPC",
  "menuGroup.mmsOverview": "MMS Overview",
  "menuGroup.mmsMaintenance": "Maintenance",
  "menuGroup.mmsSpareParts": "Spare Parts",
  "menuGroup.mmsConfig": "MMS Config",
  "menuGroup.production": "Production Management",
  "menuGroup.masterData": "Master Data",
  "menuGroup.licenseOverview": "License Overview",
  "menuGroup.licenseRevenue": "Revenue",
  "menuGroup.licenseActivation": "Activation",
  "menuGroup.users": "Users",
  "menuGroup.system": "System",
  "menuGroup.notifications": "Notifications",
  "menuGroup.notificationChannels": "Notification Channels",
  "menuGroup.notificationWebhooks": "Webhooks",
  "menuGroup.notificationMonitoring": "Alert Monitoring",
  "menuGroup.systemTools": "Tools",
  "nav.dashboard": "Dashboard",
  "nav.realtimeLine": "Realtime Dashboard",
  "nav.machineOverview": "Machine Overview",
  "nav.machineStatusReport": "Status Report",
  "nav.spcPlanOverview": "SPC Plan Overview",
  "nav.supervisorDashboard": "Supervisor Dashboard",
  "nav.analyze": "SPC/CPK Analysis",
  "nav.anomalyDetection": "AI Anomaly Detection",
  "nav.multiObjectAnalysis": "Multi-object Analysis",
  "nav.lineComparison": "Line Comparison",
  "nav.machineComparison": "Machine Comparison",
  "nav.history": "Analysis History",
  "nav.spcReport": "SPC Report",
  "nav.defectTracking": "Defect Tracking",
  "nav.defectAnalysis": "Defect Analysis",
  "nav.spcRulesConfig": "SPC Rules Config",
  "nav.customValidation": "Validation Rules",
  "nav.cpkBenchmark": "CPK Comparison",
  "nav.shiftAnalysis": "Shift Analysis",
  "nav.cpkForecast": "CPK Forecast",
  "nav.shiftManager": "Shift Manager Dashboard",
  "nav.kpiAlertThresholds": "KPI Alert Thresholds",
  "nav.kpiAlertStats": "KPI Alert Stats",
  "nav.weeklyKpiTrend": "Weekly KPI Trend",
  "nav.scheduledKpiReports": "Scheduled KPI Reports",
  "nav.realtimeConveyor": "Realtime Conveyor",
  "nav.productionLineStatus": "Production Line Status",
  "nav.realtimeMachineConfig": "Realtime Machine Config",
  "nav.realtimeHistory": "Realtime History",
  "nav.alarmThreshold": "Alarm Threshold",
  "nav.machineAreas": "Machine Areas",
  "nav.oeeDashboard": "OEE Dashboard",
  "nav.oeeAnalysis": "OEE Analysis",
  "nav.unifiedDashboard": "Unified Dashboard",
  "nav.plantKpi": "Plant KPI",
  "nav.advancedAnalytics": "Advanced Analytics",
  "nav.maintenanceDashboard": "Maintenance Dashboard",
  "nav.maintenanceSchedule": "Maintenance Schedule",
  "nav.predictiveMaintenance": "Predictive Maintenance",
  "nav.equipmentQr": "Equipment QR Lookup",
  "nav.spareParts": "Spare Parts",
  "nav.sparePartsCostReport": "Cost Report",
  "nav.sparePartsGuide": "User Guide",
  "nav.mmsDataInit": "Data Init",
  "nav.iotGateway": "IoT Gateway",
  "nav.reportsExport": "Export Reports",
  "nav.customReportBuilder": "Report Builder",
  "nav.alertConfig": "Alert Config",
  "nav.oeeAlertThresholds": "OEE Thresholds",
  "nav.ntfConfig": "NTF Config",
  "nav.ntfDashboard": "NTF Dashboard",
  "nav.productionLine": "Production Lines",
  "nav.workstation": "Workstations",
  "nav.machine": "Machines",
  "nav.machineType": "Machine Types",
  "nav.fixture": "Fixtures",
  "nav.process": "Processes",
  "nav.productManagement": "Products",
  "nav.measurementStandards": "Measurement Standards",
  "nav.measurementStandardsDashboard": "Standards Dashboard",
  "nav.mappingManagement": "Mappings",
  "nav.spcPlanManagement": "SPC Plans",
  "nav.quickSpcPlan": "Quick SPC Plan",
  "nav.licenseServerDashboard": "License Dashboard",
  "nav.licenseManagement": "License Management",
  "nav.licenseCustomers": "Customers",
  "nav.licenseRevenue": "Revenue",
  "nav.licenseServerSettings": "Server Settings",
  "nav.licensePortal": "License Activation",
  "nav.userManagement": "User Management",
  "nav.localUserManagement": "Local Users",
  "nav.loginHistory": "Login History",
  "nav.organization": "Organization",
  "nav.approvalWorkflow": "Approval Workflow",
  "nav.modulePermissions": "Module Permissions",
  "nav.pendingApprovals": "Pending Approvals",
  "nav.settingsAndConnections": "Settings",
  "nav.databaseUnified": "Database Management",
  "nav.databaseWizard": "Database Wizard",
  "nav.dataMigration": "Data Migration",
  "nav.schemaComparison": "Schema Comparison",
  "nav.backupHistory": "Backup & Restore",
  "nav.companyInfo": "Company Info",
  "nav.emailNotification": "Email Notification",
  "nav.smtpConfig": "SMTP Config",
  "nav.webhookManagement": "Webhooks",
  "nav.notificationCenter": "Notification Center",
  "nav.auditLog": "Audit Log",
  "nav.seedData": "Seed Data",
  "nav.reportTemplates": "Report Templates",
  "nav.exportHistory": "Export History",
  "nav.scheduledJobs": "Scheduled Jobs",
  "nav.rateLimitDashboard": "Rate Limit",
  "nav.adminMonitoring": "Admin Monitoring",
  "nav.performanceTrends": "Performance Trends",
  "nav.systemHealth": "System Health",
  "nav.securityDashboard": "Security Dashboard",
  "nav.iotDashboard": "IoT Dashboard",
  "nav.iotDeviceCrud": "Quản lý Thiết bị",
  "nav.iotAlarmCrud": "Quản lý Cảnh báo",
  "nav.iotRealtimeDashboard": "IoT Realtime Dashboard",
  "nav.iotMonitoringRealtime": "IoT Monitoring Realtime",
  "nav.aiModelPerformance": "AI Model Performance",
  "nav.aiMlDashboard": "AI/ML Dashboard",
  "nav.aiMlHealth": "AI/ML Health",
  "nav.aiDataDrift": "Data Drift Monitoring",
  "nav.about": "About",
  "menuGroup.licenseManagement": "License Management",
  "nav.licenseDashboard": "License Dashboard",
  "nav.licenseNotificationReport": "License Notification Report",
  "nav.userGuide": "User Guide",
  "menuGroup.myLicense": "My License",
  "nav.myLicenseStatus": "License Status",
  "nav.activateLicense": "Activate License",
  "nav.licenseHistory": "License History",
  "nav.licenseUsage": "License Usage",
  "nav.licenseSupport": "License Support",
  "nav.systemSettings": "System Settings",
  "nav.themeSettings": "Theme Settings",
  "nav.generalSettings": "General Settings",
  "nav.appSettings": "Application Settings",
  "menuGroup.licenseDashboard": "License Dashboard",
  "menuGroup.licenseCustomers": "License Customers",
  "menuGroup.licenseSettings": "License Settings",
  "nav.licenseActivation": "License Activation",
  "menuGroup.systemInfo": "Information",
  "nav.unifiedAlertKpi": "Unified Alert & KPI Dashboard",
  "nav.alertAnalytics": "Alert Analytics",
  "nav.twilioSettings": "Twilio Settings",
  "nav.smsConfig": "SMS Configuration",
  "nav.performanceDropAlert": "Performance Drop Alert",
  "nav.webhookSettings": "Webhook Settings",
  // AI System labels
  "menuGroup.aiDashboard": "AI Dashboard",
  "menuGroup.aiAnalysis": "AI Analysis",
  "menuGroup.aiPredictive": "Predictive",
  "menuGroup.aiNlp": "Natural Language",
  "menuGroup.aiTraining": "Model Training",
  "menuGroup.aiSettings": "AI Settings",
  "nav.aiOverview": "AI Overview",
  "nav.aiPredictions": "AI Predictions",
  "nav.aiAlerts": "AI Alerts",
  "nav.aiSpcAnalysis": "AI SPC Analysis",
  "nav.aiRootCause": "Root Cause Analysis",
  "nav.aiCorrelation": "Correlation Analysis",
  "nav.aiTrendAnalysis": "Trend Analysis",
  "nav.aiOeeForecast": "OEE Forecast",
  "nav.aiDefectPrediction": "Defect Prediction",
  "nav.aiYieldOptimization": "Yield Optimization",
  "nav.aiChat": "AI Chat",
  "nav.aiReports": "AI Reports",
  "nav.aiInsights": "AI Insights",
  "nav.aiTrainingJobs": "Training Jobs",
  "nav.aiModelComparison": "Model Comparison",
  "nav.aiModelAccuracy": "Accuracy Dashboard",
  "nav.aiAbTesting": "A/B Testing",
  "nav.aiAnalyticsDashboard": "AI Analytics Dashboard",
  "nav.aiConfig": "AI Configuration",
  "nav.aiThresholds": "AI Thresholds",
  "nav.aiDataSources": "AI Data Sources",
  "nav.aiAuditLogs": "AI Audit Logs",
  // IoT System labels
  "menuGroup.iotOverview": "IoT Overview",
  "menuGroup.iotConnections": "Connections",
  "menuGroup.iotConfig": "IoT Configuration",
  "nav.sensorDashboard": "Sensor Dashboard",
  "nav.mqttConnections": "MQTT Connections",
  "nav.opcuaConnections": "OPC-UA Connections",
  "nav.iotAlarmThreshold": "IoT Alarm Thresholds",
  "nav.firmwareOta": "Firmware OTA Update",
  "nav.floorPlanIntegration": "Floor Plan Integration",
  "nav.predictiveMaintenanceAI": "Predictive Maintenance AI",
  "nav.cacheMonitoring": "Cache Monitoring",
  "nav.smsNotificationSettings": "SMS Settings",
  "nav.escalationDashboard": "Escalation Dashboard",
  "nav.autoResolveSettings": "Auto-resolve Settings",
  "nav.pushNotificationSettings": "Push Notification Settings",
  "nav.widgetConfig": "Widget Configuration",
  "nav.conflictResolution": "Conflict Resolution",
  "nav.iotOverviewDashboard": "IoT Overview Dashboard",
  "nav.notificationPreferences": "Notification Preferences",
  "nav.mttrMtbfComparison": "MTTR/MTBF Comparison",
  "nav.iotUserGuide": "IoT User Guide",
  "menuGroup.aiVision": "AI Vision",
  "nav.aiVisionDetection": "AI Defect Detection",
  "nav.imageComparison": "Image Comparison",
  "nav.cameraCapture": "Camera Realtime",
  "nav.alertEmailConfig": "Alert Email Config",
  "nav.unifiedRealtimeDashboard": "Unified Realtime Dashboard",
  "nav.aiVisionAnalysis": "AI Vision Analysis",
  "nav.floorPlanLive": "Floor Plan Live",
  "nav.aviAoiDashboard": "Dashboard AVI/AOI",
  "nav.dashboardCustomization": "Dashboard Customization",
  "nav.batchImageAnalysis": "Batch Image Analysis",
  // AOI/AVI System labels
  "menuGroup.aoiAviOverview": "AOI/AVI Overview",
  "menuGroup.aoiAviInspection": "Inspection",
  "menuGroup.aoiAviAI": "AI & Machine Learning",
  "menuGroup.aoiAviCamera": "Camera",
  "menuGroup.aoiAviReports": "Reports",
  "menuGroup.aoiAviConfig": "Configuration",
  "nav.defectDetection": "Defect Detection",
  "nav.autoCapture": "Auto Capture",
  "nav.defectStatistics": "Defect Statistics",
  "nav.snImages": "SN Images",
  "nav.snImageCompare": "SN Compare",
  "nav.snImageHistory": "SN History",
  "nav.realtimeInspection": "Realtime Inspection",
  "nav.goldenSample": "Golden Sample",
  "nav.goldenSampleManager": "Golden Sample Manager",
  "nav.defectTypeManager": "Defect Type Manager",
  "nav.aoiAviSummary": "Summary Dashboard",
  "nav.aiModelManagement": "AI Model Management",
  "nav.aiTrainingData": "Training Data",
  "nav.aiAccuracyReport": "Accuracy Report",
  "nav.defectClassification": "Defect Classification",
  "nav.cameraCalibration": "Camera Calibration",
  "nav.defectPareto": "Defect Pareto",
  "nav.inspectionTrend": "Inspection Trend",
  "nav.yieldAnalysis": "Yield Analysis",
  "nav.inspectionRules": "Inspection Rules",
  "nav.defectCategories": "Defect Categories",
  "nav.notificationHistory": "Notification History",
  // Factory Visualization labels
  "menuGroup.factoryVisualization": "Factory Visualization",
  "nav.floorPlanDesigner": "Floor Plan Designer",
  "nav.floorPlan2D": "2D Floor Plan",
  "nav.floorPlan3D": "3D Floor Plan",
  "nav.model3DManagement": "3D Model Management",
  "nav.floorPlanHeatmap": "Heat Map",
  "nav.iotFloorPlan": "IoT Floor Plan",
  "nav.iot3DFloorPlan": "3D IoT Floor Plan",
};

const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const MENU_OPEN_STATE_KEY = "dashboard-menu-open-state";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const { systemConfig, activeSystem } = useSystem();

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    window.location.href = getLoginUrl();
    return <DashboardLayoutSkeleton />;
  }

  return (
    <SidebarProvider
      defaultOpen={true}
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
          "--sidebar-width-icon": "60px",
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { translate, language } = useLanguage();
  const { systemConfig, systemMenu, activeSystem } = useSystem();
  const { theme, setTheme } = useTheme();
  
  // Load Quick Access items dynamically
  const { 
    quickAccessMenuItems, 
    pinnedItems, 
    hasQuickAccess, 
    hasPinnedItems, 
    maxPinned, 
    categories: quickAccessCategories,
    uncategorizedItems,
    hasCategories,
    refetch: refetchQuickAccess 
  } = useQuickAccess();
  
  // Get menu groups from current system - memoized to prevent infinite loops
  // Inject Quick Access items dynamically for Dashboard system
  const menuGroups = useMemo(() => {
    const groups = systemMenu?.menuGroups || [];
    
    // If Dashboard system and has Quick Access items, inject them
    if (activeSystem === 'dashboard' && hasQuickAccess) {
      return groups.map(group => {
        if (group.id === 'quick-access') {
          return {
            ...group,
            items: quickAccessMenuItems,
          };
        }
        return group;
      });
    }
    
    // Filter out empty Quick Access group if no items
    if (activeSystem === 'dashboard') {
      return groups.filter(group => group.id !== 'quick-access' || hasQuickAccess);
    }
    
    return groups;
  }, [systemMenu, activeSystem, quickAccessMenuItems, hasQuickAccess]);
  
  // Menu open state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Reset open state when system changes
  useEffect(() => {
    // Skip if no menuGroups (e.g., when activeSystem is "dashboard")
    if (menuGroups.length === 0) {
      setOpenGroups({});
      return;
    }
    
    const saved = localStorage.getItem(`${MENU_OPEN_STATE_KEY}-${activeSystem}`);
    if (saved) {
      try {
        setOpenGroups(JSON.parse(saved));
        return;
      } catch {
        // Fall through to defaults
      }
    }
    
    // Default: open groups that have defaultOpen or contain active item
    const defaults: Record<string, boolean> = {};
    menuGroups.forEach(group => {
      defaults[group.id] = group.defaultOpen || group.items.some(item => item.path === location);
    });
    setOpenGroups(defaults);
  }, [activeSystem, menuGroups, location]);

  // Save open state to localStorage
  useEffect(() => {
    localStorage.setItem(`${MENU_OPEN_STATE_KEY}-${activeSystem}`, JSON.stringify(openGroups));
  }, [openGroups, activeSystem]);

  // Get label for menu item based on current language
  const getLabel = (labelKey: string) => {
    const translated = translate(labelKey);
    if (translated !== labelKey) return translated;
    const fallbackLabels = language === 'en' ? fallbackLabelsEn : fallbackLabelsVi;
    return fallbackLabels[labelKey] || labelKey;
  };
  
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Filter items based on user role
  const filterItems = (items: SystemMenuItem[]) => {
    return items.filter(item => !item.adminOnly || user?.role === "admin");
  };

  // Get system color class
  const getSystemColorClass = () => {
    switch (activeSystem) {
      case "dashboard": return "text-emerald-600 dark:text-emerald-400";
      case "spc": return "text-blue-600 dark:text-blue-400";
      case "mms": return "text-orange-600 dark:text-orange-400";
      case "production": return "text-green-600 dark:text-green-400";
      case "iot": return "text-cyan-600 dark:text-cyan-400";
      case "ai": return "text-violet-600 dark:text-violet-400";
      case "license": return "text-purple-600 dark:text-purple-400";
      case "system": return "text-slate-600 dark:text-slate-400";
      default: return "text-primary";
    }
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && systemConfig ? (
                <div className="flex items-center gap-2 min-w-0">
                  <systemConfig.icon className={`h-5 w-5 ${getSystemColorClass()}`} />
                  <span className={`font-semibold tracking-tight truncate ${getSystemColorClass()}`}>
                    {systemConfig.shortName}
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 overflow-y-auto">
            {menuGroups.map(group => {
              const filteredItems = filterItems(group.items);
              if (filteredItems.length === 0) return null;
              
              const isGroupActive = filteredItems.some(item => item.path === location);
              const isOpen = openGroups[group.id] ?? group.defaultOpen ?? false;

              if (isCollapsed) {
                // When collapsed, show only icons
                return (
                  <SidebarMenu key={group.id} className="px-2 py-1">
                    {filteredItems.map(item => {
                      const isActive = location === item.path;
                      const label = getLabel(item.labelKey);
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => setLocation(item.path)}
                            tooltip={label}
                            className="h-10 transition-all font-normal"
                          >
                            <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                            <span>{label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                );
              }

              // Check if this is Quick Access group
              const isQuickAccessGroup = group.id === 'quick-access';

              return (
                <Collapsible
                  key={group.id}
                  open={isOpen}
                  onOpenChange={() => toggleGroup(group.id)}
                  className="group/collapsible"
                >
                  <div className="px-2 py-1">
                    <div className="flex items-center">
                      <CollapsibleTrigger asChild>
                        <button
                          className={`flex items-center gap-2 flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-accent ${
                            isGroupActive ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          <group.icon className="h-4 w-4" />
                          <span className="flex-1 text-left">{getLabel(group.labelKey)}</span>
                          <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                        </button>
                      </CollapsibleTrigger>
                      {isQuickAccessGroup && (
                        <QuickAccessAddDialog 
                          onSuccess={refetchQuickAccess}
                          trigger={
                            <button 
                              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                              title="Thêm menu vào Quick Access"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          }
                        />
                      )}
                    </div>
                    <CollapsibleContent className="mt-1 space-y-1">
                      {/* Pinned Items Section */}
                      {isQuickAccessGroup && hasPinnedItems && (
                        <div className="mb-2 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                          <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-muted-foreground">
                            <Pin className="h-3 w-3 animate-pulse" />
                            <span>Đã ghim</span>
                            <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded">
                              {pinnedItems.length}/{maxPinned}
                            </span>
                          </div>
                          <SidebarMenu>
                            {pinnedItems.map((item, index) => {
                              const isActive = location === item.menuPath;
                              return (
                                <SidebarMenuItem 
                                  key={`pinned-${item.id}`}
                                  className="animate-in fade-in-0 slide-in-from-left-2"
                                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                                >
                                  <MenuItemContextMenu
                                    menuId={item.menuId}
                                    menuPath={item.menuPath}
                                    menuLabel={item.menuLabel}
                                    menuIcon={item.icon?.name}
                                    systemId={activeSystem}
                                  >
                                    <SidebarMenuButton
                                      isActive={isActive}
                                      onClick={() => setLocation(item.menuPath)}
                                      tooltip={item.menuLabel}
                                      className="h-9 pl-9 transition-all font-normal group/pin-item"
                                    >
                                      <item.icon className={`h-4 w-4 transition-transform group-hover/pin-item:scale-110 ${isActive ? "text-primary" : ""}`} />
                                      <span className="truncate">{item.menuLabel}</span>
                                      <Pin className="h-3 w-3 ml-auto text-amber-500 transition-transform group-hover/pin-item:rotate-12" />
                                    </SidebarMenuButton>
                                  </MenuItemContextMenu>
                                </SidebarMenuItem>
                              );
                            })}
                          </SidebarMenu>
                        </div>
                      )}
                      
                      {/* Categories Section - Only for Quick Access */}
                      {isQuickAccessGroup && hasCategories && (
                        <div className="space-y-1">
                          {quickAccessCategories.map((category) => (
                            <Collapsible
                              key={`cat-${category.id}`}
                              defaultOpen={category.isExpanded}
                              className="group/category"
                            >
                              <div className="flex items-center gap-1 px-3 py-1">
                                <CollapsibleTrigger asChild>
                                  <button className="flex items-center gap-1.5 flex-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                                    <Folder 
                                      className="h-3 w-3 group-data-[state=open]/category:hidden" 
                                      style={{ color: category.color }}
                                    />
                                    <FolderOpen 
                                      className="h-3 w-3 hidden group-data-[state=open]/category:block" 
                                      style={{ color: category.color }}
                                    />
                                    <span>{category.name}</span>
                                    <span className="text-[10px] bg-muted px-1 py-0.5 rounded ml-auto">
                                      {category.items.length}
                                    </span>
                                  </button>
                                </CollapsibleTrigger>
                              </div>
                              <CollapsibleContent>
                                <SidebarMenu>
                                  {category.items.map(item => {
                                    const isActive = location === item.menuPath;
                                    return (
                                      <SidebarMenuItem key={`cat-${category.id}-${item.id}`}>
                                        <MenuItemContextMenu
                                          menuId={item.menuId}
                                          menuPath={item.menuPath}
                                          menuLabel={item.menuLabel}
                                          menuIcon={item.icon?.name}
                                          systemId={activeSystem}
                                        >
                                          <SidebarMenuButton
                                            isActive={isActive}
                                            onClick={() => setLocation(item.menuPath)}
                                            tooltip={item.menuLabel}
                                            className="h-8 pl-11 transition-all font-normal text-sm"
                                          >
                                            <item.icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : ""}`} />
                                            <span className="truncate">{item.menuLabel}</span>
                                          </SidebarMenuButton>
                                        </MenuItemContextMenu>
                                      </SidebarMenuItem>
                                    );
                                  })}
                                </SidebarMenu>
                              </CollapsibleContent>
                            </Collapsible>
                          ))}
                        </div>
                      )}
                      
                      {/* Uncategorized Items - Only for Quick Access */}
                      {isQuickAccessGroup && uncategorizedItems.length > 0 && (
                        <div className="mt-1">
                          <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-muted-foreground">
                            <Star className="h-3 w-3" />
                            <span>Chưa phân loại</span>
                            <span className="text-[10px] bg-muted px-1 py-0.5 rounded ml-auto">
                              {uncategorizedItems.length}
                            </span>
                          </div>
                          <SidebarMenu>
                            {uncategorizedItems.map(item => {
                              const isActive = location === item.menuPath;
                              return (
                                <SidebarMenuItem key={`uncat-${item.id}`}>
                                  <MenuItemContextMenu
                                    menuId={item.menuId}
                                    menuPath={item.menuPath}
                                    menuLabel={item.menuLabel}
                                    menuIcon={item.icon?.name}
                                    systemId={activeSystem}
                                  >
                                    <SidebarMenuButton
                                      isActive={isActive}
                                      onClick={() => setLocation(item.menuPath)}
                                      tooltip={item.menuLabel}
                                      className="h-9 pl-9 transition-all font-normal"
                                    >
                                      <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                                      <span className="truncate">{item.menuLabel}</span>
                                    </SidebarMenuButton>
                                  </MenuItemContextMenu>
                                </SidebarMenuItem>
                              );
                            })}
                          </SidebarMenu>
                        </div>
                      )}
                      
                      {/* Regular Items - For non-Quick Access groups */}
                      {!isQuickAccessGroup && (
                        <SidebarMenu>
                          {filteredItems.map(item => {
                            const isActive = location === item.path;
                            const label = getLabel(item.labelKey);
                            return (
                              <SidebarMenuItem key={item.path}>
                                <MenuItemContextMenu
                                  menuId={item.id}
                                  menuPath={item.path}
                                  menuLabel={label}
                                  menuIcon={item.icon?.name}
                                  systemId={activeSystem}
                                >
                                  <SidebarMenuButton
                                    isActive={isActive}
                                    onClick={() => setLocation(item.path)}
                                    tooltip={label}
                                    className="h-9 pl-9 transition-all font-normal"
                                  >
                                    <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                                    <span className="truncate">{label}</span>
                                  </SidebarMenuButton>
                                </MenuItemContextMenu>
                              </SidebarMenuItem>
                            );
                          })}
                        </SidebarMenu>
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </SidebarContent>

          {/* User menu removed from sidebar - now only in header */}
        </Sidebar>

        {/* Resize handle */}
        {!isCollapsed && !isMobile && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors z-10"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
          />
        )}
      </div>

      <SidebarInset className="flex flex-col min-h-screen">
        <header className="h-16 shrink-0 flex items-center gap-2 border-b px-4 lg:px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger className="-ml-1 lg:hidden" />
          
          {/* Logo - configurable via VITE_APP_LOGO - Click to go to Dashboard */}
          <button 
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-2 mr-2 hover:opacity-80 transition-opacity cursor-pointer"
            title={language === 'en' ? 'Go to Dashboard' : 'Về Bảng điều khiển'}
          >
            <img 
              src={import.meta.env.VITE_APP_LOGO || "https://files.manuscdn.com/user_upload_by_module/session_file/310519663243606474/jLjFIplRgffsFopW.png"} 
              alt={import.meta.env.VITE_APP_TITLE || "Logo"} 
              className="h-8 w-8 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="hidden md:inline font-bold text-lg bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {import.meta.env.VITE_APP_TITLE || "MMS/SPC"}
            </span>
          </button>
          
          {/* Top Navigation Menu */}
          <TopNavigation />
          
          <div className="flex-1" />
          
          {/* Right side controls */}
          <div className="flex items-center gap-1">
            {/* Dark Mode Only - Theme controls removed */}
            
            {/* Desktop: SyncStatusIndicator, Mobile: MobileOfflineSyncIndicator */}
            {isMobile ? (
              <MobileOfflineSyncIndicator />
            ) : (
              <SyncStatusIndicator />
            )}
            <SseIndicator />
            <WebSocketIndicator />
            <NotificationBell />
            
            <div className="h-6 w-px bg-border mx-1 hidden lg:block" />
            
            {/* User Avatar Menu - Right side */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 border-2 border-primary/20">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden xl:flex flex-col items-start">
                    <span className="text-sm font-medium leading-none">{user?.name}</span>
                    <span className="text-xs text-muted-foreground leading-none mt-0.5">{user?.email?.split('@')[0]}</span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-3 py-2 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>
                <DropdownMenuItem onClick={() => setLocation("/profile")} className="py-2">
                  <User className="mr-2 h-4 w-4" />
                  {language === 'en' ? 'Profile' : 'Hồ sơ cá nhân'}
                </DropdownMenuItem>
                <LanguageSwitcher />
                <div className="border-t my-1" />
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    setLocation("/");
                  }}
                  className="text-destructive focus:text-destructive py-2"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {language === 'en' ? 'Sign out' : 'Đăng xuất'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
      
      {/* Quick Access Search Dialog - Ctrl+K */}
      <QuickAccessSearch />
    </>
  );
}
