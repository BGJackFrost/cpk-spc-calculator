/**
 * API Documentation Service
 * Generates OpenAPI 3.0 specification from tRPC router definitions
 * and serves Swagger UI for interactive API exploration
 */

interface EndpointInfo {
  path: string;
  method: 'GET' | 'POST';
  summary: string;
  description: string;
  tags: string[];
  auth: 'public' | 'protected';
  inputSchema?: Record<string, any>;
  outputDescription?: string;
}

// Module categories for organizing endpoints
const MODULE_CATEGORIES: Record<string, { name: string; description: string }> = {
  // Core
  auth: { name: 'Authentication', description: 'Xác thực người dùng, OAuth, đăng nhập/đăng xuất' },
  localAuth: { name: 'Local Authentication', description: 'Đăng ký, đăng nhập local, 2FA, reset mật khẩu' },
  user: { name: 'User Management', description: 'Quản lý thông tin người dùng, avatar, profile' },
  permission: { name: 'Permissions', description: 'Phân quyền và quản lý vai trò' },
  system: { name: 'System', description: 'Thông tin hệ thống, thông báo owner' },

  // SPC/CPK Core
  spc: { name: 'SPC Analysis', description: 'Phân tích kiểm soát quy trình thống kê (SPC)' },
  cpkHistory: { name: 'CPK History', description: 'Lịch sử tính toán CPK' },
  cpkAlert: { name: 'CPK Alerts', description: 'Cảnh báo CPK vượt ngưỡng' },
  scheduledCpkCheck: { name: 'Scheduled CPK Check', description: 'Kiểm tra CPK tự động theo lịch' },
  spcPlan: { name: 'SPC Plans', description: 'Kế hoạch kiểm soát SPC' },
  spcRules: { name: 'SPC Rules', description: 'Quy tắc kiểm soát SPC (Western Electric, Nelson)' },
  sampling: { name: 'Sampling', description: 'Cấu hình lấy mẫu' },

  // Products & Production
  product: { name: 'Products', description: 'Quản lý sản phẩm' },
  productSpec: { name: 'Product Specifications', description: 'Thông số kỹ thuật sản phẩm' },
  productionLine: { name: 'Production Lines', description: 'Quản lý dây chuyền sản xuất' },
  workstation: { name: 'Workstations', description: 'Quản lý trạm làm việc' },
  machine: { name: 'Machines', description: 'Quản lý máy móc' },
  machineType: { name: 'Machine Types', description: 'Loại máy móc' },
  machineStatus: { name: 'Machine Status', description: 'Trạng thái máy móc realtime' },
  machineArea: { name: 'Machine Areas', description: 'Khu vực máy móc' },
  machineIntegration: { name: 'Machine Integration', description: 'Tích hợp máy móc' },
  machineApi: { name: 'Machine API', description: 'API công khai cho máy móc' },
  fixture: { name: 'Fixtures', description: 'Quản lý đồ gá' },
  jig: { name: 'Jigs', description: 'Quản lý jig' },
  defect: { name: 'Defects', description: 'Quản lý lỗi sản phẩm' },

  // OEE & Maintenance
  oee: { name: 'OEE', description: 'Hiệu suất thiết bị tổng thể (OEE)' },
  oeeThresholds: { name: 'OEE Thresholds', description: 'Ngưỡng cảnh báo OEE' },
  scheduledOeeReport: { name: 'Scheduled OEE Reports', description: 'Báo cáo OEE tự động' },
  maintenance: { name: 'Maintenance', description: 'Quản lý bảo trì' },
  maintenanceWorkOrder: { name: 'Work Orders', description: 'Lệnh công việc bảo trì' },
  spareParts: { name: 'Spare Parts', description: 'Quản lý phụ tùng thay thế' },
  predictiveMaintenance: { name: 'Predictive Maintenance', description: 'Bảo trì dự đoán' },
  mttrMtbf: { name: 'MTTR/MTBF', description: 'Phân tích MTTR/MTBF' },
  mttrMtbfAlert: { name: 'MTTR/MTBF Alerts', description: 'Cảnh báo MTTR/MTBF' },
  mttrMtbfComparison: { name: 'MTTR/MTBF Comparison', description: 'So sánh MTTR/MTBF' },
  mttrMtbfPrediction: { name: 'MTTR/MTBF Prediction', description: 'Dự đoán MTTR/MTBF' },
  scheduledMttrMtbf: { name: 'Scheduled MTTR/MTBF', description: 'Báo cáo MTTR/MTBF tự động' },

  // IoT
  iotDashboard: { name: 'IoT Dashboard', description: 'Dashboard IoT' },
  iotExport: { name: 'IoT Export', description: 'Xuất dữ liệu IoT' },
  iotCrud: { name: 'IoT CRUD', description: 'Quản lý thiết bị IoT' },
  iotAlert: { name: 'IoT Alerts', description: 'Cảnh báo IoT' },
  iotAlertEscalation: { name: 'IoT Alert Escalation', description: 'Leo thang cảnh báo IoT' },
  iotAnalytics: { name: 'IoT Analytics', description: 'Phân tích dữ liệu IoT' },
  iotDeviceManagement: { name: 'IoT Device Management', description: 'Quản lý thiết bị IoT' },
  iotOeeAlert: { name: 'IoT OEE Alerts', description: 'Cảnh báo OEE từ IoT' },
  iotProtocol: { name: 'IoT Protocols', description: 'Giao thức IoT (MQTT, OPC-UA)' },
  iotSensor: { name: 'IoT Sensors', description: 'Quản lý cảm biến IoT' },
  mqtt: { name: 'MQTT', description: 'Kết nối MQTT broker' },
  edgeGateway: { name: 'Edge Gateway', description: 'Gateway biên IoT' },
  edgeSimulator: { name: 'Edge Simulator', description: 'Mô phỏng thiết bị biên' },
  timeseries: { name: 'Time Series', description: 'Dữ liệu chuỗi thời gian' },

  // AI & Vision
  ai: { name: 'AI Analysis', description: 'Phân tích AI cho SPC/CPK' },
  aiAdvanced: { name: 'AI Advanced', description: 'Tính năng AI nâng cao' },
  aiTraining: { name: 'AI Training', description: 'Huấn luyện mô hình AI' },
  aiExport: { name: 'AI Export', description: 'Xuất kết quả AI' },
  aiVisionDashboard: { name: 'AI Vision Dashboard', description: 'Dashboard AI Vision' },
  aiImageComparison: { name: 'AI Image Comparison', description: 'So sánh hình ảnh AI' },
  vision: { name: 'Vision Inspection', description: 'Kiểm tra thị giác' },
  batchImageAnalysis: { name: 'Batch Image Analysis', description: 'Phân tích hình ảnh hàng loạt' },
  qualityImage: { name: 'Quality Images', description: 'Hình ảnh chất lượng' },
  anomalyDetectionAI: { name: 'Anomaly Detection AI', description: 'Phát hiện bất thường bằng AI' },
  anomalyAlert: { name: 'Anomaly Alerts', description: 'Cảnh báo bất thường' },
  modelAutoRetrain: { name: 'Model Auto Retrain', description: 'Tự động huấn luyện lại mô hình' },
  predictiveAnalytics: { name: 'Predictive Analytics', description: 'Phân tích dự đoán' },
  predictiveAlert: { name: 'Predictive Alerts', description: 'Cảnh báo dự đoán' },

  // Quality & Statistics
  qualityStatistics: { name: 'Quality Statistics', description: 'Thống kê chất lượng' },
  qualityTrend: { name: 'Quality Trends', description: 'Xu hướng chất lượng' },
  heatMapYield: { name: 'Heat Map Yield', description: 'Bản đồ nhiệt năng suất' },
  paretoChart: { name: 'Pareto Chart', description: 'Biểu đồ Pareto' },
  lineComparison: { name: 'Line Comparison', description: 'So sánh dây chuyền' },
  lineComparisonExport: { name: 'Line Comparison Export', description: 'Xuất so sánh dây chuyền' },
  aoiAvi: { name: 'AOI/AVI', description: 'Kiểm tra quang học tự động' },

  // Alerts & Notifications
  alert: { name: 'Alerts', description: 'Quản lý cảnh báo' },
  alerts: { name: 'Alert System', description: 'Hệ thống cảnh báo tổng hợp' },
  alertConfig: { name: 'Alert Configuration', description: 'Cấu hình cảnh báo' },
  alertHistory: { name: 'Alert History', description: 'Lịch sử cảnh báo' },
  alertEmail: { name: 'Alert Email', description: 'Cảnh báo qua email' },
  alertWebhook: { name: 'Alert Webhooks', description: 'Webhook cảnh báo' },
  autoNtf: { name: 'Auto Notifications', description: 'Thông báo tự động' },
  notification: { name: 'Notifications', description: 'Hệ thống thông báo' },
  notificationPreferences: { name: 'Notification Preferences', description: 'Tùy chọn thông báo' },
  userNotification: { name: 'User Notifications', description: 'Thông báo người dùng' },
  pushNotification: { name: 'Push Notifications', description: 'Thông báo đẩy' },
  emailNotification: { name: 'Email Notifications', description: 'Thông báo email' },
  firebasePush: { name: 'Firebase Push', description: 'Firebase Cloud Messaging' },
  fcmIntegration: { name: 'FCM Integration', description: 'Tích hợp FCM' },
  telegram: { name: 'Telegram', description: 'Tích hợp Telegram bot' },
  sms: { name: 'SMS', description: 'Gửi SMS' },
  criticalAlertSms: { name: 'Critical Alert SMS', description: 'SMS cho cảnh báo nghiêm trọng' },
  workOrderNotification: { name: 'Work Order Notifications', description: 'Thông báo lệnh công việc' },
  environmentAlerts: { name: 'Environment Alerts', description: 'Cảnh báo môi trường' },
  performanceAlert: { name: 'Performance Alerts', description: 'Cảnh báo hiệu suất' },
  performanceDropAlert: { name: 'Performance Drop Alerts', description: 'Cảnh báo sụt giảm hiệu suất' },
  kpiAlert: { name: 'KPI Alerts', description: 'Cảnh báo KPI' },
  kpiAlertStats: { name: 'KPI Alert Stats', description: 'Thống kê cảnh báo KPI' },

  // Escalation
  escalation: { name: 'Escalation', description: 'Leo thang cảnh báo' },
  escalationHistory: { name: 'Escalation History', description: 'Lịch sử leo thang' },
  escalationReport: { name: 'Escalation Reports', description: 'Báo cáo leo thang' },
  escalationTemplate: { name: 'Escalation Templates', description: 'Mẫu leo thang' },
  escalationWebhook: { name: 'Escalation Webhooks', description: 'Webhook leo thang' },
  autoResolve: { name: 'Auto Resolve', description: 'Tự động giải quyết cảnh báo' },

  // Reports & Export
  export: { name: 'Export', description: 'Xuất dữ liệu (PDF, Excel, CSV)' },
  exportHistory: { name: 'Export History', description: 'Lịch sử xuất dữ liệu' },
  report: { name: 'Reports', description: 'Báo cáo' },
  reportTemplate: { name: 'Report Templates', description: 'Mẫu báo cáo' },
  scheduledReport: { name: 'Scheduled Reports', description: 'Báo cáo tự động theo lịch' },
  shiftReport: { name: 'Shift Reports', description: 'Báo cáo ca làm việc' },
  shiftManager: { name: 'Shift Manager', description: 'Quản lý ca làm việc' },
  mmsReport: { name: 'MMS Reports', description: 'Báo cáo MMS' },
  mmsAlert: { name: 'MMS Alerts', description: 'Cảnh báo MMS' },

  // Mapping & Integration
  mapping: { name: 'Data Mapping', description: 'Ánh xạ dữ liệu' },
  mappingTemplate: { name: 'Mapping Templates', description: 'Mẫu ánh xạ' },
  erpIntegration: { name: 'ERP Integration', description: 'Tích hợp ERP' },
  sync: { name: 'Data Sync', description: 'Đồng bộ dữ liệu' },

  // Dashboard & UI
  dashboard: { name: 'Dashboard', description: 'Dashboard chính' },
  dashboardCustomization: { name: 'Dashboard Customization', description: 'Tùy chỉnh dashboard' },
  ceoDashboard: { name: 'CEO Dashboard', description: 'Dashboard cho lãnh đạo' },
  customWidget: { name: 'Custom Widgets', description: 'Widget tùy chỉnh' },
  widgetData: { name: 'Widget Data', description: 'Dữ liệu widget' },
  chartConfig: { name: 'Chart Configuration', description: 'Cấu hình biểu đồ' },
  quickAccess: { name: 'Quick Access', description: 'Truy cập nhanh' },
  theme: { name: 'Theme', description: 'Giao diện người dùng' },
  model3d: { name: '3D Models', description: 'Mô hình 3D' },

  // Camera & Vision
  cameraCaptureSchedule: { name: 'Camera Capture Schedule', description: 'Lịch chụp camera' },
  cameraConfig: { name: 'Camera Configuration', description: 'Cấu hình camera' },
  cameraSession: { name: 'Camera Sessions', description: 'Phiên chụp camera' },
  autoCapture: { name: 'Auto Capture', description: 'Chụp tự động' },
  snImage: { name: 'SN Images', description: 'Hình ảnh theo serial number' },
  imageAnnotation: { name: 'Image Annotation', description: 'Ghi chú hình ảnh' },

  // Webhooks
  webhook: { name: 'Webhooks', description: 'Quản lý webhook' },
  webhookHistory: { name: 'Webhook History', description: 'Lịch sử webhook' },
  webhookTemplate: { name: 'Webhook Templates', description: 'Mẫu webhook' },
  webhookEscalation: { name: 'Webhook Escalation', description: 'Leo thang webhook' },
  unifiedWebhook: { name: 'Unified Webhooks', description: 'Webhook hợp nhất' },

  // System & Admin
  security: { name: 'Security', description: 'Bảo mật hệ thống' },
  audit: { name: 'Audit Logs', description: 'Nhật ký kiểm toán' },
  rules: { name: 'Business Rules', description: 'Quy tắc nghiệp vụ' },
  license: { name: 'License', description: 'Quản lý giấy phép' },
  licenseCustomer: { name: 'License Customers', description: 'Khách hàng giấy phép' },
  licenseServer: { name: 'License Server', description: 'Server giấy phép' },
  backup: { name: 'Backup', description: 'Sao lưu dữ liệu' },
  settingsExport: { name: 'Settings Export', description: 'Xuất cấu hình' },
  databaseConnection: { name: 'Database Connection', description: 'Kết nối database' },
  legacyDbConnection: { name: 'Legacy DB Connection', description: 'Kết nối database cũ' },
  databaseExplorer: { name: 'Database Explorer', description: 'Khám phá database' },
  processConfig: { name: 'Process Configuration', description: 'Cấu hình quy trình' },
  processTemplate: { name: 'Process Templates', description: 'Mẫu quy trình' },
  seed: { name: 'Seed Data', description: 'Dữ liệu mẫu' },
  smtp: { name: 'SMTP', description: 'Cấu hình email SMTP' },
  measurementStandard: { name: 'Measurement Standards', description: 'Tiêu chuẩn đo lường' },
  measurementRemark: { name: 'Measurement Remarks', description: 'Ghi chú đo lường' },
  validationRule: { name: 'Validation Rules', description: 'Quy tắc xác thực' },
  alarmThreshold: { name: 'Alarm Thresholds', description: 'Ngưỡng báo động' },
  ntfConfig: { name: 'Notification Config', description: 'Cấu hình thông báo' },
  rateLimit: { name: 'Rate Limiting', description: 'Giới hạn tốc độ API' },
  cache: { name: 'Cache', description: 'Quản lý cache' },
  cacheMonitoring: { name: 'Cache Monitoring', description: 'Giám sát cache' },
  queryPerformance: { name: 'Query Performance', description: 'Hiệu suất truy vấn' },
  queryCache: { name: 'Query Cache', description: 'Cache truy vấn' },
  connectionPool: { name: 'Connection Pool', description: 'Pool kết nối database' },
  latency: { name: 'Latency Monitoring', description: 'Giám sát độ trễ' },
  realtime: { name: 'Realtime', description: 'Dữ liệu realtime (WebSocket/SSE)' },
  realtimeConnection: { name: 'Realtime Connections', description: 'Kết nối realtime' },
  mobile: { name: 'Mobile', description: 'API cho ứng dụng mobile' },
  firmwareOta: { name: 'Firmware OTA', description: 'Cập nhật firmware OTA' },
  scheduledOta: { name: 'Scheduled OTA', description: 'Cập nhật OTA theo lịch' },
  floorPlan: { name: 'Floor Plans', description: 'Sơ đồ mặt bằng' },
  floorPlanIntegration: { name: 'Floor Plan Integration', description: 'Tích hợp sơ đồ mặt bằng' },
  factoryWorkshop: { name: 'Factory Workshop', description: 'Quản lý xưởng sản xuất' },
  userLine: { name: 'User Lines', description: 'Phân công dây chuyền' },
  userGuide: { name: 'User Guide', description: 'Hướng dẫn sử dụng' },
  videoTutorial: { name: 'Video Tutorials', description: 'Video hướng dẫn' },
};

// Group modules into categories for tag grouping
const TAG_GROUPS = [
  { name: 'Core', modules: ['auth', 'localAuth', 'user', 'permission', 'system'] },
  { name: 'SPC/CPK', modules: ['spc', 'cpkHistory', 'cpkAlert', 'scheduledCpkCheck', 'spcPlan', 'spcRules', 'sampling'] },
  { name: 'Production', modules: ['product', 'productSpec', 'productionLine', 'workstation', 'machine', 'machineType', 'machineStatus', 'machineArea', 'machineIntegration', 'machineApi', 'fixture', 'jig', 'defect'] },
  { name: 'OEE & Maintenance', modules: ['oee', 'oeeThresholds', 'scheduledOeeReport', 'maintenance', 'maintenanceWorkOrder', 'spareParts', 'predictiveMaintenance', 'mttrMtbf', 'mttrMtbfAlert', 'mttrMtbfComparison', 'mttrMtbfPrediction', 'scheduledMttrMtbf'] },
  { name: 'IoT', modules: ['iotDashboard', 'iotExport', 'iotCrud', 'iotAlert', 'iotAlertEscalation', 'iotAnalytics', 'iotDeviceManagement', 'iotOeeAlert', 'iotProtocol', 'iotSensor', 'mqtt', 'edgeGateway', 'edgeSimulator', 'timeseries'] },
  { name: 'AI & Vision', modules: ['ai', 'aiAdvanced', 'aiTraining', 'aiExport', 'aiVisionDashboard', 'aiImageComparison', 'vision', 'batchImageAnalysis', 'qualityImage', 'anomalyDetectionAI', 'anomalyAlert', 'modelAutoRetrain', 'predictiveAnalytics', 'predictiveAlert'] },
  { name: 'Quality', modules: ['qualityStatistics', 'qualityTrend', 'heatMapYield', 'paretoChart', 'lineComparison', 'lineComparisonExport', 'aoiAvi'] },
  { name: 'Alerts & Notifications', modules: ['alert', 'alerts', 'alertConfig', 'alertHistory', 'alertEmail', 'alertWebhook', 'autoNtf', 'notification', 'notificationPreferences', 'userNotification', 'pushNotification', 'emailNotification', 'firebasePush', 'fcmIntegration', 'telegram', 'sms', 'criticalAlertSms', 'workOrderNotification', 'environmentAlerts', 'performanceAlert', 'performanceDropAlert', 'kpiAlert', 'kpiAlertStats'] },
  { name: 'Escalation', modules: ['escalation', 'escalationHistory', 'escalationReport', 'escalationTemplate', 'escalationWebhook', 'autoResolve'] },
  { name: 'Reports & Export', modules: ['export', 'exportHistory', 'report', 'reportTemplate', 'scheduledReport', 'shiftReport', 'shiftManager', 'mmsReport', 'mmsAlert'] },
  { name: 'Integration', modules: ['mapping', 'mappingTemplate', 'erpIntegration', 'sync'] },
  { name: 'Dashboard & UI', modules: ['dashboard', 'dashboardCustomization', 'ceoDashboard', 'customWidget', 'widgetData', 'chartConfig', 'quickAccess', 'theme', 'model3d'] },
  { name: 'Camera', modules: ['cameraCaptureSchedule', 'cameraConfig', 'cameraSession', 'autoCapture', 'snImage', 'imageAnnotation'] },
  { name: 'Webhooks', modules: ['webhook', 'webhookHistory', 'webhookTemplate', 'webhookEscalation', 'unifiedWebhook'] },
  { name: 'System & Admin', modules: ['security', 'audit', 'rules', 'license', 'licenseCustomer', 'licenseServer', 'backup', 'settingsExport', 'databaseConnection', 'legacyDbConnection', 'databaseExplorer', 'processConfig', 'processTemplate', 'seed', 'smtp', 'measurementStandard', 'measurementRemark', 'validationRule', 'alarmThreshold', 'ntfConfig', 'rateLimit', 'cache', 'cacheMonitoring', 'queryPerformance', 'queryCache', 'connectionPool', 'latency', 'realtime', 'realtimeConnection', 'mobile', 'firmwareOta', 'scheduledOta', 'floorPlan', 'floorPlanIntegration', 'factoryWorkshop', 'userLine', 'userGuide', 'videoTutorial'] },
];

/**
 * Generate OpenAPI 3.0 specification
 */
export function generateOpenAPISpec(baseUrl: string = ''): Record<string, any> {
  const tags = Object.entries(MODULE_CATEGORIES).map(([key, val]) => ({
    name: val.name,
    description: val.description,
    'x-module': key,
  }));

  // Generate tag groups for Swagger UI
  const tagGroups = TAG_GROUPS.map(group => ({
    name: group.name,
    tags: group.modules
      .filter(m => MODULE_CATEGORIES[m])
      .map(m => MODULE_CATEGORIES[m].name),
  }));

  const spec: Record<string, any> = {
    openapi: '3.0.3',
    info: {
      title: 'CPK/SPC Calculator API',
      description: `## Tổng quan

API cho Hệ thống Tính toán CPK/SPC - Nền tảng Phân tích Chất lượng Sản xuất Công nghiệp.

### Kiến trúc

Hệ thống sử dụng **tRPC** (TypeScript RPC) làm lớp API chính. Tất cả endpoints đều đi qua \`/api/trpc/{router}.{procedure}\`.

### Xác thực

- **OAuth 2.0**: Đăng nhập qua Manus OAuth
- **Local Auth**: Đăng nhập bằng username/password với hỗ trợ 2FA
- **Session Cookie**: Sau khi đăng nhập, session được lưu trong cookie

### Rate Limiting

| Tier | Giới hạn | Áp dụng |
|------|----------|---------|
| General API | 5000 req/15min | Tất cả endpoints |
| Auth | 200 req/15min | Đăng nhập, OAuth |
| Export | 100 req/15min | PDF/Excel export |
| Per-user | 3000 req/15min | Mỗi user |

### Health Check Endpoints

| Endpoint | Mô tả |
|----------|-------|
| \`GET /api/health\` | Kiểm tra cơ bản |
| \`GET /api/health/detailed\` | Chi tiết (DB, memory, CPU) |
| \`GET /api/health/live\` | Liveness probe |
| \`GET /api/health/ready\` | Readiness probe |
| \`GET /api/metrics\` | Prometheus metrics |

### Modules

Hệ thống bao gồm **172 router modules** được tổ chức thành **15 nhóm chức năng**.`,
      version: '2.0.0',
      contact: {
        name: 'MSoftware AI Team',
        email: 'support@msoftware.ai',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: baseUrl || '{protocol}://{host}',
        description: 'CPK/SPC Calculator Server',
        variables: {
          protocol: {
            default: 'https',
            enum: ['https', 'http'],
          },
          host: {
            default: 'localhost:3000',
          },
        },
      },
    ],
    tags,
    'x-tagGroups': tagGroups,
    paths: {} as Record<string, any>,
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'session',
          description: 'Session cookie set after OAuth or local login',
        },
        localAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'local_auth_token',
          description: 'Local authentication token cookie',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                code: { type: 'string', enum: ['BAD_REQUEST', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'INTERNAL_SERVER_ERROR'] },
              },
            },
          },
        },
        TRPCResponse: {
          type: 'object',
          properties: {
            result: {
              type: 'object',
              properties: {
                data: { type: 'object', description: 'Response data' },
              },
            },
          },
        },
        TRPCBatchResponse: {
          type: 'array',
          items: { '$ref': '#/components/schemas/TRPCResponse' },
        },
        PaginationInput: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 1000, default: 20 },
          },
        },
        DateRangeInput: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        HealthBasic: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number' },
            uptimeFormatted: { type: 'string' },
            version: { type: 'string' },
            environment: { type: 'string' },
          },
        },
        HealthDetailed: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            database: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                latencyMs: { type: 'number' },
                tableCount: { type: 'integer' },
              },
            },
            memory: {
              type: 'object',
              properties: {
                rss: { type: 'integer' },
                heapUsed: { type: 'integer' },
                heapTotal: { type: 'integer' },
                usagePercent: { type: 'number' },
                systemTotal: { type: 'integer' },
                systemFree: { type: 'integer' },
                systemUsagePercent: { type: 'number' },
              },
            },
            cpu: {
              type: 'object',
              properties: {
                loadAvg1m: { type: 'number' },
                loadAvg5m: { type: 'number' },
                loadAvg15m: { type: 'number' },
                cpuCount: { type: 'integer' },
              },
            },
            system: {
              type: 'object',
              properties: {
                platform: { type: 'string' },
                arch: { type: 'string' },
                nodeVersion: { type: 'string' },
                hostname: { type: 'string' },
                pid: { type: 'integer' },
              },
            },
            services: {
              type: 'object',
              properties: {
                websocket: { type: 'string' },
                sse: { type: 'string' },
                rateLimiter: { type: 'string' },
                redis: { type: 'string' },
              },
            },
          },
        },
      },
    },
  };

  // Add health check paths
  spec.paths['/api/health'] = {
    get: {
      tags: ['Health Check'],
      summary: 'Basic health check',
      description: 'Trả về trạng thái cơ bản của ứng dụng (status, uptime, version)',
      operationId: 'getHealthBasic',
      responses: {
        '200': {
          description: 'Application healthy',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/HealthBasic' } } },
        },
        '503': {
          description: 'Application unhealthy',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/HealthBasic' } } },
        },
      },
    },
  };

  spec.paths['/api/health/detailed'] = {
    get: {
      tags: ['Health Check'],
      summary: 'Detailed health check',
      description: 'Trả về thông tin chi tiết: database, memory, CPU, services',
      operationId: 'getHealthDetailed',
      responses: {
        '200': {
          description: 'Detailed health information',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/HealthDetailed' } } },
        },
      },
    },
  };

  spec.paths['/api/health/live'] = {
    get: {
      tags: ['Health Check'],
      summary: 'Liveness probe',
      description: 'Kubernetes liveness probe - kiểm tra process đang chạy',
      operationId: 'getLiveness',
      responses: {
        '200': {
          description: 'Process alive',
          content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, timestamp: { type: 'string' } } } } },
        },
      },
    },
  };

  spec.paths['/api/health/ready'] = {
    get: {
      tags: ['Health Check'],
      summary: 'Readiness probe',
      description: 'Kubernetes readiness probe - kiểm tra DB + memory',
      operationId: 'getReadiness',
      responses: {
        '200': {
          description: 'Application ready',
          content: { 'application/json': { schema: { type: 'object', properties: { ready: { type: 'boolean' }, checks: { type: 'object' } } } } },
        },
        '503': { description: 'Application not ready' },
      },
    },
  };

  spec.paths['/api/metrics'] = {
    get: {
      tags: ['Health Check'],
      summary: 'Prometheus metrics',
      description: 'Trả về metrics ở định dạng Prometheus text exposition (20+ metrics)',
      operationId: 'getPrometheusMetrics',
      responses: {
        '200': {
          description: 'Prometheus metrics',
          content: { 'text/plain': { schema: { type: 'string' } } },
        },
      },
    },
  };

  // Add tRPC endpoint paths for each module
  for (const [moduleKey, moduleInfo] of Object.entries(MODULE_CATEGORIES)) {
    const basePath = `/api/trpc/${moduleKey}`;

    spec.paths[`${basePath}.*`] = {
      get: {
        tags: [moduleInfo.name],
        summary: `${moduleInfo.name} - Query endpoints`,
        description: `tRPC query endpoints cho module ${moduleInfo.name}. ${moduleInfo.description}.\n\nSử dụng: \`GET /api/trpc/${moduleKey}.{procedure}?input={encoded_json}\``,
        operationId: `${moduleKey}Query`,
        parameters: [
          {
            name: 'input',
            in: 'query',
            description: 'JSON-encoded input parameters (URL-encoded)',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Successful query',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/TRPCResponse' } } },
          },
          '401': { description: 'Unauthorized - cần đăng nhập' },
          '403': { description: 'Forbidden - không có quyền' },
          '400': { description: 'Bad Request - input không hợp lệ' },
        },
        security: moduleKey === 'auth' || moduleKey === 'localAuth' ? [] : [{ cookieAuth: [] }],
      },
      post: {
        tags: [moduleInfo.name],
        summary: `${moduleInfo.name} - Mutation endpoints`,
        description: `tRPC mutation endpoints cho module ${moduleInfo.name}. ${moduleInfo.description}.\n\nSử dụng: \`POST /api/trpc/${moduleKey}.{procedure}\` với body \`{ "json": { ...input } }\``,
        operationId: `${moduleKey}Mutation`,
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  json: { type: 'object', description: 'Input parameters' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful mutation',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/TRPCResponse' } } },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '400': { description: 'Bad Request' },
        },
        security: moduleKey === 'auth' || moduleKey === 'localAuth' ? [] : [{ cookieAuth: [] }],
      },
    };
  }

  return spec;
}

/**
 * Generate Swagger UI HTML page
 */
export function generateSwaggerUIHtml(specUrl: string = '/api/openapi.json'): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CPK/SPC Calculator - API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css">
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { font-size: 2em; }
    .custom-header {
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 50%, #1e3a5f 100%);
      color: white;
      padding: 20px 40px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .custom-header h1 { margin: 0; font-size: 1.5em; font-weight: 600; }
    .custom-header p { margin: 4px 0 0; opacity: 0.85; font-size: 0.9em; }
    .custom-header .badge {
      background: rgba(255,255,255,0.2);
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.8em;
    }
  </style>
</head>
<body>
  <div class="custom-header">
    <div>
      <h1>CPK/SPC Calculator API</h1>
      <p>Manufacturing Quality Analytics Platform - API Documentation</p>
    </div>
    <span class="badge">v2.0.0</span>
    <span class="badge">172 Modules</span>
    <span class="badge">tRPC</span>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "${specUrl}",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        tagsSorter: "alpha",
        operationsSorter: "alpha",
        docExpansion: "list",
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
        tryItOutEnabled: true,
        requestSnippetsEnabled: true,
        persistAuthorization: true,
      });
    };
  </script>
</body>
</html>`;
}

/**
 * Get API statistics
 */
export function getAPIStatistics() {
  const totalModules = Object.keys(MODULE_CATEGORIES).length;
  const totalGroups = TAG_GROUPS.length;

  return {
    totalModules,
    totalGroups,
    groups: TAG_GROUPS.map(g => ({
      name: g.name,
      moduleCount: g.modules.length,
      modules: g.modules.filter(m => MODULE_CATEGORIES[m]).map(m => ({
        key: m,
        name: MODULE_CATEGORIES[m]?.name || m,
        description: MODULE_CATEGORIES[m]?.description || '',
      })),
    })),
    healthEndpoints: 5,
    version: '2.0.0',
  };
}
