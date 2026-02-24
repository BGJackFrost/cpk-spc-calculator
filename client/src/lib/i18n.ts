/**
 * Internationalization (i18n) Module
 * Supports Vietnamese (vi) and English (en)
 */

export type Language = 'vi' | 'en';

// Translation dictionary type
type TranslationDict = {
  [key: string]: string | TranslationDict;
};

// Vietnamese translations (default)
const vi: TranslationDict = {
  common: {
    loading: "Đang tải...",
    save: "Lưu",
    cancel: "Hủy",
    delete: "Xóa",
    edit: "Sửa",
    add: "Thêm",
    search: "Tìm kiếm",
    filter: "Lọc",
    export: "Xuất",
    import: "Nhập",
    refresh: "Làm mới",
    confirm: "Xác nhận",
    back: "Quay lại",
    next: "Tiếp theo",
    previous: "Trước đó",
    close: "Đóng",
    yes: "Có",
    no: "Không",
    all: "Tất cả",
    none: "Không có",
    actions: "Thao tác",
    status: "Trạng thái",
    active: "Hoạt động",
    inactive: "Không hoạt động",
    success: "Thành công",
    error: "Lỗi",
    warning: "Cảnh báo",
    info: "Thông tin",
  },
  auth: {
    login: "Đăng nhập",
    logout: "Đăng xuất",
    username: "Tên đăng nhập",
    password: "Mật khẩu",
    rememberMe: "Ghi nhớ đăng nhập",
    forgotPassword: "Quên mật khẩu?",
    changePassword: "Đổi mật khẩu",
    currentPassword: "Mật khẩu hiện tại",
    newPassword: "Mật khẩu mới",
    confirmPassword: "Xác nhận mật khẩu",
  },
  menu: {
    dashboard: "Bảng điều khiển",
    spcAnalysis: "Phân tích SPC",
    qualityManagement: "Quản lý Chất lượng",
    production: "Quản lý Sản xuất",
    masterData: "Dữ liệu chủ",
    users: "Người dùng",
    settings: "Cài đặt",
    reports: "Báo cáo",
    licenseServer: "License Server",
  },
  spc: {
    cpk: "Chỉ số CPK",
    cp: "Chỉ số CP",
    ppk: "Chỉ số PPK",
    pp: "Chỉ số PP",
    ca: "Độ chính xác Ca",
    ucl: "Giới hạn trên (UCL)",
    lcl: "Giới hạn dưới (LCL)",
    usl: "Giới hạn kỹ thuật trên (USL)",
    lsl: "Giới hạn kỹ thuật dưới (LSL)",
    mean: "Giá trị trung bình",
    stdDev: "Độ lệch chuẩn",
    sampleSize: "Kích thước mẫu",
    controlChart: "Biểu đồ kiểm soát",
    histogram: "Biểu đồ phân bố",
    rules: "Quy tắc SPC",
    violation: "Vi phạm",
  },
  dashboard: {
    overview: "Tổng quan",
    realtime: "Thời gian thực",
    productionLines: "Dây chuyền sản xuất",
    qualityMetrics: "Chỉ số chất lượng",
    alerts: "Cảnh báo",
    recentActivity: "Hoạt động gần đây",
  },
  validation: {
    required: "Trường này là bắt buộc",
    minLength: "Tối thiểu {min} ký tự",
    maxLength: "Tối đa {max} ký tự",
    email: "Email không hợp lệ",
    number: "Phải là số",
    positive: "Phải là số dương",
    integer: "Phải là số nguyên",
    date: "Ngày không hợp lệ",
    passwordMatch: "Mật khẩu không khớp",
  },
  errors: {
    general: "Đã xảy ra lỗi. Vui lòng thử lại.",
    network: "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối.",
    unauthorized: "Bạn không có quyền truy cập.",
    notFound: "Không tìm thấy dữ liệu.",
    serverError: "Lỗi máy chủ. Vui lòng thử lại sau.",
    timeout: "Yêu cầu hết thời gian. Vui lòng thử lại.",
  },
};

// English translations
const en: TranslationDict = {
  common: {
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    search: "Search",
    filter: "Filter",
    export: "Export",
    import: "Import",
    refresh: "Refresh",
    confirm: "Confirm",
    back: "Back",
    next: "Next",
    previous: "Previous",
    close: "Close",
    yes: "Yes",
    no: "No",
    all: "All",
    none: "None",
    actions: "Actions",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    success: "Success",
    error: "Error",
    warning: "Warning",
    info: "Information",
  },
  auth: {
    login: "Login",
    logout: "Logout",
    username: "Username",
    password: "Password",
    rememberMe: "Remember me",
    forgotPassword: "Forgot password?",
    changePassword: "Change password",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm password",
  },
  menu: {
    dashboard: "Dashboard",
    spcAnalysis: "SPC Analysis",
    qualityManagement: "Quality Management",
    production: "Production Management",
    masterData: "Master Data",
    users: "Users",
    settings: "Settings",
    reports: "Reports",
    licenseServer: "License Server",
  },
  spc: {
    cpk: "CPK Index",
    cp: "CP Index",
    ppk: "PPK Index",
    pp: "PP Index",
    ca: "Capability Accuracy (Ca)",
    ucl: "Upper Control Limit (UCL)",
    lcl: "Lower Control Limit (LCL)",
    usl: "Upper Spec Limit (USL)",
    lsl: "Lower Spec Limit (LSL)",
    mean: "Mean",
    stdDev: "Standard Deviation",
    sampleSize: "Sample Size",
    controlChart: "Control Chart",
    histogram: "Histogram",
    rules: "SPC Rules",
    violation: "Violation",
  },
  dashboard: {
    overview: "Overview",
    realtime: "Real-time",
    productionLines: "Production Lines",
    qualityMetrics: "Quality Metrics",
    alerts: "Alerts",
    recentActivity: "Recent Activity",
  },
  validation: {
    required: "This field is required",
    minLength: "Minimum {min} characters",
    maxLength: "Maximum {max} characters",
    email: "Invalid email address",
    number: "Must be a number",
    positive: "Must be a positive number",
    integer: "Must be an integer",
    date: "Invalid date",
    passwordMatch: "Passwords do not match",
  },
  errors: {
    general: "An error occurred. Please try again.",
    network: "Network error. Please check your connection.",
    unauthorized: "You are not authorized to access this.",
    notFound: "Data not found.",
    serverError: "Server error. Please try again later.",
    timeout: "Request timed out. Please try again.",
  },
};

const translations: Record<Language, TranslationDict> = { vi, en };

// Current language state
let currentLanguage: Language = 'vi';

// Get nested value from object using dot notation
function getNestedValue(obj: TranslationDict, path: string): string | undefined {
  const keys = path.split('.');
  let current: TranslationDict | string = obj;
  
  for (const key of keys) {
    if (typeof current === 'string' || current === undefined) {
      return undefined;
    }
    current = current[key] as TranslationDict | string;
  }
  
  return typeof current === 'string' ? current : undefined;
}

/**
 * Translate a key to the current language
 * @param key - Dot-notation key (e.g., 'common.save')
 * @param params - Optional parameters for interpolation
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const translation = getNestedValue(translations[currentLanguage], key);
  
  if (!translation) {
    console.warn(`Missing translation for key: ${key}`);
    return key;
  }
  
  if (!params) {
    return translation;
  }
  
  // Replace {param} with actual values
  return translation.replace(/\{(\w+)\}/g, (_, paramKey) => {
    return params[paramKey]?.toString() ?? `{${paramKey}}`;
  });
}

/**
 * Set the current language
 */
export function setLanguage(lang: Language): void {
  currentLanguage = lang;
  // Store preference
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('language', lang);
  }
}

/**
 * Get the current language
 */
export function getLanguage(): Language {
  return currentLanguage;
}

/**
 * Initialize language from stored preference
 */
export function initLanguage(): void {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('language') as Language | null;
    if (stored && (stored === 'vi' || stored === 'en')) {
      currentLanguage = stored;
    }
  }
}

/**
 * Get all available languages
 */
export function getAvailableLanguages(): { code: Language; name: string }[] {
  return [
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'en', name: 'English' },
  ];
}

// Initialize on module load
initLanguage();

export default { t, setLanguage, getLanguage, initLanguage, getAvailableLanguages };
