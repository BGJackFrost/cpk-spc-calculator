import { useState, useRef, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
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
import { Progress } from "@/components/ui/progress";
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
  FileDown,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  SkipForward,
  SkipBack,
  List,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Bug,
  Rocket,
  BookMarked,
  GraduationCap,
  Award,
  Star,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpingHand,
  Sparkles
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

interface VideoTutorialLocal {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  thumbnail: string;
  videoUrl: string;
  level: "beginner" | "intermediate" | "advanced";
  views?: number;
  likes?: number;
  chapters?: { time: string; title: string }[];
}

// Interface for database videos
interface VideoTutorialDB {
  id: number;
  title: string;
  description: string | null;
  youtubeUrl: string;
  youtubeId: string;
  thumbnailUrl: string | null;
  duration: string | null;
  category: string;
  level: "beginner" | "intermediate" | "advanced";
  sortOrder: number;
  isActive: number;
  viewCount: number;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FAQItem {
  question: string;
  answer: string;
  category: string;
  tags?: string[];
  helpful?: number;
  relatedQuestions?: string[];
}

interface BestPractice {
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  tips: string[];
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

// Enhanced Video Tutorials Data with real YouTube embeds
const VIDEO_TUTORIALS: VideoTutorialLocal[] = [
  {
    id: "intro",
    title: "Giới thiệu Hệ thống SPC/CPK Calculator",
    description: "Tổng quan về các tính năng chính, cách điều hướng trong hệ thống và những điều cần biết khi bắt đầu sử dụng",
    duration: "5:30",
    category: "Bắt đầu",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    level: "beginner",
    views: 1250,
    likes: 98,
    chapters: [
      { time: "0:00", title: "Giới thiệu" },
      { time: "1:00", title: "Đăng nhập hệ thống" },
      { time: "2:30", title: "Giao diện Dashboard" },
      { time: "4:00", title: "Menu điều hướng" },
      { time: "5:00", title: "Tổng kết" }
    ]
  },
  {
    id: "spc-analysis",
    title: "Hướng dẫn Phân tích SPC/CPK Chi tiết",
    description: "Chi tiết cách thực hiện phân tích SPC/CPK từ đầu đến cuối, bao gồm cách đọc hiểu kết quả và biểu đồ",
    duration: "12:45",
    category: "Phân tích",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    level: "intermediate",
    views: 2340,
    likes: 187,
    chapters: [
      { time: "0:00", title: "Tổng quan phân tích SPC" },
      { time: "2:00", title: "Chọn dữ liệu nguồn" },
      { time: "4:30", title: "Thiết lập thông số" },
      { time: "7:00", title: "Đọc hiểu kết quả CPK" },
      { time: "9:30", title: "Phân tích Control Chart" },
      { time: "11:00", title: "Xuất báo cáo" }
    ]
  },
  {
    id: "production-setup",
    title: "Thiết lập Dây chuyền Sản xuất",
    description: "Cách cấu hình dây chuyền, công trạm, máy móc và quy trình sản xuất một cách hiệu quả",
    duration: "8:20",
    category: "Thiết lập",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    level: "beginner",
    views: 1890,
    likes: 145,
    chapters: [
      { time: "0:00", title: "Giới thiệu" },
      { time: "1:30", title: "Tạo dây chuyền mới" },
      { time: "3:00", title: "Thêm công trạm" },
      { time: "5:00", title: "Cấu hình máy móc" },
      { time: "7:00", title: "Liên kết quy trình" }
    ]
  },
  {
    id: "spc-plan",
    title: "Tạo Kế hoạch Lấy mẫu SPC Tự động",
    description: "Hướng dẫn tạo và quản lý kế hoạch lấy mẫu tự động, cấu hình tần suất và mapping database",
    duration: "10:15",
    category: "Kế hoạch",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    level: "intermediate",
    views: 1560,
    likes: 123,
    chapters: [
      { time: "0:00", title: "Tổng quan kế hoạch SPC" },
      { time: "2:00", title: "Tạo kế hoạch mới" },
      { time: "4:00", title: "Cấu hình tần suất" },
      { time: "6:00", title: "Mapping database" },
      { time: "8:00", title: "Kích hoạt và theo dõi" }
    ]
  },
  {
    id: "realtime-dashboard",
    title: "Sử dụng Dashboard Realtime",
    description: "Giám sát dữ liệu realtime, tùy chỉnh dashboard và nhận cảnh báo tức thì khi có vấn đề",
    duration: "7:00",
    category: "Giám sát",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    level: "beginner",
    views: 2100,
    likes: 167,
    chapters: [
      { time: "0:00", title: "Truy cập Dashboard" },
      { time: "1:30", title: "Các widget hiển thị" },
      { time: "3:00", title: "Tùy chỉnh giao diện" },
      { time: "5:00", title: "Đọc hiểu cảnh báo" }
    ]
  },
  {
    id: "alerts-notifications",
    title: "Cấu hình Cảnh báo & Thông báo Email",
    description: "Thiết lập email thông báo, ngưỡng cảnh báo CPK và cấu hình SMTP server",
    duration: "6:30",
    category: "Cảnh báo",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    level: "intermediate",
    views: 1340,
    likes: 98,
    chapters: [
      { time: "0:00", title: "Tổng quan hệ thống cảnh báo" },
      { time: "1:30", title: "Cấu hình ngưỡng CPK" },
      { time: "3:00", title: "Thiết lập SMTP" },
      { time: "5:00", title: "Test gửi email" }
    ]
  },
  {
    id: "reports-export",
    title: "Xuất Báo cáo PDF/Excel Chuyên nghiệp",
    description: "Cách tạo và xuất các loại báo cáo phân tích với định dạng chuyên nghiệp",
    duration: "5:45",
    category: "Báo cáo",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    level: "beginner",
    views: 1780,
    likes: 134,
    chapters: [
      { time: "0:00", title: "Các loại báo cáo" },
      { time: "1:30", title: "Xuất PDF" },
      { time: "3:00", title: "Xuất Excel" },
      { time: "4:30", title: "Báo cáo định kỳ" }
    ]
  },
  {
    id: "user-management",
    title: "Quản lý Người dùng & Phân quyền",
    description: "Hướng dẫn quản lý user, phân quyền truy cập và theo dõi hoạt động hệ thống",
    duration: "9:10",
    category: "Quản trị",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    level: "advanced",
    views: 980,
    likes: 76,
    chapters: [
      { time: "0:00", title: "Tổng quan quản lý user" },
      { time: "2:00", title: "Thêm người dùng mới" },
      { time: "4:00", title: "Phân quyền module" },
      { time: "6:00", title: "Audit logs" },
      { time: "8:00", title: "Best practices" }
    ]
  },
  {
    id: "mms-overview",
    title: "Tổng quan MMS - Quản lý Thiết bị",
    description: "Giới thiệu module quản lý máy móc, lịch bảo trì và theo dõi OEE",
    duration: "11:00",
    category: "MMS",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    level: "intermediate",
    views: 1120,
    likes: 89,
    chapters: [
      { time: "0:00", title: "Giới thiệu MMS" },
      { time: "2:00", title: "Dashboard MMS" },
      { time: "4:00", title: "Quản lý máy móc" },
      { time: "6:00", title: "Lịch bảo trì" },
      { time: "8:00", title: "OEE Dashboard" },
      { time: "10:00", title: "Phụ tùng thay thế" }
    ]
  },
  {
    id: "8-spc-rules",
    title: "Giải thích Chi tiết 8 SPC Rules",
    description: "Chi tiết về 8 quy tắc Western Electric, cách phát hiện và xử lý vi phạm",
    duration: "15:20",
    category: "Kiến thức",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    level: "advanced",
    views: 2560,
    likes: 234,
    chapters: [
      { time: "0:00", title: "Tổng quan 8 SPC Rules" },
      { time: "2:00", title: "Rule 1: Beyond 3 Sigma" },
      { time: "4:00", title: "Rule 2: 9 Points Same Side" },
      { time: "6:00", title: "Rule 3: 6 Points Trend" },
      { time: "8:00", title: "Rule 4-6: Zone Rules" },
      { time: "11:00", title: "Rule 7-8: Special Patterns" },
      { time: "13:00", title: "Xử lý vi phạm" }
    ]
  },
  {
    id: "database-mapping",
    title: "Cấu hình Database Mapping",
    description: "Hướng dẫn kết nối database bên ngoài và cấu hình mapping dữ liệu",
    duration: "8:45",
    category: "Thiết lập",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    level: "advanced",
    views: 890,
    likes: 67,
    chapters: [
      { time: "0:00", title: "Giới thiệu Database Mapping" },
      { time: "2:00", title: "Thêm kết nối database" },
      { time: "4:00", title: "Tạo mapping mới" },
      { time: "6:00", title: "Test kết nối" },
      { time: "7:30", title: "Troubleshooting" }
    ]
  },
  {
    id: "multi-analysis",
    title: "Phân tích Đa sản phẩm/Công trạm",
    description: "Cách phân tích và so sánh CPK giữa nhiều sản phẩm, công trạm cùng lúc",
    duration: "9:30",
    category: "Phân tích",
    thumbnail: "/api/placeholder/320/180",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    level: "advanced",
    views: 760,
    likes: 58,
    chapters: [
      { time: "0:00", title: "Giới thiệu Multi Analysis" },
      { time: "2:00", title: "Chọn nhiều đối tượng" },
      { time: "4:00", title: "So sánh CPK" },
      { time: "6:00", title: "Biểu đồ Radar" },
      { time: "8:00", title: "Phân tích tương quan" }
    ]
  }
];

// Extended FAQ Data with more troubleshooting
const FAQ_ITEMS: FAQItem[] = [
  // Phân tích SPC/CPK
  {
    question: "CPK là gì và tại sao nó quan trọng?",
    answer: "CPK (Process Capability Index) là chỉ số đo lường khả năng của quy trình sản xuất trong việc tạo ra sản phẩm nằm trong giới hạn kỹ thuật (USL/LSL). CPK > 1.33 cho thấy quy trình đạt yêu cầu, CPK < 1.0 cho thấy quy trình cần cải tiến ngay. CPK quan trọng vì nó giúp dự đoán tỷ lệ lỗi và đánh giá năng lực sản xuất.",
    category: "Phân tích",
    tags: ["CPK", "SPC", "Cơ bản"],
    helpful: 156,
    relatedQuestions: ["Sự khác biệt giữa Cp và Cpk là gì?", "Làm sao để cải thiện CPK?"]
  },
  {
    question: "Sự khác biệt giữa Cp và Cpk là gì?",
    answer: "Cp đo lường khả năng tiềm năng của quy trình (chỉ xét độ rộng), trong khi Cpk đo lường khả năng thực tế (xét cả độ lệch tâm). Cp = (USL - LSL) / 6σ, còn Cpk = min(Cpu, Cpl). Nếu Cp cao nhưng Cpk thấp, nghĩa là quy trình có khả năng tốt nhưng bị lệch tâm.",
    category: "Phân tích",
    tags: ["Cp", "Cpk", "Công thức"],
    helpful: 134,
    relatedQuestions: ["CPK là gì và tại sao nó quan trọng?", "Pp và Ppk khác gì Cp và Cpk?"]
  },
  {
    question: "Pp và Ppk khác gì Cp và Cpk?",
    answer: "Cp/Cpk sử dụng độ lệch chuẩn ước tính từ R-bar hoặc S-bar (within-subgroup variation), phản ánh năng lực tiềm năng của quy trình. Pp/Ppk sử dụng độ lệch chuẩn tổng thể (overall variation), phản ánh hiệu suất thực tế. Pp/Ppk thường nhỏ hơn Cp/Cpk vì bao gồm cả biến động giữa các nhóm.",
    category: "Phân tích",
    tags: ["Pp", "Ppk", "Nâng cao"],
    helpful: 89,
    relatedQuestions: ["Sự khác biệt giữa Cp và Cpk là gì?"]
  },
  {
    question: "Tại sao kết quả phân tích SPC của tôi hiển thị 'Không đủ dữ liệu'?",
    answer: "Hệ thống yêu cầu tối thiểu 25 điểm dữ liệu để tính toán SPC/CPK chính xác. Hãy kiểm tra: (1) Khoảng thời gian đã chọn có đủ dữ liệu không, (2) Mapping database đã cấu hình đúng chưa, (3) Sản phẩm và công trạm đã được thiết lập tiêu chuẩn USL/LSL chưa, (4) Kết nối database có hoạt động không.",
    category: "Lỗi",
    tags: ["Troubleshooting", "Dữ liệu"],
    helpful: 178,
    relatedQuestions: ["Làm thế nào để kết nối với database bên ngoài?"]
  },
  {
    question: "8 SPC Rules (Western Electric Rules) là gì?",
    answer: "8 SPC Rules là bộ quy tắc phát hiện biến động bất thường: Rule 1 (1 điểm ngoài 3σ), Rule 2 (9 điểm cùng phía), Rule 3 (6 điểm tăng/giảm liên tục), Rule 4 (14 điểm dao động), Rule 5 (2/3 điểm ngoài 2σ), Rule 6 (4/5 điểm ngoài 1σ), Rule 7 (15 điểm trong 1σ), Rule 8 (8 điểm ngoài 1σ cả 2 phía).",
    category: "Phân tích",
    tags: ["SPC Rules", "Western Electric", "Kiến thức"],
    helpful: 245,
    relatedQuestions: ["Làm sao để xử lý khi vi phạm SPC Rule?"]
  },
  {
    question: "Làm sao để xử lý khi vi phạm SPC Rule?",
    answer: "Khi phát hiện vi phạm: (1) Xác định loại vi phạm (Rule nào), (2) Phân tích nguyên nhân gốc (5M1E: Man, Machine, Material, Method, Measurement, Environment), (3) Thực hiện hành động khắc phục, (4) Theo dõi kết quả sau khắc phục, (5) Cập nhật tài liệu và training nếu cần.",
    category: "Phân tích",
    tags: ["SPC Rules", "Khắc phục", "5M1E"],
    helpful: 167,
    relatedQuestions: ["8 SPC Rules (Western Electric Rules) là gì?"]
  },
  {
    question: "Làm sao để cải thiện CPK?",
    answer: "Để cải thiện CPK: (1) Giảm biến động (σ) bằng cách kiểm soát chặt các yếu tố đầu vào, (2) Điều chỉnh trung bình (Mean) về gần Target, (3) Bảo trì thiết bị định kỳ, (4) Training nhân viên, (5) Cải tiến quy trình (Kaizen), (6) Sử dụng SPC để giám sát liên tục.",
    category: "Phân tích",
    tags: ["CPK", "Cải tiến", "Kaizen"],
    helpful: 198,
    relatedQuestions: ["CPK là gì và tại sao nó quan trọng?"]
  },
  // Thiết lập hệ thống
  {
    question: "Làm thế nào để kết nối với database bên ngoài?",
    answer: "Vào menu System → Database Connections → Thêm kết nối mới. Nhập connection string theo định dạng: mysql://user:password@host:port/database. Sau đó tạo Mapping để liên kết sản phẩm/công trạm với bảng dữ liệu tương ứng. Lưu ý: Đảm bảo IP server được whitelist trong database.",
    category: "Thiết lập",
    tags: ["Database", "Kết nối", "Mapping"],
    helpful: 145,
    relatedQuestions: ["Lỗi 'Connection refused' khi kết nối database?"]
  },
  {
    question: "Tại sao tôi không thể thêm sản phẩm mới?",
    answer: "Kiểm tra: (1) Bạn có quyền Admin hoặc quyền 'Quản lý sản phẩm' không, (2) Mã sản phẩm có bị trùng không, (3) Các trường bắt buộc đã điền đầy đủ chưa. Nếu vẫn lỗi, liên hệ Admin để kiểm tra phân quyền trong menu System → Phân quyền.",
    category: "Thiết lập",
    tags: ["Sản phẩm", "Phân quyền", "Troubleshooting"],
    helpful: 87,
    relatedQuestions: ["Làm sao để thêm user mới vào hệ thống?"]
  },
  {
    question: "Cách thiết lập tiêu chuẩn USL/LSL cho sản phẩm?",
    answer: "Vào menu SPC/CPK → Tiêu chuẩn Kiểm tra → Thêm mới. Chọn sản phẩm, nhập USL (giới hạn trên), LSL (giới hạn dưới), Target (giá trị mục tiêu). Lưu ý: USL phải lớn hơn LSL, Target nên nằm giữa USL và LSL. Có thể thiết lập nhiều tiêu chuẩn cho các thông số khác nhau của cùng một sản phẩm.",
    category: "Thiết lập",
    tags: ["USL", "LSL", "Tiêu chuẩn"],
    helpful: 156,
    relatedQuestions: ["CPK là gì và tại sao nó quan trọng?"]
  },
  // Kế hoạch SPC
  {
    question: "Kế hoạch SPC không tự động chạy, phải làm sao?",
    answer: "Kiểm tra: (1) Trạng thái kế hoạch là 'Active', (2) Thời gian bắt đầu đã đến chưa, (3) Mapping database đã cấu hình và test thành công, (4) Dây chuyền sản xuất đang hoạt động, (5) Server không bị restart. Nếu vẫn không chạy, kiểm tra logs trong System → Audit Logs để xem lỗi chi tiết.",
    category: "Kế hoạch",
    tags: ["SPC Plan", "Troubleshooting", "Tự động"],
    helpful: 134,
    relatedQuestions: ["Làm sao để dừng kế hoạch SPC đang chạy?"]
  },
  {
    question: "Làm sao để dừng kế hoạch SPC đang chạy?",
    answer: "Vào menu SPC/CPK → Kế hoạch SPC → Tìm kế hoạch cần dừng → Click nút 'Tạm dừng' hoặc 'Kết thúc'. Kế hoạch 'Tạm dừng' có thể kích hoạt lại, còn 'Kết thúc' sẽ không thể chạy lại. Dữ liệu đã thu thập vẫn được giữ nguyên.",
    category: "Kế hoạch",
    tags: ["SPC Plan", "Quản lý"],
    helpful: 98,
    relatedQuestions: ["Kế hoạch SPC không tự động chạy, phải làm sao?"]
  },
  {
    question: "Tần suất lấy mẫu nào là phù hợp?",
    answer: "Tần suất phụ thuộc vào: (1) Tốc độ sản xuất - sản xuất nhanh cần lấy mẫu thường xuyên hơn, (2) Độ ổn định quy trình - quy trình mới cần theo dõi chặt hơn, (3) Chi phí kiểm tra, (4) Yêu cầu khách hàng. Thông thường: 1 lần/giờ cho quy trình ổn định, 1 lần/30 phút cho quy trình mới hoặc có vấn đề.",
    category: "Kế hoạch",
    tags: ["Tần suất", "Best practice"],
    helpful: 112,
    relatedQuestions: ["Kế hoạch SPC không tự động chạy, phải làm sao?"]
  },
  // Cảnh báo & Thông báo
  {
    question: "Tôi không nhận được email cảnh báo CPK, tại sao?",
    answer: "Kiểm tra: (1) SMTP đã cấu hình và test thành công chưa (System → SMTP Settings), (2) Email của bạn đã được thêm vào danh sách nhận thông báo chưa, (3) Ngưỡng CPK đã thiết lập đúng chưa, (4) Kiểm tra thư mục Spam/Junk trong email, (5) Kiểm tra Audit Logs xem có lỗi gửi email không.",
    category: "Cảnh báo",
    tags: ["Email", "SMTP", "Troubleshooting"],
    helpful: 167,
    relatedQuestions: ["Cách cấu hình SMTP với Gmail?"]
  },
  {
    question: "Cách cấu hình SMTP với Gmail?",
    answer: "Sử dụng: Host: smtp.gmail.com, Port: 587, Security: TLS. Quan trọng: Phải tạo 'App Password' trong Google Account (không dùng mật khẩu thường). Vào Google Account → Security → 2-Step Verification → App passwords → Tạo password cho 'Mail'. Sử dụng App Password này thay cho mật khẩu Gmail.",
    category: "Cảnh báo",
    tags: ["SMTP", "Gmail", "Cấu hình"],
    helpful: 234,
    relatedQuestions: ["Tôi không nhận được email cảnh báo CPK, tại sao?"]
  },
  {
    question: "Cách cấu hình SMTP với Outlook/Office 365?",
    answer: "Sử dụng: Host: smtp.office365.com, Port: 587, Security: STARTTLS. Nhập email và mật khẩu Office 365. Nếu có MFA, cần tạo App Password. Đảm bảo tài khoản có quyền gửi email SMTP (có thể cần Admin bật trong Exchange Admin Center).",
    category: "Cảnh báo",
    tags: ["SMTP", "Outlook", "Office 365"],
    helpful: 89,
    relatedQuestions: ["Cách cấu hình SMTP với Gmail?"]
  },
  // Dashboard & Báo cáo
  {
    question: "Dashboard Realtime không cập nhật dữ liệu mới?",
    answer: "Kiểm tra: (1) Kế hoạch SPC đang Active và đang chạy, (2) Kết nối internet ổn định, (3) Thử refresh trang (F5), (4) Kiểm tra browser console có lỗi không (F12). SSE connection có thể bị ngắt sau 30 phút không hoạt động - refresh trang để kết nối lại.",
    category: "Dashboard",
    tags: ["Realtime", "SSE", "Troubleshooting"],
    helpful: 145,
    relatedQuestions: ["Trang web load chậm hoặc bị treo?"]
  },
  {
    question: "Làm sao để xuất báo cáo PDF?",
    answer: "Sau khi thực hiện phân tích SPC/CPK, click nút 'Xuất PDF' ở góc phải. Báo cáo sẽ bao gồm: thông tin sản phẩm, kết quả tính toán, biểu đồ Control Chart, và danh sách vi phạm (nếu có). Có thể tùy chọn các phần cần xuất trước khi tải.",
    category: "Báo cáo",
    tags: ["PDF", "Export", "Báo cáo"],
    helpful: 178,
    relatedQuestions: ["Làm sao để xuất báo cáo Excel?"]
  },
  {
    question: "Làm sao để xuất báo cáo Excel?",
    answer: "Click nút 'Xuất Excel' sau khi phân tích. File Excel sẽ chứa: Sheet 1 - Thông tin tổng quan, Sheet 2 - Dữ liệu thô, Sheet 3 - Kết quả tính toán, Sheet 4 - Danh sách vi phạm. Có thể sử dụng dữ liệu này để phân tích thêm trong Excel hoặc các công cụ khác.",
    category: "Báo cáo",
    tags: ["Excel", "Export", "Báo cáo"],
    helpful: 156,
    relatedQuestions: ["Làm sao để xuất báo cáo PDF?"]
  },
  // Quản lý người dùng
  {
    question: "Làm sao để thêm user mới vào hệ thống?",
    answer: "Chỉ Admin mới có quyền thêm user. Vào System → Quản lý Người dùng → Thêm người dùng. Nhập thông tin (tên, email, mật khẩu), chọn vai trò (Admin/User), gán quyền truy cập các module. User mới có thể đăng nhập ngay sau khi được tạo.",
    category: "Quản trị",
    tags: ["User", "Admin", "Phân quyền"],
    helpful: 123,
    relatedQuestions: ["Tôi quên mật khẩu, phải làm sao?"]
  },
  {
    question: "Tôi quên mật khẩu, phải làm sao?",
    answer: "Click 'Quên mật khẩu' ở trang đăng nhập, nhập email đã đăng ký. Hệ thống sẽ gửi link reset password (có hiệu lực 24 giờ). Nếu không nhận được email, kiểm tra thư mục Spam hoặc liên hệ Admin để reset thủ công.",
    category: "Quản trị",
    tags: ["Mật khẩu", "Reset", "Đăng nhập"],
    helpful: 189,
    relatedQuestions: ["Làm sao để thêm user mới vào hệ thống?"]
  },
  {
    question: "Làm sao để phân quyền chi tiết cho từng module?",
    answer: "Vào System → Phân quyền → Chọn vai trò cần cấu hình. Tick/untick các quyền cho từng module: Xem, Thêm, Sửa, Xóa. Có thể tạo vai trò mới với tổ hợp quyền riêng. Thay đổi có hiệu lực ngay sau khi lưu (user cần refresh trang).",
    category: "Quản trị",
    tags: ["Phân quyền", "Module", "Vai trò"],
    helpful: 98,
    relatedQuestions: ["Làm sao để thêm user mới vào hệ thống?"]
  },
  // Lỗi thường gặp
  {
    question: "Lỗi 'Connection refused' khi kết nối database?",
    answer: "Nguyên nhân: (1) Database server không chạy, (2) Firewall chặn port, (3) IP không được whitelist, (4) Sai thông tin kết nối. Giải pháp: Kiểm tra database server đang chạy, mở port trong firewall (thường 3306 cho MySQL), thêm IP server vào whitelist, verify lại connection string.",
    category: "Lỗi",
    tags: ["Database", "Connection", "Firewall"],
    helpful: 167,
    relatedQuestions: ["Làm thế nào để kết nối với database bên ngoài?"]
  },
  {
    question: "Trang web load chậm hoặc bị treo?",
    answer: "Thử: (1) Clear cache browser (Ctrl+Shift+Delete), (2) Tắt extensions, (3) Dùng Chrome/Edge mới nhất, (4) Kiểm tra kết nối internet. Nếu vẫn chậm, có thể do query dữ liệu lớn - thử thu hẹp khoảng thời gian phân tích hoặc giảm số lượng dây chuyền hiển thị.",
    category: "Lỗi",
    tags: ["Performance", "Browser", "Troubleshooting"],
    helpful: 134,
    relatedQuestions: ["Dashboard Realtime không cập nhật dữ liệu mới?"]
  },
  {
    question: "Biểu đồ không hiển thị hoặc bị lỗi?",
    answer: "Kiểm tra: (1) Dữ liệu có đủ điểm không (tối thiểu 25), (2) Giá trị USL/LSL đã thiết lập chưa, (3) Dữ liệu có giá trị hợp lệ không (không có null/NaN/Infinity), (4) Browser có hỗ trợ Canvas không. Thử refresh trang hoặc chọn lại khoảng thời gian.",
    category: "Lỗi",
    tags: ["Biểu đồ", "Chart", "Troubleshooting"],
    helpful: 112,
    relatedQuestions: ["Trang web load chậm hoặc bị treo?"]
  },
  {
    question: "Lỗi 'Session expired' khi đang làm việc?",
    answer: "Session mặc định hết hạn sau 8 giờ không hoạt động. Khi gặp lỗi này: (1) Đăng nhập lại, (2) Nếu xảy ra thường xuyên, kiểm tra cài đặt timeout trong System Settings, (3) Đảm bảo không mở nhiều tab cùng lúc với các tài khoản khác nhau.",
    category: "Lỗi",
    tags: ["Session", "Login", "Timeout"],
    helpful: 89,
    relatedQuestions: ["Tôi quên mật khẩu, phải làm sao?"]
  },
  {
    question: "Dữ liệu phân tích không khớp với database nguồn?",
    answer: "Kiểm tra: (1) Mapping đã cấu hình đúng cột dữ liệu chưa, (2) Timezone có khớp không (hệ thống dùng UTC), (3) Có filter nào đang áp dụng không, (4) Dữ liệu nguồn có bị thay đổi sau khi import không. Thử export dữ liệu thô để so sánh.",
    category: "Lỗi",
    tags: ["Dữ liệu", "Mapping", "Troubleshooting"],
    helpful: 78,
    relatedQuestions: ["Làm thế nào để kết nối với database bên ngoài?"]
  },
  // MMS
  {
    question: "OEE được tính như thế nào?",
    answer: "OEE = Availability × Performance × Quality. Availability = (Planned Time - Downtime) / Planned Time. Performance = (Actual Output × Ideal Cycle Time) / Operating Time. Quality = Good Units / Total Units. OEE > 85% được coi là World Class.",
    category: "MMS",
    tags: ["OEE", "Công thức", "KPI"],
    helpful: 145,
    relatedQuestions: ["Làm sao để cải thiện OEE?"]
  },
  {
    question: "Làm sao để cải thiện OEE?",
    answer: "Cải thiện từng thành phần: (1) Availability - Giảm downtime bằng bảo trì phòng ngừa, (2) Performance - Tối ưu tốc độ máy, giảm micro-stops, (3) Quality - Giảm lỗi bằng SPC, training. Sử dụng Pareto để xác định nguyên nhân chính cần cải tiến.",
    category: "MMS",
    tags: ["OEE", "Cải tiến", "TPM"],
    helpful: 123,
    relatedQuestions: ["OEE được tính như thế nào?"]
  },
  {
    question: "Cách thiết lập lịch bảo trì định kỳ?",
    answer: "Vào MMS → Maintenance Schedule → Tạo lịch mới. Chọn máy, loại bảo trì (PM/CM), tần suất (hàng ngày/tuần/tháng), người phụ trách. Hệ thống sẽ tự động tạo work order và gửi thông báo trước ngày bảo trì.",
    category: "MMS",
    tags: ["Bảo trì", "PM", "Lịch"],
    helpful: 98,
    relatedQuestions: ["Làm sao để cải thiện OEE?"]
  }
];

// Best Practices
const BEST_PRACTICES: BestPractice[] = [
  {
    title: "Thiết lập USL/LSL chính xác",
    description: "Tiêu chuẩn kiểm tra là nền tảng của phân tích SPC",
    category: "Thiết lập",
    icon: <Target className="w-5 h-5" />,
    tips: [
      "Lấy USL/LSL từ bản vẽ kỹ thuật hoặc yêu cầu khách hàng",
      "Target nên đặt ở giữa USL và LSL",
      "Review và cập nhật khi có thay đổi thiết kế",
      "Tạo tiêu chuẩn riêng cho từng thông số đo"
    ]
  },
  {
    title: "Chọn tần suất lấy mẫu phù hợp",
    description: "Cân bằng giữa chi phí và độ chính xác",
    category: "Kế hoạch",
    icon: <Clock className="w-5 h-5" />,
    tips: [
      "Quy trình mới: Lấy mẫu thường xuyên (15-30 phút/lần)",
      "Quy trình ổn định: Có thể giảm xuống 1-2 giờ/lần",
      "Sau sự cố: Tăng tần suất tạm thời để theo dõi",
      "Xem xét chi phí kiểm tra khi quyết định"
    ]
  },
  {
    title: "Phản hồi nhanh với cảnh báo",
    description: "Xử lý kịp thời để giảm thiểu tác động",
    category: "Vận hành",
    icon: <Bell className="w-5 h-5" />,
    tips: [
      "Thiết lập nhiều kênh nhận cảnh báo (email, SMS)",
      "Phân công người phụ trách rõ ràng",
      "Có quy trình xử lý chuẩn cho từng loại cảnh báo",
      "Ghi nhận và phân tích nguyên nhân gốc"
    ]
  },
  {
    title: "Bảo trì phòng ngừa",
    description: "Giảm downtime và duy trì năng lực quy trình",
    category: "MMS",
    icon: <Wrench className="w-5 h-5" />,
    tips: [
      "Lập lịch bảo trì định kỳ theo khuyến nghị nhà sản xuất",
      "Theo dõi OEE để phát hiện sớm vấn đề",
      "Duy trì tồn kho phụ tùng quan trọng",
      "Training nhân viên vận hành cơ bản"
    ]
  },
  {
    title: "Phân tích xu hướng định kỳ",
    description: "Phát hiện sớm vấn đề trước khi xảy ra lỗi",
    category: "Phân tích",
    icon: <TrendingUp className="w-5 h-5" />,
    tips: [
      "Xem báo cáo SPC hàng ngày/tuần",
      "Chú ý các pattern: trend, shift, cycle",
      "So sánh CPK giữa các ca/dây chuyền",
      "Sử dụng AI Analysis để nhận khuyến nghị"
    ]
  },
  {
    title: "Quản lý phân quyền chặt chẽ",
    description: "Bảo mật và kiểm soát truy cập",
    category: "Quản trị",
    icon: <Shield className="w-5 h-5" />,
    tips: [
      "Áp dụng nguyên tắc least privilege",
      "Review quyền định kỳ (hàng quý)",
      "Vô hiệu hóa tài khoản nhân viên nghỉ việc ngay",
      "Kiểm tra Audit Logs thường xuyên"
    ]
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
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorialLocal | null>(null);
  const [faqSearch, setFaqSearch] = useState("");
  const [faqCategory, setFaqCategory] = useState("all");
  const [expandedFaqs, setExpandedFaqs] = useState<string[]>([]);
  const [videoCategory, setVideoCategory] = useState("all");
  const [videoLevel, setVideoLevel] = useState("all");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch videos from database
  const { data: dbVideos, isLoading: isLoadingVideos } = trpc.videoTutorial.list.useQuery({ activeOnly: true });
  const incrementViewMutation = trpc.videoTutorial.incrementViewCount.useMutation();

  // Convert database videos to local format
  const videosFromDB: VideoTutorialLocal[] = useMemo(() => {
    if (!dbVideos || dbVideos.length === 0) return [];
    return dbVideos.map(v => ({
      id: String(v.id),
      title: v.title,
      description: v.description || "",
      duration: v.duration || "0:00",
      category: v.category,
      thumbnail: v.thumbnailUrl || "/api/placeholder/320/180",
      videoUrl: `https://www.youtube.com/embed/${v.youtubeId}`,
      level: v.level as "beginner" | "intermediate" | "advanced",
      views: v.viewCount,
      likes: 0,
      chapters: []
    }));
  }, [dbVideos]);

  // Use database videos if available, otherwise fallback to static VIDEO_TUTORIALS
  const allVideos = videosFromDB.length > 0 ? videosFromDB : VIDEO_TUTORIALS;

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

  const openVideoDialog = (video: VideoTutorialLocal) => {
    setSelectedVideo(video);
    setVideoDialogOpen(true);
    // Increment view count if it's a database video
    if (dbVideos && dbVideos.length > 0) {
      const videoId = parseInt(video.id);
      if (!isNaN(videoId)) {
        incrementViewMutation.mutate({ id: videoId });
      }
    }
  };

  const filteredFaqs = FAQ_ITEMS.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
                          faq.answer.toLowerCase().includes(faqSearch.toLowerCase()) ||
                          (faq.tags?.some(tag => tag.toLowerCase().includes(faqSearch.toLowerCase())));
    const matchesCategory = faqCategory === "all" || faq.category === faqCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredVideos = allVideos.filter(video => {
    const matchesCategory = videoCategory === "all" || video.category === videoCategory;
    const matchesLevel = videoLevel === "all" || video.level === videoLevel;
    return matchesCategory && matchesLevel;
  });

  const faqCategories = ["all", ...Array.from(new Set(FAQ_ITEMS.map(f => f.category)))];
  const videoCategories = Array.from(new Set(allVideos.map(v => v.category)));

  // Professional PDF Export function using jsPDF
  const handleExportPDF = useCallback(async () => {
    setIsExportingPdf(true);
    setExportProgress(0);
    
    toast({
      title: "Đang tạo PDF...",
      description: "Vui lòng đợi trong giây lát",
    });

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      // Helper function to add new page if needed
      const checkNewPage = (requiredHeight: number) => {
        if (yPos + requiredHeight > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      // Helper function to add section header
      const addSectionHeader = (title: string, color: [number, number, number] = [26, 54, 93]) => {
        checkNewPage(15);
        doc.setFillColor(...color);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 10, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(title, margin + 5, yPos + 7);
        doc.setTextColor(0, 0, 0);
        yPos += 15;
      };

      // Title Page
      setExportProgress(10);
      doc.setFillColor(26, 54, 93);
      doc.rect(0, 0, pageWidth, 60, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("HUONG DAN SU DUNG", pageWidth / 2, 30, { align: "center" });
      doc.setFontSize(18);
      doc.text("He thong SPC/CPK Calculator", pageWidth / 2, 45, { align: "center" });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      yPos = 80;
      doc.text("Phien ban: 2.0", margin, yPos);
      yPos += 8;
      doc.text("Cap nhat: Thang 12/2024", margin, yPos);
      yPos += 8;
      doc.text("Tai lieu huong dan su dung day du cho he thong", margin, yPos);
      
      // Table of Contents
      doc.addPage();
      yPos = margin;
      setExportProgress(20);
      
      addSectionHeader("MUC LUC");
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      
      const tocItems = [
        "1. Tong quan He thong",
        "2. Quy trinh Lam viec",
        "3. Huong dan Chi tiet",
        "4. Bang Tham khao SPC/CPK",
        "5. 8 SPC Rules",
        "6. Best Practices",
        "7. Cau hoi Thuong gap (FAQ)"
      ];
      
      tocItems.forEach((item, index) => {
        doc.text(item, margin + 5, yPos);
        doc.text(`Trang ${index + 3}`, pageWidth - margin - 20, yPos);
        yPos += 8;
      });

      // Section 1: System Overview
      doc.addPage();
      yPos = margin;
      setExportProgress(30);
      
      addSectionHeader("1. TONG QUAN HE THONG");
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const overviewText = SYSTEM_OVERVIEW.description.replace(/\n/g, " ").trim();
      const splitOverview = doc.splitTextToSize(overviewText, pageWidth - 2 * margin);
      doc.text(splitOverview, margin, yPos);
      yPos += splitOverview.length * 5 + 10;

      // Modules table
      checkNewPage(60);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Cac Module chinh:", margin, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [["Module", "Mo ta", "Tinh nang chinh"]],
        body: SYSTEM_OVERVIEW.modules.map(m => [
          m.name,
          m.description,
          m.features.slice(0, 2).join(", ")
        ]),
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [26, 54, 93] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Section 2: Workflow
      doc.addPage();
      yPos = margin;
      setExportProgress(40);
      
      addSectionHeader("2. QUY TRINH LAM VIEC");
      
      WORKFLOW_STEPS.forEach((step, index) => {
        checkNewPage(20);
        doc.setFillColor(49, 130, 206);
        doc.circle(margin + 5, yPos + 3, 4, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(String(step.step), margin + 3.5, yPos + 5);
        doc.setTextColor(0, 0, 0);
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(step.title, margin + 15, yPos + 5);
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(step.description, margin + 15, yPos + 12);
        
        yPos += 20;
      });

      // Section 3: Detailed Guide
      doc.addPage();
      yPos = margin;
      setExportProgress(50);
      
      addSectionHeader("3. HUONG DAN CHI TIET");
      
      GUIDE_SECTIONS.forEach((section, sectionIndex) => {
        checkNewPage(30);
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(44, 82, 130);
        doc.text(`3.${sectionIndex + 1}. ${section.title}`, margin, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 6;
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.text(section.description, margin, yPos);
        yPos += 8;
        
        section.steps.forEach((step, stepIndex) => {
          checkNewPage(25);
          
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(`${stepIndex + 1}. ${step.title}`, margin + 5, yPos);
          yPos += 5;
          
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.text(step.description, margin + 5, yPos);
          yPos += 5;
          
          if (step.path) {
            doc.setFont("helvetica", "italic");
            doc.text(`Duong dan: ${step.path}`, margin + 5, yPos);
            yPos += 5;
          }
          
          if (step.substeps) {
            step.substeps.forEach(substep => {
              checkNewPage(6);
              doc.setFont("helvetica", "normal");
              doc.text(`  • ${substep}`, margin + 10, yPos);
              yPos += 5;
            });
          }
          yPos += 3;
        });
        
        if (section.tips && section.tips.length > 0) {
          checkNewPage(20);
          doc.setFillColor(255, 251, 235);
          doc.rect(margin, yPos, pageWidth - 2 * margin, section.tips.length * 6 + 8, "F");
          doc.setDrawColor(246, 173, 85);
          doc.rect(margin, yPos, pageWidth - 2 * margin, section.tips.length * 6 + 8, "S");
          
          yPos += 5;
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text("Meo huu ich:", margin + 3, yPos);
          yPos += 5;
          
          doc.setFont("helvetica", "normal");
          section.tips.forEach(tip => {
            doc.text(`• ${tip}`, margin + 5, yPos);
            yPos += 5;
          });
          yPos += 5;
        }
        
        yPos += 10;
      });

      // Section 4: SPC/CPK Reference Table
      doc.addPage();
      yPos = margin;
      setExportProgress(60);
      
      addSectionHeader("4. BANG THAM KHAO - CAC CHI SO SPC/CPK");
      
      autoTable(doc, {
        startY: yPos,
        head: [["Chi so", "Mo ta", "Cong thuc", "Nguong tot"]],
        body: [
          ["Cp", "Process Capability", "(USL - LSL) / (6σ)", ">= 1.33"],
          ["Cpk", "Process Capability Index", "min(Cpu, Cpl)", ">= 1.33"],
          ["Pp", "Process Performance", "(USL - LSL) / (6s)", ">= 1.33"],
          ["Ppk", "Process Performance Index", "min(Ppu, Ppl)", ">= 1.33"],
          ["σ (Sigma)", "Do lech chuan", "√(Σ(xi-x̄)²/n)", "Cang nho cang tot"],
          ["OEE", "Overall Equipment Effectiveness", "A × P × Q", ">= 85%"]
        ],
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [26, 54, 93] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Section 5: 8 SPC Rules
      checkNewPage(80);
      setExportProgress(70);
      
      addSectionHeader("5. 8 SPC RULES (WESTERN ELECTRIC RULES)");
      
      autoTable(doc, {
        startY: yPos,
        head: [["Rule", "Mo ta", "Muc do"]],
        body: [
          ["Rule 1", "1 diem nam ngoai 3σ", "Critical"],
          ["Rule 2", "9 diem lien tiep cung phia duong trung tam", "Warning"],
          ["Rule 3", "6 diem lien tiep tang hoac giam", "Warning"],
          ["Rule 4", "14 diem lien tiep dao dong len xuong", "Warning"],
          ["Rule 5", "2/3 diem nam ngoai 2σ cung phia", "Warning"],
          ["Rule 6", "4/5 diem nam ngoai 1σ cung phia", "Warning"],
          ["Rule 7", "15 diem lien tiep trong 1σ", "Info"],
          ["Rule 8", "8 diem lien tiep ngoai 1σ (ca 2 phia)", "Warning"]
        ],
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [26, 54, 93] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Section 6: Best Practices
      doc.addPage();
      yPos = margin;
      setExportProgress(80);
      
      addSectionHeader("6. BEST PRACTICES");
      
      BEST_PRACTICES.forEach((practice, index) => {
        checkNewPage(35);
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(44, 82, 130);
        doc.text(`${index + 1}. ${practice.title}`, margin, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 6;
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.text(practice.description, margin, yPos);
        yPos += 6;
        
        doc.setFont("helvetica", "normal");
        practice.tips.forEach(tip => {
          checkNewPage(6);
          doc.text(`  • ${tip}`, margin + 5, yPos);
          yPos += 5;
        });
        yPos += 8;
      });

      // Section 7: FAQ
      doc.addPage();
      yPos = margin;
      setExportProgress(90);
      
      addSectionHeader("7. CAU HOI THUONG GAP (FAQ)");
      
      const topFaqs = FAQ_ITEMS.slice(0, 15);
      topFaqs.forEach((faq, index) => {
        checkNewPage(30);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(44, 82, 130);
        const question = `Q${index + 1}: ${faq.question}`;
        const splitQuestion = doc.splitTextToSize(question, pageWidth - 2 * margin);
        doc.text(splitQuestion, margin, yPos);
        yPos += splitQuestion.length * 5 + 2;
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const splitAnswer = doc.splitTextToSize(faq.answer, pageWidth - 2 * margin - 5);
        doc.text(splitAnswer, margin + 5, yPos);
        yPos += splitAnswer.length * 4 + 8;
      });

      // Footer on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `© 2024 SPC/CPK Calculator System - Trang ${i}/${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      setExportProgress(100);
      
      // Save the PDF
      doc.save("SPC_CPK_User_Guide.pdf");

      toast({
        title: "Xuất PDF thành công!",
        description: "File hướng dẫn đã được tải về máy tính của bạn.",
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Lỗi xuất PDF",
        description: "Không thể tạo file PDF. Vui lòng thử lại.",
        variant: "destructive"
      });
    } finally {
      setIsExportingPdf(false);
      setExportProgress(0);
    }
  }, [toast]);

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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportPDF}
              disabled={isExportingPdf}
            >
              {isExportingPdf ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-2" />
                  Tải PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Export Progress */}
        {isExportingPdf && (
          <Card className="border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Đang tạo PDF...</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <Progress value={exportProgress} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
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
            <TabsTrigger value="tips" className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Best Practices
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
                                const video = allVideos.find(v => v.id === section.videoId);
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
                    { rule: "Rule 8", desc: "8 điểm liên tiếp ngoài 1σ (cả 2 phía)", severity: "warning" }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50">
                      <Badge 
                        variant={item.severity === "critical" ? "destructive" : item.severity === "warning" ? "default" : "secondary"}
                        className="shrink-0"
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
                  {allVideos.length} video hướng dẫn chi tiết cho từng chức năng
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Lọc theo:</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge 
                      variant={videoCategory === "all" ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => setVideoCategory("all")}
                    >
                      Tất cả ({allVideos.length})
                    </Badge>
                    {videoCategories.map(cat => (
                      <Badge 
                        key={cat}
                        variant={videoCategory === cat ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => setVideoCategory(cat)}
                      >
                        {cat} ({allVideos.filter(v => v.category === cat).length})
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Level Filter */}
                <div className="flex gap-2 mb-6">
                  <Button 
                    variant={videoLevel === "all" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setVideoLevel("all")}
                  >
                    Tất cả cấp độ
                  </Button>
                  <Button 
                    variant={videoLevel === "beginner" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setVideoLevel("beginner")}
                    className="gap-1"
                  >
                    <GraduationCap className="w-4 h-4" />
                    Cơ bản
                  </Button>
                  <Button 
                    variant={videoLevel === "intermediate" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setVideoLevel("intermediate")}
                    className="gap-1"
                  >
                    <Award className="w-4 h-4" />
                    Trung cấp
                  </Button>
                  <Button 
                    variant={videoLevel === "advanced" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setVideoLevel("advanced")}
                    className="gap-1"
                  >
                    <Star className="w-4 h-4" />
                    Nâng cao
                  </Button>
                </div>

                {/* Video Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVideos.map((video) => (
                    <Card 
                      key={video.id} 
                      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                      onClick={() => openVideoDialog(video)}
                    >
                      <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-primary/5">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                            <Play className="w-8 h-8 text-primary ml-1" />
                          </div>
                        </div>
                        <div className="absolute bottom-2 right-2">
                          <Badge variant="secondary" className="text-xs bg-black/70 text-white">
                            {video.duration}
                          </Badge>
                        </div>
                        <div className="absolute top-2 left-2 flex gap-1">
                          <Badge className="text-xs">
                            {video.category}
                          </Badge>
                          <Badge 
                            variant={video.level === "beginner" ? "secondary" : video.level === "intermediate" ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {video.level === "beginner" ? "Cơ bản" : video.level === "intermediate" ? "Trung cấp" : "Nâng cao"}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                          {video.title}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {video.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {video.views && (
                            <span className="flex items-center gap-1">
                              <PlayCircle className="w-3 h-3" />
                              {video.views.toLocaleString()} lượt xem
                            </span>
                          )}
                          {video.likes && (
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="w-3 h-3" />
                              {video.likes}
                            </span>
                          )}
                        </div>
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
                  <Rocket className="w-5 h-5 text-primary" />
                  Video Khởi đầu Nhanh
                </CardTitle>
                <CardDescription>
                  3 video quan trọng nhất để bắt đầu sử dụng hệ thống
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {allVideos.filter(v => v.level === "beginner").slice(0, 3).map((video, index) => (
                    <div 
                      key={video.id}
                      className="flex items-center gap-3 p-4 rounded-lg border bg-card cursor-pointer hover:bg-muted/50 hover:shadow-md transition-all"
                      onClick={() => openVideoDialog(video)}
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{video.title}</h4>
                        <p className="text-xs text-muted-foreground">{video.duration}</p>
                      </div>
                      <Play className="w-5 h-5 text-primary" />
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
                  {FAQ_ITEMS.length} câu hỏi và câu trả lời cho các vấn đề phổ biến
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search and Filter */}
                <div className="flex flex
-col md:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm câu hỏi, từ khóa..."
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

                {/* FAQ Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-3 rounded-lg border bg-muted/30 text-center">
                    <div className="text-2xl font-bold text-primary">{FAQ_ITEMS.length}</div>
                    <div className="text-xs text-muted-foreground">Tổng câu hỏi</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30 text-center">
                    <div className="text-2xl font-bold text-green-500">{FAQ_ITEMS.filter(f => f.category === "Phân tích").length}</div>
                    <div className="text-xs text-muted-foreground">Phân tích</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30 text-center">
                    <div className="text-2xl font-bold text-orange-500">{FAQ_ITEMS.filter(f => f.category === "Lỗi").length}</div>
                    <div className="text-xs text-muted-foreground">Troubleshooting</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30 text-center">
                    <div className="text-2xl font-bold text-blue-500">{FAQ_ITEMS.filter(f => f.category === "Thiết lập").length}</div>
                    <div className="text-xs text-muted-foreground">Thiết lập</div>
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
                          className="border rounded-lg overflow-hidden hover:shadow-sm transition-shadow"
                        >
                          <button
                            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                            onClick={() => toggleFaq(faq.question)}
                          >
                            <div className="flex items-start gap-3 flex-1">
                              <div className="flex flex-col gap-1">
                                <Badge variant="outline" className="shrink-0 w-fit">
                                  {faq.category}
                                </Badge>
                                {faq.helpful && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <ThumbsUp className="w-3 h-3" />
                                    {faq.helpful}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1">
                                <span className="font-medium text-sm">{faq.question}</span>
                                {faq.tags && (
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    {faq.tags.map((tag, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                            )}
                          </button>
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-0">
                              <div className="pl-[80px] text-sm text-muted-foreground leading-relaxed">
                                {faq.answer}
                              </div>
                              {faq.relatedQuestions && faq.relatedQuestions.length > 0 && (
                                <div className="pl-[80px] mt-4 pt-3 border-t">
                                  <p className="text-xs font-medium text-muted-foreground mb-2">Câu hỏi liên quan:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {faq.relatedQuestions.map((rq, i) => (
                                      <Button
                                        key={i}
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs h-auto py-1 px-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setFaqSearch(rq);
                                        }}
                                      >
                                        <ArrowRight className="w-3 h-3 mr-1" />
                                        {rq}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}
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
                          <HelpingHand className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">Không tìm thấy câu trả lời?</h4>
                          <p className="text-xs text-muted-foreground">
                            Liên hệ đội ngũ hỗ trợ để được giúp đỡ
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Chat hỗ trợ
                        </Button>
                        <Button variant="outline" size="sm">
                          <Mail className="w-4 h-4 mr-2" />
                          Gửi email
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            {/* Common Issues */}
            <Card className="border-orange-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="w-5 h-5 text-orange-500" />
                  Các Lỗi Thường Gặp & Cách Khắc Phục
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      error: "Connection refused",
                      solution: "Kiểm tra database server, firewall, whitelist IP",
                      icon: <Database className="w-4 h-4" />
                    },
                    {
                      error: "Không đủ dữ liệu",
                      solution: "Cần tối thiểu 25 điểm dữ liệu để phân tích",
                      icon: <BarChart3 className="w-4 h-4" />
                    },
                    {
                      error: "Email không gửi được",
                      solution: "Kiểm tra SMTP settings, App Password",
                      icon: <Mail className="w-4 h-4" />
                    },
                    {
                      error: "Dashboard không cập nhật",
                      solution: "Refresh trang, kiểm tra kế hoạch SPC Active",
                      icon: <Monitor className="w-4 h-4" />
                    },
                    {
                      error: "Session expired",
                      solution: "Đăng nhập lại, kiểm tra timeout settings",
                      icon: <Clock className="w-4 h-4" />
                    },
                    {
                      error: "Biểu đồ không hiển thị",
                      solution: "Kiểm tra dữ liệu hợp lệ, USL/LSL đã thiết lập",
                      icon: <LineChart className="w-4 h-4" />
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
                        {item.icon}
                      </div>
                      <div>
                        <p className="font-medium text-sm flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-500" />
                          {item.error}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          {item.solution}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Best Practices Tab */}
          <TabsContent value="tips" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Best Practices - Thực hành Tốt nhất
                </CardTitle>
                <CardDescription>
                  Các khuyến nghị và mẹo để sử dụng hệ thống hiệu quả nhất
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {BEST_PRACTICES.map((practice, index) => (
                    <Card key={index} className="border-l-4 border-l-primary">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            {practice.icon}
                          </div>
                          {practice.title}
                        </CardTitle>
                        <CardDescription>{practice.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {practice.tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card className="border-yellow-500/20 bg-yellow-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Mẹo Nhanh
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { tip: "Sử dụng Ctrl+K để tìm kiếm nhanh", icon: <Search className="w-4 h-4" /> },
                    { tip: "Bookmark Dashboard để truy cập nhanh", icon: <BookMarked className="w-4 h-4" /> },
                    { tip: "Thiết lập nhiều kênh nhận cảnh báo", icon: <Bell className="w-4 h-4" /> },
                    { tip: "Review Audit Logs định kỳ", icon: <FileText className="w-4 h-4" /> },
                    { tip: "Test mapping trước khi kích hoạt SPC Plan", icon: <Database className="w-4 h-4" /> },
                    { tip: "Xuất báo cáo PDF để lưu trữ", icon: <Download className="w-4 h-4" /> }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                      <div className="p-2 rounded-full bg-yellow-500/10 text-yellow-500">
                        {item.icon}
                      </div>
                      <span className="text-sm">{item.tip}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Keyboard Shortcuts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-primary" />
                  Phím Tắt Hữu ích
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { keys: "Ctrl + K", action: "Mở Quick Search" },
                    { keys: "Ctrl + S", action: "Lưu thay đổi" },
                    { keys: "Ctrl + P", action: "In trang hiện tại" },
                    { keys: "F5", action: "Refresh dữ liệu" },
                    { keys: "Esc", action: "Đóng dialog/modal" },
                    { keys: "Tab", action: "Di chuyển giữa các field" }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <span className="text-sm">{item.action}</span>
                      <Badge variant="secondary" className="font-mono">
                        {item.keys}
                      </Badge>
                    </div>
                  ))}
                </div>
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
                <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isExportingPdf}>
                  <FileText className="w-4 h-4 mr-2" />
                  Tải PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Video Dialog with Real Player */}
        <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                {selectedVideo?.title}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-4">
                <span>{selectedVideo?.description}</span>
                {selectedVideo?.level && (
                  <Badge 
                    variant={selectedVideo.level === "beginner" ? "secondary" : selectedVideo.level === "intermediate" ? "default" : "destructive"}
                  >
                    {selectedVideo.level === "beginner" ? "Cơ bản" : selectedVideo.level === "intermediate" ? "Trung cấp" : "Nâng cao"}
                  </Badge>
                )}
              </DialogDescription>
            </DialogHeader>
            
            {/* Video Player */}
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              {selectedVideo && (
                <iframe
                  src={selectedVideo.videoUrl}
                  title={selectedVideo.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>

            {/* Video Info */}
            {selectedVideo && (
              <div className="space-y-4">
                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {selectedVideo.duration}
                  </span>
                  {selectedVideo.views && (
                    <span className="flex items-center gap-1">
                      <PlayCircle className="w-4 h-4" />
                      {selectedVideo.views.toLocaleString()} lượt xem
                    </span>
                  )}
                  {selectedVideo.likes && (
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4" />
                      {selectedVideo.likes} thích
                    </span>
                  )}
                  <Badge variant="outline">{selectedVideo.category}</Badge>
                </div>

                {/* Chapters */}
                {selectedVideo.chapters && selectedVideo.chapters.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <List className="w-4 h-4" />
                      Nội dung video
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {selectedVideo.chapters.map((chapter, index) => (
                        <div 
                          key={index}
                          className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer text-sm"
                        >
                          <Badge variant="secondary" className="font-mono text-xs">
                            {chapter.time}
                          </Badge>
                          <span className="truncate">{chapter.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm">
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    Hữu ích
                  </Button>
                  <Button variant="outline" size="sm">
                    <ThumbsDown className="w-4 h-4 mr-2" />
                    Cần cải thiện
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(selectedVideo.videoUrl.replace("/embed/", "/watch?v="), "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Mở YouTube
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
