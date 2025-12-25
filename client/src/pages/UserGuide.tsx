import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
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
  Zap,
  Video,
  Download,
  HelpCircle,
  Search,
  ExternalLink,
  Play,
  X,
  ChevronDown,
  ChevronUp,
  FileDown
} from "lucide-react";

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  steps: GuideStep[];
  tips?: string[];
  videoId?: string;
}

interface GuideStep {
  title: string;
  description: string;
  path?: string;
  substeps?: string[];
}

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  thumbnail: string;
  videoUrl: string;
}

interface FAQItem {
  question: string;
  answer: string;
  category: string;
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

// Video Tutorials Data
const VIDEO_TUTORIALS: VideoTutorial[] = [
  {
    id: "intro",
    title: "Giới thiệu Hệ thống SPC/CPK Calculator",
    description: "Tổng quan về các tính năng chính và cách điều hướng trong hệ thống",
    duration: "5:30",
    category: "Bắt đầu",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
  },
  {
    id: "spc-analysis",
    title: "Hướng dẫn Phân tích SPC/CPK",
    description: "Chi tiết cách thực hiện phân tích SPC/CPK từ đầu đến cuối",
    duration: "12:45",
    category: "Phân tích",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
  },
  {
    id: "production-setup",
    title: "Thiết lập Dây chuyền Sản xuất",
    description: "Cách cấu hình dây chuyền, công trạm và máy móc",
    duration: "8:20",
    category: "Thiết lập",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
  },
  {
    id: "spc-plan",
    title: "Tạo Kế hoạch Lấy mẫu SPC",
    description: "Hướng dẫn tạo và quản lý kế hoạch lấy mẫu tự động",
    duration: "10:15",
    category: "Kế hoạch",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
  },
  {
    id: "realtime-dashboard",
    title: "Sử dụng Dashboard Realtime",
    description: "Giám sát dữ liệu realtime và nhận cảnh báo tức thì",
    duration: "7:00",
    category: "Giám sát",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
  },
  {
    id: "alerts-notifications",
    title: "Cấu hình Cảnh báo & Thông báo",
    description: "Thiết lập email, ngưỡng cảnh báo CPK và SMTP",
    duration: "6:30",
    category: "Cảnh báo",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
  },
  {
    id: "reports-export",
    title: "Xuất Báo cáo PDF/Excel",
    description: "Cách tạo và xuất các loại báo cáo phân tích",
    duration: "5:45",
    category: "Báo cáo",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
  },
  {
    id: "user-management",
    title: "Quản lý Người dùng & Phân quyền",
    description: "Hướng dẫn quản lý user và phân quyền truy cập",
    duration: "9:10",
    category: "Quản trị",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
  },
  {
    id: "mms-overview",
    title: "Tổng quan MMS - Quản lý Thiết bị",
    description: "Giới thiệu module quản lý máy móc và bảo trì",
    duration: "11:00",
    category: "MMS",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
  },
  {
    id: "8-spc-rules",
    title: "Giải thích 8 SPC Rules",
    description: "Chi tiết về 8 quy tắc Western Electric và cách áp dụng",
    duration: "15:20",
    category: "Kiến thức",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
  }
];

// FAQ Data
const FAQ_ITEMS: FAQItem[] = [
  // Phân tích SPC/CPK
  {
    question: "CPK là gì và tại sao nó quan trọng?",
    answer: "CPK (Process Capability Index) là chỉ số đo lường khả năng của quy trình sản xuất trong việc tạo ra sản phẩm nằm trong giới hạn kỹ thuật (USL/LSL). CPK > 1.33 cho thấy quy trình đạt yêu cầu, CPK < 1.0 cho thấy quy trình cần cải tiến ngay. CPK quan trọng vì nó giúp dự đoán tỷ lệ lỗi và đánh giá năng lực sản xuất.",
    category: "Phân tích"
  },
  {
    question: "Sự khác biệt giữa Cp và Cpk là gì?",
    answer: "Cp đo lường khả năng tiềm năng của quy trình (chỉ xét độ rộng), trong khi Cpk đo lường khả năng thực tế (xét cả độ lệch tâm). Cp = (USL - LSL) / 6σ, còn Cpk = min(Cpu, Cpl). Nếu Cp cao nhưng Cpk thấp, nghĩa là quy trình có khả năng tốt nhưng bị lệch tâm.",
    category: "Phân tích"
  },
  {
    question: "Tại sao kết quả phân tích SPC của tôi hiển thị 'Không đủ dữ liệu'?",
    answer: "Hệ thống yêu cầu tối thiểu 25 điểm dữ liệu để tính toán SPC/CPK chính xác. Hãy kiểm tra: (1) Khoảng thời gian đã chọn có đủ dữ liệu không, (2) Mapping database đã cấu hình đúng chưa, (3) Sản phẩm và công trạm đã được thiết lập tiêu chuẩn USL/LSL chưa.",
    category: "Phân tích"
  },
  {
    question: "8 SPC Rules (Western Electric Rules) là gì?",
    answer: "8 SPC Rules là bộ quy tắc phát hiện biến động bất thường: Rule 1 (1 điểm ngoài 3σ), Rule 2 (9 điểm cùng phía), Rule 3 (6 điểm tăng/giảm liên tục), Rule 4 (14 điểm dao động), Rule 5 (2/3 điểm ngoài 2σ), Rule 6 (4/5 điểm ngoài 1σ), Rule 7 (15 điểm trong 1σ), Rule 8 (8 điểm ngoài 1σ cả 2 phía).",
    category: "Phân tích"
  },
  // Thiết lập hệ thống
  {
    question: "Làm thế nào để kết nối với database bên ngoài?",
    answer: "Vào menu System → Database Connections → Thêm kết nối mới. Nhập connection string theo định dạng: mysql://user:password@host:port/database. Sau đó tạo Mapping để liên kết sản phẩm/công trạm với bảng dữ liệu tương ứng.",
    category: "Thiết lập"
  },
  {
    question: "Tại sao tôi không thể thêm sản phẩm mới?",
    answer: "Kiểm tra: (1) Bạn có quyền Admin hoặc quyền 'Quản lý sản phẩm' không, (2) Mã sản phẩm có bị trùng không, (3) Các trường bắt buộc đã điền đầy đủ chưa. Nếu vẫn lỗi, liên hệ Admin để kiểm tra phân quyền.",
    category: "Thiết lập"
  },
  {
    question: "Cách thiết lập tiêu chuẩn USL/LSL cho sản phẩm?",
    answer: "Vào menu SPC/CPK → Tiêu chuẩn Kiểm tra → Thêm mới. Chọn sản phẩm, nhập USL (giới hạn trên), LSL (giới hạn dưới), Target (giá trị mục tiêu). Lưu ý: USL phải lớn hơn LSL, Target nên nằm giữa USL và LSL.",
    category: "Thiết lập"
  },
  // Kế hoạch SPC
  {
    question: "Kế hoạch SPC không tự động chạy, phải làm sao?",
    answer: "Kiểm tra: (1) Trạng thái kế hoạch là 'Active', (2) Thời gian bắt đầu đã đến chưa, (3) Mapping database đã cấu hình và test thành công, (4) Dây chuyền sản xuất đang hoạt động. Nếu vẫn không chạy, kiểm tra logs trong System → Audit Logs.",
    category: "Kế hoạch"
  },
  {
    question: "Làm sao để dừng kế hoạch SPC đang chạy?",
    answer: "Vào menu SPC/CPK → Kế hoạch SPC → Tìm kế hoạch cần dừng → Click nút 'Tạm dừng' hoặc 'Kết thúc'. Kế hoạch 'Tạm dừng' có thể kích hoạt lại, còn 'Kết thúc' sẽ không thể chạy lại.",
    category: "Kế hoạch"
  },
  // Cảnh báo & Thông báo
  {
    question: "Tôi không nhận được email cảnh báo CPK, tại sao?",
    answer: "Kiểm tra: (1) SMTP đã cấu hình và test thành công chưa (System → SMTP Settings), (2) Email của bạn đã được thêm vào danh sách nhận thông báo chưa, (3) Ngưỡng CPK đã thiết lập đúng chưa, (4) Kiểm tra thư mục Spam/Junk trong email.",
    category: "Cảnh báo"
  },
  {
    question: "Cách cấu hình SMTP với Gmail?",
    answer: "Sử dụng: Host: smtp.gmail.com, Port: 587, Security: TLS. Quan trọng: Phải tạo 'App Password' trong Google Account (không dùng mật khẩu thường). Vào Google Account → Security → 2-Step Verification → App passwords → Tạo password cho 'Mail'.",
    category: "Cảnh báo"
  },
  // Dashboard & Báo cáo
  {
    question: "Dashboard Realtime không cập nhật dữ liệu mới?",
    answer: "Kiểm tra: (1) Kế hoạch SPC đang Active và đang chạy, (2) Kết nối internet ổn định, (3) Thử refresh trang (F5), (4) Kiểm tra browser console có lỗi không. SSE connection có thể bị ngắt sau 30 phút không hoạt động.",
    category: "Dashboard"
  },
  {
    question: "Làm sao để xuất báo cáo PDF?",
    answer: "Sau khi thực hiện phân tích SPC/CPK, click nút 'Xuất PDF' ở góc phải. Báo cáo sẽ bao gồm: thông tin sản phẩm, kết quả tính toán, biểu đồ Control Chart, và danh sách vi phạm (nếu có).",
    category: "Báo cáo"
  },
  // Quản lý người dùng
  {
    question: "Làm sao để thêm user mới vào hệ thống?",
    answer: "Chỉ Admin mới có quyền thêm user. Vào System → Quản lý Người dùng → Thêm người dùng. Nhập thông tin, chọn vai trò (Admin/User), gán quyền truy cập các module. User mới sẽ nhận email với thông tin đăng nhập.",
    category: "Quản trị"
  },
  {
    question: "Tôi quên mật khẩu, phải làm sao?",
    answer: "Click 'Quên mật khẩu' ở trang đăng nhập, nhập email đã đăng ký. Hệ thống sẽ gửi link reset password. Nếu không nhận được email, liên hệ Admin để reset thủ công.",
    category: "Quản trị"
  },
  // Lỗi thường gặp
  {
    question: "Lỗi 'Connection refused' khi kết nối database?",
    answer: "Nguyên nhân: (1) Database server không chạy, (2) Firewall chặn port, (3) IP không được whitelist, (4) Sai thông tin kết nối. Giải pháp: Kiểm tra database server, mở port trong firewall, thêm IP vào whitelist, verify connection string.",
    category: "Lỗi"
  },
  {
    question: "Trang web load chậm hoặc bị treo?",
    answer: "Thử: (1) Clear cache browser (Ctrl+Shift+Delete), (2) Tắt extensions, (3) Dùng Chrome/Edge mới nhất, (4) Kiểm tra kết nối internet. Nếu vẫn chậm, có thể do query dữ liệu lớn - thử thu hẹp khoảng thời gian phân tích.",
    category: "Lỗi"
  },
  {
    question: "Biểu đồ không hiển thị hoặc bị lỗi?",
    answer: "Kiểm tra: (1) Dữ liệu có đủ điểm không (tối thiểu 25), (2) Giá trị USL/LSL đã thiết lập chưa, (3) Dữ liệu có giá trị hợp lệ không (không có null/NaN). Thử refresh trang hoặc chọn lại khoảng thời gian.",
    category: "Lỗi"
  }
];

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "getting-started",
    title: "Bắt đầu sử dụng",
    icon: <PlayCircle className="w-5 h-5" />,
    description: "Hướng dẫn cơ bản để bắt đầu sử dụng hệ thống",
    videoId: "intro",
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
    videoId: "spc-analysis",
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
    videoId: "production-setup",
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
    videoId: "spc-plan",
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
          "Kiểm tra lại cấu hình",
          "Nhấn nút 'Kích hoạt'",
          "Hệ thống sẽ tự động lấy mẫu theo lịch",
          "Theo dõi trạng thái trên Dashboard Realtime"
        ]
      }
    ],
    tips: [
      "Nên test mapping database trước khi kích hoạt kế hoạch",
      "Để trống thời gian kết thúc nếu muốn chạy liên tục",
      "Kiểm tra Dashboard Realtime để xác nhận dữ liệu đang được thu thập"
    ]
  },
  {
    id: "realtime-monitoring",
    title: "Giám sát Realtime",
    icon: <Monitor className="w-5 h-5" />,
    description: "Theo dõi dữ liệu sản xuất theo thời gian thực",
    videoId: "realtime-dashboard",
    steps: [
      {
        title: "Truy cập Dashboard Realtime",
        description: "Mở trang giám sát realtime",
        path: "/realtime-dashboard",
        substeps: [
          "Vào menu Analysis → Realtime Dashboard",
          "Chọn kế hoạch SPC cần theo dõi",
          "Dashboard sẽ hiển thị dữ liệu realtime"
        ]
      },
      {
        title: "Tùy chỉnh Dashboard",
        description: "Cấu hình hiển thị theo nhu cầu",
        substeps: [
          "Nhấn nút 'Tùy chỉnh'",
          "Chọn các widget muốn hiển thị",
          "Sắp xếp vị trí các widget",
          "Lưu cấu hình"
        ]
      },
      {
        title: "Đọc hiểu dữ liệu realtime",
        description: "Hiểu các chỉ số hiển thị",
        substeps: [
          "CPK hiện tại: Chỉ số năng lực quy trình",
          "Trend: Xu hướng tăng/giảm",
          "Violations: Số vi phạm SPC Rules",
          "Status: Trạng thái OK/Warning/Critical"
        ]
      }
    ],
    tips: [
      "Mở Dashboard trên màn hình lớn để dễ theo dõi",
      "Cấu hình cảnh báo email để nhận thông báo khi không theo dõi",
      "Kiểm tra định kỳ để phát hiện sớm vấn đề"
    ]
  },
  {
    id: "alerts",
    title: "Cảnh báo & Thông báo",
    icon: <Bell className="w-5 h-5" />,
    description: "Cấu hình và quản lý hệ thống cảnh báo",
    videoId: "alerts-notifications",
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
    videoId: "reports-export",
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
          "Thiết lập tần suất gửi",
          "Thêm email nhận báo cáo"
        ]
      }
    ],
    tips: [
      "Xuất PDF để chia sẻ với quản lý",
      "Xuất Excel để phân tích thêm trong spreadsheet",
      "Cấu hình báo cáo định kỳ để tự động nhận báo cáo hàng ngày/tuần"
    ]
  },
  {
    id: "user-management",
    title: "Quản lý Người dùng",
    icon: <Users className="w-5 h-5" />,
    description: "Quản lý tài khoản và phân quyền",
    videoId: "user-management",
    steps: [
      {
        title: "Thêm người dùng mới",
        description: "Tạo tài khoản cho nhân viên",
        path: "/users",
        substeps: [
          "Vào menu System → Quản lý Người dùng",
          "Nhấn 'Thêm người dùng'",
          "Nhập thông tin: tên, email, mật khẩu",
          "Chọn vai trò (Admin/User)",
          "Gán quyền truy cập các module"
        ]
      },
      {
        title: "Phân quyền module",
        description: "Cấu hình quyền truy cập chi tiết",
        path: "/permissions",
        substeps: [
          "Vào menu System → Phân quyền",
          "Chọn vai trò cần cấu hình",
          "Tick/untick các quyền",
          "Lưu thay đổi"
        ]
      },
      {
        title: "Quản lý profile",
        description: "Cập nhật thông tin cá nhân",
        path: "/profile",
        substeps: [
          "Click vào avatar góc phải",
          "Chọn 'Profile'",
          "Cập nhật thông tin",
          "Đổi mật khẩu nếu cần"
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
    videoId: "mms-overview",
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
  const [activeTab, setActiveTab] = useState("guide");
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null);
  const [faqSearch, setFaqSearch] = useState("");
  const [faqCategory, setFaqCategory] = useState("all");
  const [expandedFaqs, setExpandedFaqs] = useState<string[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => 
      prev.includes(stepId) 
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  const toggleFaq = (question: string) => {
    setExpandedFaqs(prev =>
      prev.includes(question)
        ? prev.filter(q => q !== question)
        : [...prev, question]
    );
  };

  const openVideoDialog = (video: VideoTutorial) => {
    setSelectedVideo(video);
    setVideoDialogOpen(true);
  };

  const filteredFaqs = FAQ_ITEMS.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
                          faq.answer.toLowerCase().includes(faqSearch.toLowerCase());
    const matchesCategory = faqCategory === "all" || faq.category === faqCategory;
    return matchesSearch && matchesCategory;
  });

  const faqCategories = ["all", ...Array.from(new Set(FAQ_ITEMS.map(f => f.category)))];

  const videoCategories = Array.from(new Set(VIDEO_TUTORIALS.map(v => v.category)));

  // Export PDF function
  const handleExportPDF = async () => {
    toast({
      title: "Đang tạo PDF...",
      description: "Vui lòng đợi trong giây lát",
    });

    try {
      // Create a simple HTML content for PDF
      const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Hướng dẫn Sử dụng - SPC/CPK Calculator</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
            h1 { color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 10px; }
            h2 { color: #2c5282; margin-top: 30px; }
            h3 { color: #2b6cb0; }
            .section { margin-bottom: 30px; }
            .step { margin-left: 20px; margin-bottom: 15px; }
            .substep { margin-left: 40px; color: #4a5568; }
            .tip { background: #fffbeb; padding: 10px; border-left: 4px solid #f6ad55; margin: 10px 0; }
            .module { background: #f7fafc; padding: 15px; margin: 10px 0; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
            th { background: #edf2f7; }
            .faq { margin-bottom: 20px; }
            .faq-q { font-weight: bold; color: #2c5282; }
            .faq-a { margin-left: 20px; color: #4a5568; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>📘 Hướng dẫn Sử dụng Hệ thống SPC/CPK Calculator</h1>
          <p><strong>Phiên bản:</strong> 2.0 | <strong>Cập nhật:</strong> Tháng 12/2024</p>
          
          <div class="section">
            <h2>1. Tổng quan Hệ thống</h2>
            <p>${SYSTEM_OVERVIEW.description}</p>
            <h3>Các Module chính:</h3>
            ${SYSTEM_OVERVIEW.modules.map(m => `
              <div class="module">
                <strong>${m.name}</strong>: ${m.description}
                <br><em>Tính năng: ${m.features.join(", ")}</em>
              </div>
            `).join("")}
          </div>

          <div class="section">
            <h2>2. Quy trình Làm việc</h2>
            ${WORKFLOW_STEPS.map(s => `
              <div class="step">
                <strong>Bước ${s.step}: ${s.title}</strong>
                <p>${s.description}</p>
              </div>
            `).join("")}
          </div>

          ${GUIDE_SECTIONS.map((section, idx) => `
            <div class="section">
              <h2>${idx + 3}. ${section.title}</h2>
              <p>${section.description}</p>
              ${section.steps.map((step, i) => `
                <div class="step">
                  <h3>${i + 1}. ${step.title}</h3>
                  <p>${step.description}</p>
                  ${step.path ? `<p><em>Đường dẫn: ${step.path}</em></p>` : ""}
                  ${step.substeps ? step.substeps.map(ss => `
                    <div class="substep">• ${ss}</div>
                  `).join("") : ""}
                </div>
              `).join("")}
              ${section.tips ? `
                <div class="tip">
                  <strong>💡 Mẹo hữu ích:</strong>
                  <ul>
                    ${section.tips.map(t => `<li>${t}</li>`).join("")}
                  </ul>
                </div>
              ` : ""}
            </div>
          `).join("")}

          <div class="section">
            <h2>Bảng Tham khảo - Các chỉ số SPC/CPK</h2>
            <table>
              <tr><th>Chỉ số</th><th>Mô tả</th><th>Công thức</th><th>Ngưỡng tốt</th></tr>
              <tr><td>Cp</td><td>Process Capability</td><td>(USL - LSL) / (6σ)</td><td>≥ 1.33</td></tr>
              <tr><td>Cpk</td><td>Process Capability Index</td><td>min(Cpu, Cpl)</td><td>≥ 1.33</td></tr>
              <tr><td>Pp</td><td>Process Performance</td><td>(USL - LSL) / (6s)</td><td>≥ 1.33</td></tr>
              <tr><td>Ppk</td><td>Process Performance Index</td><td>min(Ppu, Ppl)</td><td>≥ 1.33</td></tr>
              <tr><td>σ</td><td>Standard Deviation</td><td>√(Σ(xi-x̄)²/n)</td><td>Càng nhỏ càng tốt</td></tr>
              <tr><td>OEE</td><td>Overall Equipment Effectiveness</td><td>A × P × Q</td><td>≥ 85%</td></tr>
            </table>
          </div>

          <div class="section">
            <h2>8 SPC Rules (Western Electric Rules)</h2>
            <table>
              <tr><th>Rule</th><th>Mô tả</th><th>Mức độ</th></tr>
              <tr><td>Rule 1</td><td>1 điểm nằm ngoài 3σ</td><td>Critical</td></tr>
              <tr><td>Rule 2</td><td>9 điểm liên tiếp cùng phía đường trung tâm</td><td>Warning</td></tr>
              <tr><td>Rule 3</td><td>6 điểm liên tiếp tăng hoặc giảm</td><td>Warning</td></tr>
              <tr><td>Rule 4</td><td>14 điểm liên tiếp dao động lên xuống</td><td>Warning</td></tr>
              <tr><td>Rule 5</td><td>2/3 điểm nằm ngoài 2σ cùng phía</td><td>Warning</td></tr>
              <tr><td>Rule 6</td><td>4/5 điểm nằm ngoài 1σ cùng phía</td><td>Warning</td></tr>
              <tr><td>Rule 7</td><td>15 điểm liên tiếp trong 1σ</td><td>Info</td></tr>
              <tr><td>Rule 8</td><td>8 điểm liên tiếp ngoài 1σ (cả 2 phía)</td><td>Warning</td></tr>
            </table>
          </div>

          <div class="section">
            <h2>Câu hỏi Thường gặp (FAQ)</h2>
            ${FAQ_ITEMS.slice(0, 10).map(faq => `
              <div class="faq">
                <p class="faq-q">❓ ${faq.question}</p>
                <p class="faq-a">${faq.answer}</p>
              </div>
            `).join("")}
          </div>

          <hr>
          <p style="text-align: center; color: #718096;">
            © 2024 SPC/CPK Calculator System - Tài liệu hướng dẫn sử dụng
          </p>
        </body>
        </html>
      `;

      // Create blob and download
      const blob = new Blob([pdfContent], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "SPC_CPK_User_Guide.html";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Xuất thành công!",
        description: "File hướng dẫn đã được tải về. Mở file HTML và in sang PDF nếu cần.",
      });
    } catch (error) {
      toast({
        title: "Lỗi xuất file",
        description: "Không thể tạo file. Vui lòng thử lại.",
        variant: "destructive"
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" ref={contentRef}>
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
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              Version 2.0
            </Badge>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileDown className="w-4 h-4 mr-2" />
              Tải PDF
            </Button>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="guide" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Hướng dẫn
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Video
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              FAQ
            </TabsTrigger>
          </TabsList>

          {/* Guide Tab */}
          <TabsContent value="guide" className="space-y-6 mt-6">
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
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                              {section.icon}
                            </div>
                            <div>
                              <CardTitle>{section.title}</CardTitle>
                              <CardDescription>{section.description}</CardDescription>
                            </div>
                          </div>
                          {section.videoId && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                const video = VIDEO_TUTORIALS.find(v => v.id === section.videoId);
                                if (video) openVideoDialog(video);
                              }}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Xem Video
                            </Button>
                          )}
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
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-primary" />
                  Video Hướng dẫn
                </CardTitle>
                <CardDescription>
                  Xem video hướng dẫn chi tiết cho từng chức năng của hệ thống
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Video Categories */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  >
                    Tất cả ({VIDEO_TUTORIALS.length})
                  </Badge>
                  {videoCategories.map(cat => (
                    <Badge 
                      key={cat}
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    >
                      {cat} ({VIDEO_TUTORIALS.filter(v => v.category === cat).length})
                    </Badge>
                  ))}
                </div>

                {/* Video Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {VIDEO_TUTORIALS.map((video) => (
                    <Card 
                      key={video.id} 
                      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => openVideoDialog(video)}
                    >
                      <div className="relative aspect-video bg-muted">
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                            <Play className="w-8 h-8 text-primary ml-1" />
                          </div>
                        </div>
                        <div className="absolute bottom-2 right-2">
                          <Badge variant="secondary" className="text-xs">
                            {video.duration}
                          </Badge>
                        </div>
                        <div className="absolute top-2 left-2">
                          <Badge className="text-xs">
                            {video.category}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-sm mb-1 line-clamp-2">
                          {video.title}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {video.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Start Videos */}
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Video Khởi đầu Nhanh
                </CardTitle>
                <CardDescription>
                  3 video quan trọng nhất để bắt đầu sử dụng hệ thống
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {VIDEO_TUTORIALS.slice(0, 3).map((video, index) => (
                    <div 
                      key={video.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card cursor-pointer hover:bg-muted/50"
                      onClick={() => openVideoDialog(video)}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{video.title}</h4>
                        <p className="text-xs text-muted-foreground">{video.duration}</p>
                      </div>
                      <Play className="w-5 h-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  Câu hỏi Thường gặp (FAQ)
                </CardTitle>
                <CardDescription>
                  Tìm câu trả lời cho các vấn đề phổ biến khi sử dụng hệ thống
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search and Filter */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm câu hỏi..."
                      value={faqSearch}
                      onChange={(e) => setFaqSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {faqCategories.map(cat => (
                      <Button
                        key={cat}
                        variant={faqCategory === cat ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFaqCategory(cat)}
                      >
                        {cat === "all" ? "Tất cả" : cat}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* FAQ List */}
                <div className="space-y-3">
                  {filteredFaqs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Không tìm thấy câu hỏi phù hợp</p>
                      <p className="text-sm">Thử tìm kiếm với từ khóa khác</p>
                    </div>
                  ) : (
                    filteredFaqs.map((faq, index) => {
                      const isExpanded = expandedFaqs.includes(faq.question);
                      return (
                        <div 
                          key={index}
                          className="border rounded-lg overflow-hidden"
                        >
                          <button
                            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                            onClick={() => toggleFaq(faq.question)}
                          >
                            <div className="flex items-start gap-3 flex-1">
                              <Badge variant="outline" className="shrink-0 mt-0.5">
                                {faq.category}
                              </Badge>
                              <span className="font-medium text-sm">{faq.question}</span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                            )}
                          </button>
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-0">
                              <div className="pl-[72px] text-sm text-muted-foreground leading-relaxed">
                                {faq.answer}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Contact Support */}
                <Card className="mt-6 border-blue-500/30 bg-blue-500/5">
                  <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-blue-500/10">
                          <Mail className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">Không tìm thấy câu trả lời?</h4>
                          <p className="text-xs text-muted-foreground">
                            Liên hệ đội ngũ hỗ trợ để được giúp đỡ
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Mail className="w-4 h-4 mr-2" />
                        Liên hệ Hỗ trợ
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  Tải PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Video Dialog */}
        <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                {selectedVideo?.title}
              </DialogTitle>
              <DialogDescription>
                {selectedVideo?.description}
              </DialogDescription>
            </DialogHeader>
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              {selectedVideo && (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <div className="text-center">
                    <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">{selectedVideo.title}</p>
                    <p className="text-sm opacity-70 mt-2">
                      Video hướng dẫn sẽ được tích hợp tại đây
                    </p>
                    <p className="text-xs opacity-50 mt-1">
                      Thời lượng: {selectedVideo.duration}
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => window.open(selectedVideo.videoUrl, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Mở trong tab mới
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
