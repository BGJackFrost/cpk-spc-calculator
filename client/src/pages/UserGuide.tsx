import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  BookOpen, 
  PlayCircle, 
  CheckCircle, 
  ArrowRight, 
  BarChart3, 
  Settings, 
  Users, 
  Database, 
  Bell, 
  FileText,
  Factory,
  Cpu,
  LineChart,
  AlertTriangle,
  Mail,
  Shield,
  Workflow,
  Target,
  TrendingUp,
  Clock,
  Layers,
  Wrench,
  Monitor,
  ChevronRight,
  Info,
  Lightbulb,
  Zap
} from "lucide-react";

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  steps: GuideStep[];
  tips?: string[];
}

interface GuideStep {
  title: string;
  description: string;
  path?: string;
  substeps?: string[];
}

const SYSTEM_OVERVIEW = {
  title: "Tổng quan Hệ thống SPC/CPK Calculator",
  description: `Hệ thống SPC/CPK Calculator là giải pháp toàn diện cho việc kiểm soát chất lượng sản xuất, 
  tích hợp các công cụ phân tích thống kê tiên tiến, giám sát realtime, và quản lý quy trình sản xuất. 
  Hệ thống được thiết kế theo kiến trúc module hóa, cho phép mở rộng linh hoạt và tùy chỉnh theo nhu cầu doanh nghiệp.`,
  modules: [
    {
      name: "SPC/CPK Analysis",
      description: "Phân tích năng lực quy trình và kiểm soát thống kê",
      features: ["Tính toán Cp, Cpk, Pp, Ppk", "8 SPC Rules (Western Electric)", "Control Charts", "Histogram"]
    },
    {
      name: "Production Management",
      description: "Quản lý dây chuyền và quy trình sản xuất",
      features: ["Quản lý dây chuyền", "Quản lý công trạm", "Quản lý máy móc", "Quy trình sản xuất"]
    },
    {
      name: "Realtime Monitoring",
      description: "Giám sát realtime với SSE/WebSocket",
      features: ["Dashboard realtime", "Cảnh báo tức thì", "Biểu đồ live", "Thông báo email/SMS"]
    },
    {
      name: "MMS (Machine Management)",
      description: "Quản lý thiết bị và bảo trì",
      features: ["Quản lý máy móc", "Lịch bảo trì", "Phụ tùng thay thế", "OEE Dashboard"]
    },
    {
      name: "Quality Management",
      description: "Quản lý chất lượng và khuyết tật",
      features: ["Quản lý khuyết tật", "Thống kê lỗi", "NTF Analysis", "Báo cáo chất lượng"]
    },
    {
      name: "System Administration",
      description: "Quản trị hệ thống và phân quyền",
      features: ["Quản lý người dùng", "Phân quyền module", "Audit logs", "Backup/Restore"]
    }
  ]
};

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "getting-started",
    title: "Bắt đầu sử dụng",
    icon: <PlayCircle className="w-5 h-5" />,
    description: "Hướng dẫn cơ bản để bắt đầu sử dụng hệ thống",
    steps: [
      {
        title: "Đăng nhập hệ thống",
        description: "Truy cập hệ thống và đăng nhập với tài khoản được cấp",
        path: "/local-login",
        substeps: [
          "Mở trình duyệt và truy cập địa chỉ hệ thống",
          "Nhập tên đăng nhập và mật khẩu",
          "Nhấn nút Đăng nhập để vào hệ thống",
          "Lần đầu đăng nhập nên đổi mật khẩu tại Profile"
        ]
      },
      {
        title: "Khám phá Dashboard",
        description: "Làm quen với giao diện Dashboard chính",
        path: "/dashboard",
        substeps: [
          "Xem tổng quan các chỉ số KPI",
          "Kiểm tra trạng thái các dây chuyền sản xuất",
          "Xem biểu đồ CPK theo thời gian",
          "Kiểm tra thông báo và cảnh báo"
        ]
      },
      {
        title: "Cấu hình cơ bản",
        description: "Thiết lập các cấu hình cần thiết trước khi sử dụng",
        path: "/setup",
        substeps: [
          "Cấu hình thông tin công ty",
          "Thiết lập kết nối database",
          "Cấu hình email thông báo",
          "Khởi tạo dữ liệu mẫu (nếu cần)"
        ]
      }
    ],
    tips: [
      "Bookmark trang Dashboard để truy cập nhanh",
      "Sử dụng phím tắt Ctrl+K để mở Quick Search",
      "Kiểm tra thông báo thường xuyên để không bỏ lỡ cảnh báo quan trọng"
    ]
  },
  {
    id: "spc-analysis",
    title: "Phân tích SPC/CPK",
    icon: <BarChart3 className="w-5 h-5" />,
    description: "Hướng dẫn chi tiết về phân tích SPC và tính toán CPK",
    steps: [
      {
        title: "Truy cập trang Phân tích SPC/CPK",
        description: "Vào menu Analysis → SPC/CPK Analysis",
        path: "/analyze",
        substeps: [
          "Click vào menu Analysis ở sidebar",
          "Chọn SPC/CPK Analysis",
          "Trang phân tích sẽ hiển thị với 3 tab: Từ Database, Từ SPC Plan, Nhập thủ công"
        ]
      },
      {
        title: "Phân tích từ Database",
        description: "Lấy dữ liệu từ database đã cấu hình mapping",
        substeps: [
          "Chọn Sản phẩm từ dropdown",
          "Chọn Công trạm (Workstation)",
          "Chọn khoảng thời gian (Từ ngày - Đến ngày)",
          "Chọn Cấu hình Mapping (nếu có)",
          "Nhấn nút 'Phân tích SPC/CPK'"
        ]
      },
      {
        title: "Phân tích từ SPC Plan",
        description: "Sử dụng dữ liệu từ kế hoạch SPC đã lưu",
        substeps: [
          "Chuyển sang tab 'Từ SPC Plan'",
          "Chọn kế hoạch SPC từ danh sách",
          "Hệ thống tự động load dữ liệu đã thu thập",
          "Nhấn 'Phân tích' để xem kết quả"
        ]
      },
      {
        title: "Nhập dữ liệu thủ công",
        description: "Nhập trực tiếp các giá trị đo lường",
        substeps: [
          "Chuyển sang tab 'Nhập thủ công'",
          "Nhập USL (Upper Specification Limit)",
          "Nhập LSL (Lower Specification Limit)",
          "Nhập Target (giá trị mục tiêu)",
          "Nhập dữ liệu đo lường (cách nhau bởi dấu phẩy)",
          "Nhấn 'Phân tích SPC/CPK'"
        ]
      },
      {
        title: "Đọc hiểu kết quả",
        description: "Hiểu các chỉ số và biểu đồ kết quả",
        substeps: [
          "CPK > 1.33: Quy trình đạt yêu cầu (Excellent)",
          "1.0 < CPK < 1.33: Quy trình cần cải tiến (Good)",
          "CPK < 1.0: Quy trình không đạt (Poor)",
          "Xem biểu đồ X-bar và R-chart để phát hiện trend",
          "Kiểm tra vi phạm 8 SPC Rules (điểm đỏ trên biểu đồ)"
        ]
      }
    ],
    tips: [
      "CPK < 1.33 sẽ trigger cảnh báo email tự động",
      "Sử dụng AI Analysis để nhận khuyến nghị cải tiến",
      "Xuất báo cáo PDF/Excel để lưu trữ và chia sẻ"
    ]
  },
  {
    id: "production-setup",
    title: "Thiết lập Sản xuất",
    icon: <Factory className="w-5 h-5" />,
    description: "Cấu hình dây chuyền, công trạm và máy móc",
    steps: [
      {
        title: "Quản lý Sản phẩm",
        description: "Tạo và quản lý danh mục sản phẩm",
        path: "/products",
        substeps: [
          "Vào menu SPC/CPK → Quản lý Sản phẩm",
          "Nhấn 'Thêm sản phẩm' để tạo mới",
          "Nhập mã sản phẩm, tên, mô tả",
          "Lưu sản phẩm"
        ]
      },
      {
        title: "Thiết lập Tiêu chuẩn (USL/LSL)",
        description: "Cấu hình giới hạn kiểm tra cho từng sản phẩm",
        path: "/specifications",
        substeps: [
          "Vào menu SPC/CPK → Tiêu chuẩn Kiểm tra",
          "Chọn sản phẩm cần thiết lập",
          "Nhập USL (giới hạn trên)",
          "Nhập LSL (giới hạn dưới)",
          "Nhập Target (giá trị mục tiêu)",
          "Lưu cấu hình"
        ]
      },
      {
        title: "Quản lý Dây chuyền sản xuất",
        description: "Tạo và cấu hình dây chuyền sản xuất",
        path: "/production-lines",
        substeps: [
          "Vào menu Production → Dây chuyền sản xuất",
          "Nhấn 'Thêm dây chuyền'",
          "Nhập tên, mã dây chuyền",
          "Chọn sản phẩm sản xuất",
          "Chọn quy trình áp dụng",
          "Gán người phụ trách (Supervisor)"
        ]
      },
      {
        title: "Quản lý Công trạm",
        description: "Thiết lập các công trạm trong dây chuyền",
        path: "/workstations",
        substeps: [
          "Vào menu Production → Công trạm",
          "Chọn dây chuyền cần thêm công trạm",
          "Nhấn 'Thêm công trạm'",
          "Nhập thông tin công trạm",
          "Gán máy móc vào công trạm"
        ]
      },
      {
        title: "Quản lý Máy móc",
        description: "Đăng ký và quản lý thiết bị máy móc",
        path: "/machines",
        substeps: [
          "Vào menu MMS → Quản lý Máy",
          "Nhấn 'Thêm máy'",
          "Nhập mã máy, tên, loại máy",
          "Chọn khu vực đặt máy",
          "Cấu hình thông số kỹ thuật"
        ]
      }
    ],
    tips: [
      "Đặt tên mã có quy tắc để dễ tìm kiếm (VD: LINE-01, WS-AOI-01)",
      "Luôn thiết lập USL/LSL trước khi chạy phân tích SPC",
      "Gán đúng supervisor để nhận thông báo kịp thời"
    ]
  },
  {
    id: "spc-plan",
    title: "Kế hoạch lấy mẫu SPC",
    icon: <Target className="w-5 h-5" />,
    description: "Tạo và quản lý kế hoạch lấy mẫu tự động",
    steps: [
      {
        title: "Tạo kế hoạch SPC mới",
        description: "Thiết lập kế hoạch lấy mẫu tự động",
        path: "/spc-plans",
        substeps: [
          "Vào menu SPC/CPK → Kế hoạch SPC",
          "Nhấn 'Tạo kế hoạch mới'",
          "Nhập tên kế hoạch",
          "Chọn dây chuyền sản xuất",
          "Chọn sản phẩm",
          "Chọn công trạm cần lấy mẫu"
        ]
      },
      {
        title: "Cấu hình tần suất lấy mẫu",
        description: "Thiết lập chu kỳ và số lượng mẫu",
        substeps: [
          "Chọn phương pháp lấy mẫu (theo giờ/ngày/ca)",
          "Nhập số lượng mẫu mỗi lần",
          "Thiết lập thời gian bắt đầu",
          "Thiết lập thời gian kết thúc (để trống = chạy liên tục)",
          "Chọn cấu hình mapping database"
        ]
      },
      {
        title: "Kích hoạt kế hoạch",
        description: "Bật kế hoạch để bắt đầu lấy mẫu tự động",
        substeps: [
          "Kiểm tra lại các cấu hình",
          "Nhấn nút 'Kích hoạt'",
          "Hệ thống sẽ tự động lấy mẫu theo lịch",
          "Theo dõi trạng thái trên Dashboard"
        ]
      },
      {
        title: "Xem kết quả lấy mẫu",
        description: "Theo dõi dữ liệu đã thu thập",
        path: "/spc-plan-visualization",
        substeps: [
          "Vào menu SPC/CPK → Visualization",
          "Chọn kế hoạch cần xem",
          "Xem biểu đồ trend theo thời gian",
          "Kiểm tra các điểm vi phạm",
          "Xuất báo cáo nếu cần"
        ]
      }
    ],
    tips: [
      "Nên lấy mẫu ít nhất 25 điểm để có kết quả CPK chính xác",
      "Thiết lập cảnh báo email để nhận thông báo khi có vi phạm",
      "Sử dụng Quick SPC Plan để tạo nhanh kế hoạch đơn giản"
    ]
  },
  {
    id: "realtime-monitoring",
    title: "Giám sát Realtime",
    icon: <Monitor className="w-5 h-5" />,
    description: "Theo dõi dữ liệu sản xuất theo thời gian thực",
    steps: [
      {
        title: "Dashboard Realtime",
        description: "Xem tổng quan realtime các dây chuyền",
        path: "/realtime-dashboard",
        substeps: [
          "Vào menu SPC Overview → Realtime Monitoring",
          "Chọn các kế hoạch SPC cần theo dõi",
          "Xem biểu đồ CPK realtime",
          "Theo dõi trạng thái từng dây chuyền"
        ]
      },
      {
        title: "Cấu hình Dashboard",
        description: "Tùy chỉnh hiển thị dashboard",
        substeps: [
          "Nhấn nút 'Cấu hình' trên Dashboard",
          "Chọn số lượng dây chuyền hiển thị",
          "Chọn các dây chuyền cần theo dõi",
          "Lưu cấu hình"
        ]
      },
      {
        title: "Supervisor Dashboard",
        description: "Dashboard dành cho quản lý ca",
        path: "/supervisor-dashboard",
        substeps: [
          "Vào menu SPC Overview → Supervisor Dashboard",
          "Xem tổng quan ca làm việc hiện tại",
          "Kiểm tra các cảnh báo",
          "Xem so sánh CPK giữa các ca"
        ]
      },
      {
        title: "Xem chi tiết máy",
        description: "Theo dõi chi tiết từng máy",
        path: "/machine-overview",
        substeps: [
          "Vào menu SPC Overview → Machine Overview",
          "Chọn máy cần xem chi tiết",
          "Xem thông số realtime",
          "Kiểm tra lịch sử hoạt động"
        ]
      }
    ],
    tips: [
      "Sử dụng SSE để nhận cập nhật realtime không cần refresh",
      "Thiết lập ngưỡng cảnh báo phù hợp với quy trình",
      "Kiểm tra Dashboard đầu ca để nắm tình hình"
    ]
  },
  {
    id: "alerts-notifications",
    title: "Cảnh báo & Thông báo",
    icon: <Bell className="w-5 h-5" />,
    description: "Cấu hình và quản lý hệ thống cảnh báo",
    steps: [
      {
        title: "Cấu hình ngưỡng cảnh báo CPK",
        description: "Thiết lập ngưỡng trigger cảnh báo",
        path: "/kpi-thresholds",
        substeps: [
          "Vào menu System → KPI Thresholds",
          "Thiết lập ngưỡng CPK Warning (mặc định 1.33)",
          "Thiết lập ngưỡng CPK Critical (mặc định 1.0)",
          "Lưu cấu hình"
        ]
      },
      {
        title: "Cấu hình email thông báo",
        description: "Thêm email nhận cảnh báo",
        path: "/notification-settings",
        substeps: [
          "Vào menu System → Cài đặt Thông báo",
          "Nhấn 'Thêm kênh'",
          "Chọn loại: Email",
          "Nhập địa chỉ email",
          "Nhấn 'Thêm' để lưu"
        ]
      },
      {
        title: "Cấu hình SMTP",
        description: "Thiết lập server gửi email",
        path: "/smtp-settings",
        substeps: [
          "Vào menu System → SMTP Settings",
          "Nhập SMTP Host (VD: smtp.gmail.com)",
          "Nhập Port (587 cho TLS)",
          "Nhập email và mật khẩu ứng dụng",
          "Test gửi email"
        ]
      },
      {
        title: "Xem lịch sử cảnh báo",
        description: "Theo dõi các cảnh báo đã gửi",
        path: "/alert-history",
        substeps: [
          "Vào menu System → Alert History",
          "Lọc theo thời gian, loại cảnh báo",
          "Xem chi tiết từng cảnh báo",
          "Đánh dấu đã xử lý"
        ]
      }
    ],
    tips: [
      "Sử dụng Gmail với App Password để gửi email",
      "Thêm nhiều email để đảm bảo không bỏ lỡ cảnh báo",
      "Kiểm tra tab 'Lịch sử gửi' để xác nhận email đã gửi"
    ]
  },
  {
    id: "reports",
    title: "Báo cáo & Xuất dữ liệu",
    icon: <FileText className="w-5 h-5" />,
    description: "Tạo và xuất các loại báo cáo",
    steps: [
      {
        title: "Báo cáo SPC tổng hợp",
        description: "Xem báo cáo theo ca/ngày/tuần",
        path: "/spc-report",
        substeps: [
          "Vào menu Analysis → SPC Report",
          "Chọn khoảng thời gian",
          "Chọn ca làm việc (nếu cần)",
          "Xem biểu đồ trend CPK",
          "Xem bảng thống kê chi tiết"
        ]
      },
      {
        title: "Xuất báo cáo PDF",
        description: "Tạo file PDF từ kết quả phân tích",
        substeps: [
          "Thực hiện phân tích SPC/CPK",
          "Nhấn nút 'Xuất PDF'",
          "Chọn các phần cần xuất",
          "Tải file PDF về máy"
        ]
      },
      {
        title: "Xuất báo cáo Excel",
        description: "Tạo file Excel với dữ liệu chi tiết",
        substeps: [
          "Thực hiện phân tích SPC/CPK",
          "Nhấn nút 'Xuất Excel'",
          "File Excel sẽ chứa dữ liệu thô và kết quả tính toán",
          "Có thể sử dụng để phân tích thêm"
        ]
      },
      {
        title: "Báo cáo định kỳ",
        description: "Cấu hình gửi báo cáo tự động",
        path: "/scheduled-reports",
        substeps: [
          "Vào menu System → Scheduled Reports",
          "Tạo lịch gửi báo cáo mới",
          "Chọn loại báo cáo",
          "Chọn tần suất (hàng ngày/tuần/tháng)",
          "Nhập email nhận báo cáo"
        ]
      }
    ],
    tips: [
      "Báo cáo PDF phù hợp để trình bày cho quản lý",
      "Báo cáo Excel phù hợp để phân tích sâu hơn",
      "Thiết lập báo cáo định kỳ để không quên"
    ]
  },
  {
    id: "user-management",
    title: "Quản lý Người dùng",
    icon: <Users className="w-5 h-5" />,
    description: "Quản lý tài khoản và phân quyền",
    steps: [
      {
        title: "Tạo tài khoản mới",
        description: "Thêm người dùng vào hệ thống",
        path: "/local-users",
        substeps: [
          "Vào menu System → Local Users",
          "Nhấn 'Thêm người dùng'",
          "Nhập username, email, họ tên",
          "Chọn vai trò (Admin/User)",
          "Thiết lập mật khẩu ban đầu"
        ]
      },
      {
        title: "Phân quyền theo module",
        description: "Cấu hình quyền truy cập chi tiết",
        path: "/module-permissions",
        substeps: [
          "Vào menu System → Module Permissions",
          "Chọn vai trò cần cấu hình",
          "Tick các quyền cho từng module",
          "Lưu cấu hình"
        ]
      },
      {
        title: "Xem lịch sử đăng nhập",
        description: "Theo dõi hoạt động đăng nhập",
        path: "/login-history",
        substeps: [
          "Vào menu System → Login History",
          "Xem danh sách đăng nhập",
          "Lọc theo user, thời gian",
          "Kiểm tra IP đăng nhập"
        ]
      },
      {
        title: "Audit Logs",
        description: "Xem nhật ký hoạt động hệ thống",
        path: "/audit-logs",
        substeps: [
          "Vào menu System → Audit Logs",
          "Xem các thao tác đã thực hiện",
          "Lọc theo user, action, thời gian",
          "Xuất log nếu cần"
        ]
      }
    ],
    tips: [
      "Chỉ cấp quyền Admin cho người cần thiết",
      "Yêu cầu đổi mật khẩu định kỳ",
      "Kiểm tra Audit Logs khi có vấn đề"
    ]
  },
  {
    id: "mms",
    title: "Quản lý Thiết bị (MMS)",
    icon: <Wrench className="w-5 h-5" />,
    description: "Quản lý máy móc, bảo trì và phụ tùng",
    steps: [
      {
        title: "Dashboard MMS",
        description: "Tổng quan tình trạng thiết bị",
        path: "/mms-dashboard",
        substeps: [
          "Vào menu MMS → Dashboard",
          "Xem tổng quan máy móc",
          "Kiểm tra OEE các máy",
          "Xem lịch bảo trì sắp tới"
        ]
      },
      {
        title: "Quản lý bảo trì",
        description: "Lên lịch và theo dõi bảo trì",
        path: "/maintenance-schedule",
        substeps: [
          "Vào menu MMS → Maintenance Schedule",
          "Tạo lịch bảo trì định kỳ",
          "Ghi nhận bảo trì đã thực hiện",
          "Theo dõi chi phí bảo trì"
        ]
      },
      {
        title: "Quản lý phụ tùng",
        description: "Theo dõi kho phụ tùng thay thế",
        path: "/spare-parts",
        substeps: [
          "Vào menu MMS → Spare Parts",
          "Thêm phụ tùng mới",
          "Theo dõi tồn kho",
          "Cảnh báo khi hết hàng"
        ]
      },
      {
        title: "OEE Dashboard",
        description: "Phân tích hiệu suất thiết bị",
        path: "/oee-dashboard",
        substeps: [
          "Vào menu MMS → OEE Dashboard",
          "Xem OEE theo máy/dây chuyền",
          "Phân tích Availability, Performance, Quality",
          "So sánh OEE giữa các máy"
        ]
      }
    ],
    tips: [
      "Bảo trì định kỳ giúp giảm downtime",
      "Theo dõi OEE để phát hiện máy cần cải tiến",
      "Duy trì tồn kho phụ tùng quan trọng"
    ]
  }
];

const WORKFLOW_STEPS = [
  {
    step: 1,
    title: "Thiết lập ban đầu",
    description: "Cấu hình sản phẩm, dây chuyền, công trạm, máy móc",
    icon: <Settings className="w-6 h-6" />
  },
  {
    step: 2,
    title: "Tạo kế hoạch SPC",
    description: "Thiết lập kế hoạch lấy mẫu tự động",
    icon: <Target className="w-6 h-6" />
  },
  {
    step: 3,
    title: "Thu thập dữ liệu",
    description: "Hệ thống tự động lấy mẫu theo kế hoạch",
    icon: <Database className="w-6 h-6" />
  },
  {
    step: 4,
    title: "Phân tích SPC/CPK",
    description: "Tính toán và hiển thị kết quả phân tích",
    icon: <BarChart3 className="w-6 h-6" />
  },
  {
    step: 5,
    title: "Giám sát & Cảnh báo",
    description: "Theo dõi realtime và nhận cảnh báo",
    icon: <Bell className="w-6 h-6" />
  },
  {
    step: 6,
    title: "Báo cáo & Cải tiến",
    description: "Xuất báo cáo và thực hiện cải tiến",
    icon: <TrendingUp className="w-6 h-6" />
  }
];

export default function UserGuide() {
  const [activeSection, setActiveSection] = useState("getting-started");
  const [expandedSteps, setExpandedSteps] = useState<string[]>([]);

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => 
      prev.includes(stepId) 
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-primary" />
              Hướng dẫn Sử dụng
            </h1>
            <p className="text-muted-foreground mt-1">
              Tài liệu training chi tiết cho Hệ thống SPC/CPK Calculator
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            Version 2.0
          </Badge>
        </div>

        {/* System Overview Card */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              {SYSTEM_OVERVIEW.title}
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">
              {SYSTEM_OVERVIEW.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SYSTEM_OVERVIEW.modules.map((module, index) => (
                <div key={index} className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                  <h4 className="font-semibold text-sm mb-1">{module.name}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{module.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {module.features.slice(0, 3).map((feature, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {module.features.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{module.features.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Workflow Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="w-5 h-5 text-primary" />
              Quy trình Làm việc Tổng thể
            </CardTitle>
            <CardDescription>
              6 bước cơ bản để sử dụng hệ thống hiệu quả
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap justify-center gap-2 md:gap-4">
              {WORKFLOW_STEPS.map((step, index) => (
                <div key={step.step} className="flex items-center">
                  <div className="flex flex-col items-center text-center p-3 rounded-lg hover:bg-muted/50 transition-colors min-w-[120px]">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                      {step.icon}
                    </div>
                    <Badge variant="outline" className="mb-1">Bước {step.step}</Badge>
                    <h4 className="font-medium text-sm">{step.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                  </div>
                  {index < WORKFLOW_STEPS.length - 1 && (
                    <ChevronRight className="w-5 h-5 text-muted-foreground hidden md:block" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Mục lục</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="space-y-1 p-4 pt-0">
                  {GUIDE_SECTIONS.map((section) => (
                    <Button
                      key={section.id}
                      variant={activeSection === section.id ? "secondary" : "ghost"}
                      className="w-full justify-start gap-2 h-auto py-3"
                      onClick={() => setActiveSection(section.id)}
                    >
                      {section.icon}
                      <span className="text-left flex-1">{section.title}</span>
                      {activeSection === section.id && (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Content Area */}
          <div className="lg:col-span-3 space-y-4">
            {GUIDE_SECTIONS.filter(s => s.id === activeSection).map((section) => (
              <div key={section.id} className="space-y-4">
                {/* Section Header */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {section.icon}
                      </div>
                      <div>
                        <CardTitle>{section.title}</CardTitle>
                        <CardDescription>{section.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Steps */}
                <Accordion type="multiple" value={expandedSteps} className="space-y-2">
                  {section.steps.map((step, index) => {
                    const stepId = `${section.id}-${index}`;
                    return (
                      <AccordionItem 
                        key={stepId} 
                        value={stepId}
                        className="border rounded-lg px-4"
                      >
                        <AccordionTrigger 
                          onClick={() => toggleStep(stepId)}
                          className="hover:no-underline"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                              {index + 1}
                            </div>
                            <div className="text-left">
                              <h4 className="font-medium">{step.title}</h4>
                              <p className="text-sm text-muted-foreground font-normal">
                                {step.description}
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-4">
                          {step.path && (
                            <div className="mb-3 flex items-center gap-2 text-sm">
                              <Badge variant="outline">
                                Đường dẫn: {step.path}
                              </Badge>
                            </div>
                          )}
                          {step.substeps && (
                            <div className="space-y-2 ml-4">
                              {step.substeps.map((substep, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm">{substep}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>

                {/* Tips */}
                {section.tips && section.tips.length > 0 && (
                  <Card className="border-yellow-500/30 bg-yellow-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                        Mẹo hữu ích
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {section.tips.map((tip, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Zap className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              Tham khảo Nhanh - Các chỉ số SPC/CPK
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Chỉ số</th>
                    <th className="text-left p-3 font-semibold">Mô tả</th>
                    <th className="text-left p-3 font-semibold">Công thức</th>
                    <th className="text-left p-3 font-semibold">Ngưỡng tốt</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">Cp</td>
                    <td className="p-3">Process Capability - Khả năng quy trình</td>
                    <td className="p-3 font-mono text-xs">(USL - LSL) / (6σ)</td>
                    <td className="p-3"><Badge className="bg-green-500">≥ 1.33</Badge></td>
                  </tr>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">Cpk</td>
                    <td className="p-3">Process Capability Index - Chỉ số năng lực quy trình</td>
                    <td className="p-3 font-mono text-xs">min(Cpu, Cpl)</td>
                    <td className="p-3"><Badge className="bg-green-500">≥ 1.33</Badge></td>
                  </tr>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">Pp</td>
                    <td className="p-3">Process Performance - Hiệu suất quy trình</td>
                    <td className="p-3 font-mono text-xs">(USL - LSL) / (6s)</td>
                    <td className="p-3"><Badge className="bg-green-500">≥ 1.33</Badge></td>
                  </tr>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">Ppk</td>
                    <td className="p-3">Process Performance Index</td>
                    <td className="p-3 font-mono text-xs">min(Ppu, Ppl)</td>
                    <td className="p-3"><Badge className="bg-green-500">≥ 1.33</Badge></td>
                  </tr>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">σ (Sigma)</td>
                    <td className="p-3">Độ lệch chuẩn - Standard Deviation</td>
                    <td className="p-3 font-mono text-xs">√(Σ(xi-x̄)²/n)</td>
                    <td className="p-3"><Badge variant="outline">Càng nhỏ càng tốt</Badge></td>
                  </tr>
                  <tr className="hover:bg-muted/50">
                    <td className="p-3 font-medium">OEE</td>
                    <td className="p-3">Overall Equipment Effectiveness</td>
                    <td className="p-3 font-mono text-xs">A × P × Q</td>
                    <td className="p-3"><Badge className="bg-green-500">≥ 85%</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 8 SPC Rules Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              8 SPC Rules (Western Electric Rules)
            </CardTitle>
            <CardDescription>
              Các quy tắc phát hiện biến động bất thường trong quy trình
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { rule: "Rule 1", desc: "1 điểm nằm ngoài 3σ", severity: "critical" },
                { rule: "Rule 2", desc: "9 điểm liên tiếp cùng phía đường trung tâm", severity: "warning" },
                { rule: "Rule 3", desc: "6 điểm liên tiếp tăng hoặc giảm", severity: "warning" },
                { rule: "Rule 4", desc: "14 điểm liên tiếp dao động lên xuống", severity: "warning" },
                { rule: "Rule 5", desc: "2/3 điểm nằm ngoài 2σ cùng phía", severity: "warning" },
                { rule: "Rule 6", desc: "4/5 điểm nằm ngoài 1σ cùng phía", severity: "warning" },
                { rule: "Rule 7", desc: "15 điểm liên tiếp trong 1σ", severity: "info" },
                { rule: "Rule 8", desc: "8 điểm liên tiếp ngoài 1σ (cả 2 phía)", severity: "warning" },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Badge 
                    variant={item.severity === "critical" ? "destructive" : item.severity === "warning" ? "default" : "secondary"}
                  >
                    {item.rule}
                  </Badge>
                  <span className="text-sm">{item.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                <p>Tài liệu được cập nhật: Tháng 12/2024</p>
                <p>Phiên bản hệ thống: 2.0</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Mail className="w-4 h-4 mr-2" />
                  Liên hệ hỗ trợ
                </Button>
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Tải PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
