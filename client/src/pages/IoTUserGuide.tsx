import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  ChevronRight,
  Cpu,
  Database,
  Factory,
  FileText,
  Gauge,
  HelpCircle,
  LayoutDashboard,
  LineChart,
  Link2,
  Monitor,
  Network,
  Play,
  Radio,
  Search,
  Server,
  Settings,
  Shield,
  Smartphone,
  Target,
  Timer,
  Video,
  Wrench,
  Zap,
  MessageCircleQuestion,
  ExternalLink,
} from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  purpose: string;
  benefits: string[];
  features: string[];
  howToUse: string[];
  tips: string[];
  relatedPages: string[];
}

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  youtubeId: string;
  thumbnail?: string;
  relatedFeatures: string[];
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

// Video Tutorials Data
const videoTutorials: VideoTutorial[] = [
  // Tổng quan
  {
    id: 'video-1',
    title: 'Giới thiệu Hệ thống IoT',
    description: 'Tổng quan về hệ thống IoT trong nhà máy, các thành phần chính và cách thức hoạt động.',
    duration: '8:45',
    category: 'overview',
    youtubeId: 'wEtH6tT9HA4', // Getting Started with Industry 4.0
    relatedFeatures: ['IoT Dashboard', 'Device Management'],
  },
  {
    id: 'video-2',
    title: 'Hướng dẫn sử dụng IoT Dashboard',
    description: 'Cách sử dụng bảng điều khiển IoT để theo dõi trạng thái thiết bị và cảnh báo.',
    duration: '12:30',
    category: 'overview',
    youtubeId: 'fnMpWVN7Tz0', // What is Smart Manufacturing - Industry 4.0
    relatedFeatures: ['IoT Dashboard', 'Alarm Management'],
  },
  {
    id: 'video-3',
    title: 'Quản lý thiết bị IoT từ A-Z',
    description: 'Hướng dẫn chi tiết cách thêm, sửa, xóa và cấu hình thiết bị IoT trong hệ thống.',
    duration: '15:20',
    category: 'overview',
    youtubeId: 'g3vpGMWokJ8', // What Are Industrial Sensors? The Basics Explained
    relatedFeatures: ['Device Management', 'IoT Gateway Config'],
  },
  // Kết nối
  {
    id: 'video-4',
    title: 'Cấu hình kết nối MQTT',
    description: 'Hướng dẫn cấu hình MQTT Broker để thu thập dữ liệu từ thiết bị IoT.',
    duration: '10:15',
    category: 'connections',
    youtubeId: 'kIZkMBexqjE', // How MQTT Works: A Deep Dive Into MQTT Protocol
    relatedFeatures: ['MQTT Connections', 'IoT Gateway Config'],
  },
  {
    id: 'video-5',
    title: 'Kết nối OPC-UA Server',
    description: 'Cách thiết lập kết nối OPC-UA để giao tiếp với thiết bị công nghiệp.',
    duration: '14:00',
    category: 'connections',
    youtubeId: 't688GD6jNzE', // What is OPC UA? Industrial IoT Communication explained
    relatedFeatures: ['OPC-UA Connections', 'IoT Realtime Dashboard'],
  },
  {
    id: 'video-6',
    title: 'Cấu hình IoT Gateway',
    description: 'Hướng dẫn thiết lập và quản lý IoT Gateway trong hệ thống.',
    duration: '11:45',
    category: 'connections',
    youtubeId: 'GVVnKYBponQ', // Industrial Connectivity - Short Introduction in MQTT
    relatedFeatures: ['IoT Gateway Config', 'Device Management'],
  },
  // Cảnh báo & Thông báo
  {
    id: 'video-7',
    title: 'Quản lý cảnh báo IoT',
    description: 'Cách xem, xác nhận và xử lý các cảnh báo từ thiết bị IoT.',
    duration: '9:30',
    category: 'alerts',
    youtubeId: 'Pql_4KFF44Q', // What is SCADA? SCADA tutorial for beginners
    relatedFeatures: ['Alarm Management', 'Alarm Threshold Config'],
  },
  {
    id: 'video-8',
    title: 'Cấu hình ngưỡng cảnh báo',
    description: 'Hướng dẫn thiết lập ngưỡng cảnh báo cho các thông số đo lường.',
    duration: '8:00',
    category: 'alerts',
    youtubeId: 'Kw_ZMiMNi04', // Introduction to Statistical Process Control Charts
    relatedFeatures: ['Alarm Threshold Config', 'Alarm Management'],
  },
  {
    id: 'video-9',
    title: 'Thiết lập thông báo Telegram',
    description: 'Cách cấu hình gửi thông báo cảnh báo qua Telegram Bot.',
    duration: '7:15',
    category: 'alerts',
    youtubeId: 'n6fCVm0yAC4', // Industrial IoT Sensors: Transforming Real-Time Equipment
    relatedFeatures: ['Telegram Settings', 'Notification Preferences'],
  },
  {
    id: 'video-10',
    title: 'Cấu hình thông báo SMS',
    description: 'Hướng dẫn thiết lập gửi SMS thông báo qua Twilio.',
    duration: '6:45',
    category: 'alerts',
    youtubeId: 'xuIeRk13-08', // Understanding Predictive Maintenance
    relatedFeatures: ['SMS Notification Settings', 'Notification Preferences'],
  },
  {
    id: 'video-11',
    title: 'Escalation và Auto-resolve',
    description: 'Cách thiết lập quy trình escalation và tự động resolve cảnh báo.',
    duration: '10:00',
    category: 'alerts',
    youtubeId: 'n6Fdfn2rGK4', // Predictive Maintenance: Optimize Your Operations
    relatedFeatures: ['Escalation Dashboard', 'Auto-resolve Settings'],
  },
  // Giám sát Realtime
  {
    id: 'video-12',
    title: 'Giám sát dữ liệu Realtime',
    description: 'Cách sử dụng dashboard realtime để theo dõi dữ liệu từ thiết bị IoT.',
    duration: '13:00',
    category: 'monitoring',
    youtubeId: '3c8VevhxfH4', // PLC SCADA Full Course - InTouch
    relatedFeatures: ['IoT Realtime Dashboard', 'Sensor Dashboard'],
  },
  {
    id: 'video-13',
    title: 'Sử dụng Sensor Dashboard',
    description: 'Hướng dẫn sử dụng dashboard sensor để giám sát tất cả cảm biến.',
    duration: '9:00',
    category: 'monitoring',
    youtubeId: '9QBSwJwzC54', // Core Sensors in Industrial Automation
    relatedFeatures: ['Sensor Dashboard', 'IoT Dashboard'],
  },
  {
    id: 'video-14',
    title: 'Giám sát độ trễ kết nối',
    description: 'Cách theo dõi và phân tích độ trễ trong hệ thống IoT.',
    duration: '7:30',
    category: 'monitoring',
    youtubeId: 'gpxvy2M-GvA', // Complete Guide to Manufacturing Automation Architecture
    relatedFeatures: ['Latency Monitoring', 'IoT Gateway Config'],
  },
  // Sơ đồ nhà máy
  {
    id: 'video-15',
    title: 'Sử dụng Factory Floor Plan',
    description: 'Cách xem và tương tác với sơ đồ mặt bằng nhà máy IoT.',
    duration: '8:30',
    category: 'floorplan',
    youtubeId: '4z7pTGJ9Ae8', // An illustrated guide to Smart Manufacturing - Industry 4.0
    relatedFeatures: ['Factory Floor Plan', 'Device Management'],
  },
  {
    id: 'video-16',
    title: 'Thiết kế Layout với Layout Designer',
    description: 'Hướng dẫn sử dụng công cụ thiết kế layout sơ đồ nhà máy.',
    duration: '15:00',
    category: 'floorplan',
    youtubeId: 'if84SAo1jww', // Industry 4.0 Training with Smart Factory (Amatrol)
    relatedFeatures: ['Layout Designer', 'Factory Floor Plan'],
  },
  {
    id: 'video-17',
    title: 'Sơ đồ nhà máy 3D',
    description: 'Cách sử dụng và tương tác với sơ đồ nhà máy 3D.',
    duration: '12:00',
    category: 'floorplan',
    youtubeId: '8SIguP643cM', // What is a Digital Factory
    relatedFeatures: ['3D Factory Floor Plan', '3D Model Management'],
  },
  {
    id: 'video-18',
    title: 'Quản lý Model 3D',
    description: 'Hướng dẫn upload và quản lý các model 3D cho thiết bị.',
    duration: '10:30',
    category: 'floorplan',
    youtubeId: 'tDURkVEylj8', // Smart Factory Automation is Revolutionizing Manufacturing
    relatedFeatures: ['3D Model Management', '3D Factory Floor Plan'],
  },
  // Bảo trì
  {
    id: 'video-19',
    title: 'Quản lý phiếu công việc IoT',
    description: 'Cách tạo và theo dõi phiếu công việc bảo trì thiết bị IoT.',
    duration: '11:00',
    category: 'maintenance',
    youtubeId: 'ZvGe4qFQdSU', // What is MES (Manufacturing Execution System)?
    relatedFeatures: ['IoT Work Orders', 'Device Management'],
  },
  {
    id: 'video-20',
    title: 'Báo cáo MTTR/MTBF',
    description: 'Cách xem và phân tích báo cáo MTTR/MTBF cho thiết bị.',
    duration: '9:45',
    category: 'maintenance',
    youtubeId: 'F9ETypl9aKg', // OEE (Overall Equipment Effectiveness) – What is it and...
    relatedFeatures: ['MTTR/MTBF Report', 'IoT Work Orders'],
  },
  {
    id: 'video-21',
    title: 'Cập nhật firmware OTA',
    description: 'Hướng dẫn lập lịch và thực hiện cập nhật firmware từ xa.',
    duration: '13:30',
    category: 'maintenance',
    youtubeId: 'STXYjQrH-eA', // OEE – Overall Equipment Effectiveness: What It Is and How...
    relatedFeatures: ['IoT Scheduled OTA', 'Device Management'],
  },
  // Nâng cao
  {
    id: 'video-22',
    title: 'Unified IoT Dashboard',
    description: 'Cách sử dụng và tùy chỉnh Unified Dashboard với widgets.',
    duration: '14:00',
    category: 'advanced',
    youtubeId: 'omsDVexPYUU', // What is SPC Statistical Process Control?
    relatedFeatures: ['Unified IoT Dashboard', 'IoT Dashboard'],
  },
  {
    id: 'video-23',
    title: 'Phân tích Pareto sự cố',
    description: 'Cách sử dụng biểu đồ Pareto để phân tích sự cố thiết bị.',
    duration: '8:15',
    category: 'advanced',
    youtubeId: 'H6St9mCKWuA', // PROCESS CAPABILITY: Explaining Cp, Cpk, Pp, Ppk
    relatedFeatures: ['Factory Floor Plan', 'Alarm Management'],
  },
  {
    id: 'video-24',
    title: 'Tích hợp IoT với SPC',
    description: 'Cách kết hợp dữ liệu IoT với phân tích SPC/CPK.',
    duration: '16:00',
    category: 'advanced',
    youtubeId: 'mp_weUOJsQc', // Complete STATISTICAL PROCESS CONTROL (SPC) Training
    relatedFeatures: ['IoT Realtime Dashboard', 'SPC Analysis'],
  },
];

// FAQ Data
const faqItems: FAQItem[] = [
  // Tổng quan
  {
    id: 'faq-1',
    question: 'Hệ thống IoT là gì và hoạt động như thế nào?',
    answer: 'Hệ thống IoT (Internet of Things) trong nhà máy là mạng lưới các thiết bị, cảm biến được kết nối internet để thu thập, truyền tải và phân tích dữ liệu sản xuất theo thời gian thực. Hệ thống hoạt động bằng cách: (1) Các sensor/thiết bị thu thập dữ liệu, (2) Dữ liệu được truyền qua gateway đến server, (3) Server xử lý và hiển thị trên dashboard, (4) Hệ thống tự động phát hiện bất thường và gửi cảnh báo.',
    category: 'overview',
    tags: ['IoT', 'tổng quan', 'cơ bản'],
  },
  {
    id: 'faq-2',
    question: 'Làm thế nào để thêm thiết bị IoT mới vào hệ thống?',
    answer: 'Để thêm thiết bị mới: (1) Vào menu IoT → Device Management, (2) Click nút "Thêm thiết bị", (3) Điền thông tin: Tên thiết bị, Loại thiết bị, Giao thức (MQTT/OPC-UA/Modbus), IP/Port, (4) Cấu hình các thông số kết nối, (5) Click Lưu. Thiết bị sẽ tự động kết nối và hiển thị trên dashboard.',
    category: 'overview',
    tags: ['thiết bị', 'thêm mới', 'cấu hình'],
  },
  {
    id: 'faq-3',
    question: 'Các loại thiết bị IoT nào được hỗ trợ?',
    answer: 'Hệ thống hỗ trợ nhiều loại thiết bị: (1) Sensor - cảm biến nhiệt độ, độ ẩm, áp suất, rung động..., (2) PLC - các bộ điều khiển lập trình, (3) Gateway - thiết bị trung gian kết nối, (4) Actuator - thiết bị chấp hành, (5) Camera - camera giám sát công nghiệp, (6) Robot - robot công nghiệp. Các giao thức hỗ trợ: MQTT, OPC-UA, Modbus TCP/RTU, HTTP REST.',
    category: 'overview',
    tags: ['thiết bị', 'loại', 'giao thức'],
  },
  {
    id: 'faq-4',
    question: 'Làm sao để biết thiết bị đang online hay offline?',
    answer: 'Trạng thái thiết bị được hiển thị trên IoT Dashboard và Device Management: (1) Online (xanh lá) - thiết bị đang hoạt động bình thường, (2) Offline (xám) - thiết bị mất kết nối, (3) Error (đỏ) - thiết bị gặp lỗi, (4) Maintenance (vàng) - thiết bị đang bảo trì. Hệ thống tự động kiểm tra heartbeat và cập nhật trạng thái mỗi 30 giây.',
    category: 'overview',
    tags: ['trạng thái', 'online', 'offline'],
  },
  // Kết nối
  {
    id: 'faq-5',
    question: 'MQTT là gì và khi nào nên sử dụng?',
    answer: 'MQTT (Message Queuing Telemetry Transport) là giao thức nhắn tin nhẹ, phù hợp cho IoT. Nên sử dụng MQTT khi: (1) Thiết bị có tài nguyên hạn chế, (2) Kết nối mạng không ổn định, (3) Cần publish/subscribe nhiều topic, (4) Yêu cầu độ trễ thấp. Cấu hình MQTT: Vào IoT → MQTT Connections, nhập Broker URL, Port (1883/8883), Username/Password.',
    category: 'connections',
    tags: ['MQTT', 'giao thức', 'kết nối'],
  },
  {
    id: 'faq-6',
    question: 'OPC-UA khác gì so với MQTT?',
    answer: 'OPC-UA và MQTT có những khác biệt: (1) OPC-UA - tiêu chuẩn công nghiệp, hỗ trợ bảo mật cao, browse node tree, phù hợp với PLC/SCADA. (2) MQTT - nhẹ hơn, publish/subscribe, phù hợp sensor đơn giản. Nên dùng OPC-UA khi kết nối với thiết bị công nghiệp chuẩn (Siemens, Allen-Bradley...), dùng MQTT cho sensor IoT đơn giản.',
    category: 'connections',
    tags: ['OPC-UA', 'MQTT', 'so sánh'],
  },
  {
    id: 'faq-7',
    question: 'Làm thế nào để khắc phục lỗi kết nối thiết bị?',
    answer: 'Các bước khắc phục lỗi kết nối: (1) Kiểm tra thiết bị có nguồn điện không, (2) Kiểm tra kết nối mạng (ping IP thiết bị), (3) Xác nhận cấu hình IP/Port đúng, (4) Kiểm tra firewall không chặn port, (5) Xác nhận credentials (username/password) đúng, (6) Kiểm tra log trong Latency Monitoring, (7) Restart gateway nếu cần. Nếu vẫn lỗi, tạo Work Order để kỹ thuật xử lý.',
    category: 'connections',
    tags: ['lỗi', 'kết nối', 'khắc phục'],
  },
  {
    id: 'faq-8',
    question: 'Gateway IoT có vai trò gì?',
    answer: 'IoT Gateway đóng vai trò trung gian: (1) Thu thập dữ liệu từ nhiều thiết bị, (2) Chuyển đổi giao thức (Modbus → MQTT), (3) Lọc và tiền xử lý dữ liệu, (4) Đệm dữ liệu khi mất kết nối, (5) Bảo mật kết nối đến server. Cấu hình Gateway: Vào IoT → IoT Gateway Config, thêm gateway với IP, Port và các thiết bị con.',
    category: 'connections',
    tags: ['gateway', 'vai trò', 'cấu hình'],
  },
  // Cảnh báo
  {
    id: 'faq-9',
    question: 'Có những mức độ cảnh báo nào?',
    answer: 'Hệ thống có 4 mức độ cảnh báo: (1) Info (xanh dương) - thông tin, không cần xử lý ngay, (2) Warning (vàng) - cảnh báo, cần theo dõi, (3) Error (cam) - lỗi, cần xử lý sớm, (4) Critical (đỏ) - nghiêm trọng, cần xử lý ngay lập tức. Mỗi mức có thời gian SLA xử lý khác nhau và quy trình escalation riêng.',
    category: 'alerts',
    tags: ['cảnh báo', 'mức độ', 'SLA'],
  },
  {
    id: 'faq-10',
    question: 'Làm sao để thiết lập ngưỡng cảnh báo?',
    answer: 'Thiết lập ngưỡng cảnh báo: (1) Vào IoT → Alarm Threshold Config, (2) Chọn thiết bị/measurement cần cấu hình, (3) Nhập ngưỡng: Warning Low/High, Error Low/High, Critical Low/High, (4) Chọn hành động khi vượt ngưỡng (gửi email, SMS, Telegram), (5) Lưu cấu hình. Ví dụ: Nhiệt độ > 80°C → Warning, > 90°C → Error, > 100°C → Critical.',
    category: 'alerts',
    tags: ['ngưỡng', 'cấu hình', 'cảnh báo'],
  },
  {
    id: 'faq-11',
    question: 'Escalation hoạt động như thế nào?',
    answer: 'Quy trình Escalation: (1) Cảnh báo được tạo và gửi đến người phụ trách cấp 1, (2) Nếu không xử lý trong 15 phút → escalate lên cấp 2, (3) Nếu tiếp tục không xử lý trong 30 phút → escalate lên cấp 3 (quản lý), (4) Mỗi lần escalate sẽ gửi thông báo mới. Cấu hình escalation: Vào Escalation Dashboard → Settings, định nghĩa các cấp và thời gian.',
    category: 'alerts',
    tags: ['escalation', 'quy trình', 'SLA'],
  },
  {
    id: 'faq-12',
    question: 'Auto-resolve là gì?',
    answer: 'Auto-resolve là tính năng tự động đóng cảnh báo khi giá trị trở về bình thường: (1) Khi measurement vượt ngưỡng → tạo cảnh báo, (2) Khi measurement trở về trong ngưỡng và duy trì trong thời gian chờ (vd: 5 phút) → tự động resolve, (3) Lưu lịch sử auto-resolve. Cấu hình: Vào Auto-resolve Settings, bật tính năng và đặt thời gian chờ. Lưu ý: Không nên auto-resolve cảnh báo Critical.',
    category: 'alerts',
    tags: ['auto-resolve', 'tự động', 'cảnh báo'],
  },
  {
    id: 'faq-13',
    question: 'Làm sao để nhận thông báo qua Telegram?',
    answer: 'Cấu hình thông báo Telegram: (1) Tạo Telegram Bot: Chat với @BotFather, gõ /newbot, lấy Bot Token, (2) Lấy Chat ID: Chat với bot, truy cập api.telegram.org/bot<TOKEN>/getUpdates, (3) Vào IoT → Telegram Settings, nhập Bot Token và Chat ID, (4) Chọn loại cảnh báo muốn nhận (Warning, Error, Critical), (5) Test gửi thông báo. Telegram phù hợp cho thông báo realtime.',
    category: 'alerts',
    tags: ['Telegram', 'thông báo', 'cấu hình'],
  },
  // Giám sát
  {
    id: 'faq-14',
    question: 'Dữ liệu realtime được cập nhật như thế nào?',
    answer: 'Dữ liệu realtime được cập nhật qua: (1) MQTT - publish/subscribe, cập nhật ngay khi có dữ liệu mới, (2) OPC-UA - subscription với sampling interval (vd: 1 giây), (3) Polling - hệ thống query thiết bị định kỳ. Dashboard sử dụng Server-Sent Events (SSE) để push dữ liệu mới đến browser mà không cần refresh. Độ trễ trung bình < 1 giây.',
    category: 'monitoring',
    tags: ['realtime', 'cập nhật', 'SSE'],
  },
  {
    id: 'faq-15',
    question: 'Làm sao để xem lịch sử dữ liệu sensor?',
    answer: 'Xem lịch sử dữ liệu: (1) Vào Sensor Dashboard, chọn sensor cần xem, (2) Click vào biểu đồ trend để mở chi tiết, (3) Chọn khoảng thời gian (1h, 6h, 24h, 7d, 30d), (4) Xem biểu đồ và bảng dữ liệu, (5) Export CSV nếu cần phân tích thêm. Dữ liệu được lưu trữ trong database và có thể truy vấn bất kỳ lúc nào.',
    category: 'monitoring',
    tags: ['lịch sử', 'dữ liệu', 'sensor'],
  },
  {
    id: 'faq-16',
    question: 'UCL và LCL là gì?',
    answer: 'UCL (Upper Control Limit) và LCL (Lower Control Limit) là giới hạn kiểm soát: (1) UCL - giới hạn trên, giá trị không được vượt quá, (2) LCL - giới hạn dưới, giá trị không được thấp hơn, (3) Tính từ Mean ± 3σ (độ lệch chuẩn). Khi giá trị vượt UCL/LCL → điểm ngoài kiểm soát, cần điều tra nguyên nhân. Khác với USL/LSL (specification limits) là yêu cầu kỹ thuật.',
    category: 'monitoring',
    tags: ['UCL', 'LCL', 'control limits'],
  },
  {
    id: 'faq-17',
    question: 'Độ trễ (latency) bao nhiêu là chấp nhận được?',
    answer: 'Tiêu chuẩn độ trễ IoT: (1) < 100ms - Tốt, phù hợp hầu hết ứng dụng, (2) 100-500ms - Chấp nhận được cho giám sát, (3) 500ms-1s - Cần cải thiện, (4) > 1s - Có vấn đề, cần kiểm tra. Nguyên nhân latency cao: mạng chậm, gateway quá tải, server xử lý chậm. Giám sát latency: Vào Latency Monitoring để theo dõi và phân tích.',
    category: 'monitoring',
    tags: ['latency', 'độ trễ', 'hiệu suất'],
  },
  // Sơ đồ nhà máy
  {
    id: 'faq-18',
    question: 'Làm sao để tạo sơ đồ mặt bằng nhà máy?',
    answer: 'Tạo sơ đồ mặt bằng: (1) Vào Layout Designer, (2) Upload hình nền (bản vẽ CAD hoặc ảnh chụp), (3) Kéo thả icon thiết bị từ library lên canvas, (4) Điều chỉnh vị trí, kích thước, rotation, (5) Gán thiết bị thực cho mỗi icon, (6) Tạo layers cho các khu vực khác nhau, (7) Lưu layout. Sơ đồ sẽ hiển thị trạng thái realtime trên Factory Floor Plan.',
    category: 'floorplan',
    tags: ['sơ đồ', 'layout', 'thiết kế'],
  },
  {
    id: 'faq-19',
    question: 'Sơ đồ 3D có yêu cầu phần cứng gì?',
    answer: 'Yêu cầu phần cứng cho 3D Floor Plan: (1) GPU - card đồ họa có hỗ trợ WebGL (hầu hết GPU hiện đại), (2) RAM - tối thiểu 4GB, khuyến nghị 8GB+, (3) Browser - Chrome/Firefox/Edge phiên bản mới, (4) Màn hình - độ phân giải Full HD trở lên. Nếu máy chậm: giảm chi tiết model, tắt shadow, giảm số thiết bị hiển thị.',
    category: 'floorplan',
    tags: ['3D', 'phần cứng', 'yêu cầu'],
  },
  {
    id: 'faq-20',
    question: 'Định dạng model 3D nào được hỗ trợ?',
    answer: 'Các định dạng 3D được hỗ trợ: (1) GLTF/GLB - khuyến nghị, tối ưu cho web, (2) OBJ - phổ biến, hỗ trợ tốt, (3) FBX - từ 3ds Max, Maya, (4) STL - từ CAD/3D printing. Lưu ý: GLTF cho hiệu suất tốt nhất, giảm polygon count cho model lớn (< 50k triangles), đính kèm texture nếu có. Upload model: Vào 3D Model Management → Upload.',
    category: 'floorplan',
    tags: ['3D', 'model', 'định dạng'],
  },
  // Bảo trì
  {
    id: 'faq-21',
    question: 'Work Order là gì và khi nào cần tạo?',
    answer: 'Work Order (Phiếu công việc) là yêu cầu bảo trì/sửa chữa: (1) Tạo khi thiết bị gặp sự cố cần xử lý, (2) Tạo cho bảo trì định kỳ theo lịch, (3) Tự động tạo từ cảnh báo Critical. Thông tin Work Order: thiết bị, loại công việc, độ ưu tiên, người thực hiện, deadline. Quy trình: Tạo → Gán → Thực hiện → Hoàn thành. Theo dõi: Vào IoT Work Orders.',
    category: 'maintenance',
    tags: ['work order', 'bảo trì', 'sửa chữa'],
  },
  {
    id: 'faq-22',
    question: 'MTTR và MTBF nghĩa là gì?',
    answer: 'MTTR và MTBF là chỉ số độ tin cậy thiết bị: (1) MTTR (Mean Time To Repair) - thời gian trung bình để sửa chữa, tính từ lúc lỗi đến lúc hoạt động lại. MTTR thấp = khả năng sửa chữa tốt. (2) MTBF (Mean Time Between Failures) - thời gian trung bình giữa các lần hỏng. MTBF cao = thiết bị đáng tin cậy. Xem báo cáo: Vào MTTR/MTBF Report.',
    category: 'maintenance',
    tags: ['MTTR', 'MTBF', 'độ tin cậy'],
  },
  {
    id: 'faq-23',
    question: 'OTA update là gì và có rủi ro không?',
    answer: 'OTA (Over-The-Air) là cập nhật firmware từ xa: (1) Upload firmware mới lên hệ thống, (2) Chọn thiết bị cần cập nhật, (3) Lập lịch thời gian (nên ngoài giờ sản xuất), (4) Hệ thống tự động push firmware. Rủi ro: thiết bị có thể không hoạt động nếu firmware lỗi. Giảm rủi ro: test trên thiết bị pilot trước, backup firmware cũ, có khả năng rollback. Cấu hình: IoT Scheduled OTA.',
    category: 'maintenance',
    tags: ['OTA', 'firmware', 'cập nhật'],
  },
  // Nâng cao
  {
    id: 'faq-24',
    question: 'Làm sao để tùy chỉnh Unified Dashboard?',
    answer: 'Tùy chỉnh Unified Dashboard: (1) Vào Unified IoT Dashboard, (2) Click nút Edit/Customize, (3) Kéo thả widgets từ library: Device Status, Alarm List, Charts, Map, (4) Resize và sắp xếp widgets, (5) Cấu hình từng widget (chọn thiết bị, thời gian, màu sắc), (6) Lưu layout. Có thể tạo nhiều dashboard cho các mục đích khác nhau (production, maintenance, management).',
    category: 'advanced',
    tags: ['dashboard', 'tùy chỉnh', 'widgets'],
  },
  {
    id: 'faq-25',
    question: 'Biểu đồ Pareto dùng để làm gì?',
    answer: 'Biểu đồ Pareto phân tích nguyên nhân sự cố: (1) Hiển thị các nguyên nhân theo tần suất giảm dần, (2) Đường tích lũy % cho thấy tỷ lệ đóng góp, (3) Áp dụng quy tắc 80/20: 20% nguyên nhân gây 80% sự cố. Sử dụng: (1) Xác định nguyên nhân chính cần ưu tiên, (2) Phân bổ nguồn lực hiệu quả, (3) Đo lường cải tiến sau khi khắc phục. Xem: Factory Floor Plan → tab Pareto Analysis.',
    category: 'advanced',
    tags: ['Pareto', 'phân tích', 'sự cố'],
  },
  {
    id: 'faq-26',
    question: 'Làm sao để tích hợp IoT với SPC?',
    answer: 'Tích hợp IoT với SPC: (1) Cấu hình thiết bị IoT thu thập dữ liệu đo lường, (2) Tạo SPC Sampling Plan với nguồn dữ liệu từ IoT, (3) Hệ thống tự động lấy mẫu theo kế hoạch, (4) Tính toán CPK, UCL, LCL từ dữ liệu IoT, (5) Phát hiện vi phạm SPC Rules và gửi cảnh báo. Lợi ích: giám sát chất lượng realtime, phát hiện sớm xu hướng xấu, giảm phế phẩm.',
    category: 'advanced',
    tags: ['SPC', 'tích hợp', 'chất lượng'],
  },
  {
    id: 'faq-27',
    question: 'Dữ liệu IoT được lưu trữ bao lâu?',
    answer: 'Chính sách lưu trữ dữ liệu: (1) Dữ liệu realtime - 7 ngày chi tiết, (2) Dữ liệu tổng hợp giờ - 30 ngày, (3) Dữ liệu tổng hợp ngày - 1 năm, (4) Dữ liệu tổng hợp tháng - 5 năm. Cảnh báo và Work Order được lưu vĩnh viễn. Có thể export dữ liệu trước khi hết hạn. Cấu hình retention: liên hệ admin để điều chỉnh theo nhu cầu.',
    category: 'advanced',
    tags: ['lưu trữ', 'dữ liệu', 'retention'],
  },
  {
    id: 'faq-28',
    question: 'Hệ thống có hỗ trợ API không?',
    answer: 'Hệ thống cung cấp API đầy đủ: (1) REST API - CRUD cho devices, alarms, work orders, (2) WebSocket - realtime data streaming, (3) tRPC - type-safe API cho frontend. Authentication: Bearer token hoặc API key. Documentation: Vào Settings → API Documentation. Use cases: tích hợp với ERP, MES, BI tools, mobile app.',
    category: 'advanced',
    tags: ['API', 'tích hợp', 'REST'],
  },
  {
    id: 'faq-29',
    question: 'Làm sao để backup và restore cấu hình?',
    answer: 'Backup và restore cấu hình: (1) Backup: Vào Settings → Backup, chọn các mục cần backup (devices, alarms, layouts, settings), click Export, (2) File JSON được tải về, (3) Restore: Upload file backup, chọn các mục cần restore, click Import. Lưu ý: backup định kỳ trước khi thay đổi lớn, lưu trữ backup ở nơi an toàn.',
    category: 'advanced',
    tags: ['backup', 'restore', 'cấu hình'],
  },
  {
    id: 'faq-30',
    question: 'Có thể giám sát IoT trên mobile không?',
    answer: 'Giám sát IoT trên mobile: (1) Web responsive - truy cập dashboard qua browser mobile, (2) Telegram Bot - nhận thông báo và xem trạng thái qua Telegram, (3) PWA - cài đặt web app lên home screen. Tính năng mobile: xem dashboard, nhận cảnh báo, xác nhận/resolve alarm, xem work orders. Lưu ý: một số tính năng nâng cao (3D, layout designer) tối ưu cho desktop.',
    category: 'advanced',
    tags: ['mobile', 'responsive', 'PWA'],
  },
  // Bảo mật
  {
    id: 'faq-31',
    question: 'Dữ liệu IoT có được bảo mật không?',
    answer: 'Các biện pháp bảo mật: (1) HTTPS/TLS - mã hóa dữ liệu truyền tải, (2) Authentication - đăng nhập OAuth, session token, (3) Authorization - phân quyền theo role (admin, operator, viewer), (4) MQTT TLS - mã hóa kết nối MQTT, (5) OPC-UA Security - certificate-based authentication, (6) Audit Log - ghi lại mọi thao tác. Tuân thủ: ISO 27001, GDPR ready.',
    category: 'security',
    tags: ['bảo mật', 'mã hóa', 'authentication'],
  },
  {
    id: 'faq-32',
    question: 'Làm sao để phân quyền người dùng?',
    answer: 'Phân quyền người dùng: (1) Vào Settings → User Management, (2) Tạo user mới hoặc chọn user cần phân quyền, (3) Gán role: Admin (toàn quyền), Operator (vận hành, xử lý cảnh báo), Viewer (chỉ xem), (4) Gán quyền chi tiết: xem device, edit device, delete device, view alarm, resolve alarm... (5) Lưu. User sẽ chỉ thấy menu và thực hiện được các thao tác được phép.',
    category: 'security',
    tags: ['phân quyền', 'user', 'role'],
  },
];

const iotGuideSections: GuideSection[] = [
  // IoT Overview Group
  {
    id: 'iot-dashboard',
    title: 'IoT Dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    description: 'Bảng điều khiển tổng quan cho hệ thống IoT, hiển thị trạng thái thiết bị, cảnh báo và dữ liệu realtime.',
    purpose: 'Cung cấp cái nhìn tổng quan về toàn bộ hệ thống IoT trong nhà máy, giúp người quản lý nhanh chóng nắm bắt tình trạng thiết bị và các vấn đề cần xử lý.',
    benefits: [
      'Theo dõi trạng thái tất cả thiết bị IoT từ một nơi duy nhất',
      'Phát hiện sớm các thiết bị offline hoặc có vấn đề',
      'Xem dữ liệu realtime và xu hướng hoạt động',
      'Quản lý cảnh báo và xử lý kịp thời',
    ],
    features: [
      'Thống kê tổng số thiết bị, online/offline',
      'Danh sách thiết bị với trạng thái chi tiết',
      'Tab Alerts hiển thị cảnh báo chưa xử lý',
      'Tab Live Data xem dữ liệu realtime',
      'Nút Add Device để thêm thiết bị mới',
    ],
    howToUse: [
      'Truy cập menu IoT → IoT Dashboard',
      'Xem tổng quan thiết bị ở phần header (Total, Online, Offline)',
      'Click vào tab Devices để xem danh sách thiết bị',
      'Click View trên từng thiết bị để xem chi tiết',
      'Click Add Device để thêm thiết bị mới vào hệ thống',
    ],
    tips: [
      'Kiểm tra dashboard hàng ngày để phát hiện sớm vấn đề',
      'Thiết lập cảnh báo cho các thiết bị quan trọng',
      'Sử dụng Live Data tab để debug khi có sự cố',
    ],
    relatedPages: ['Device Management', 'Alarm Management', 'IoT Realtime Dashboard'],
  },
  {
    id: 'device-management',
    title: 'Device Management',
    icon: <Cpu className="h-5 w-5" />,
    description: 'Quản lý toàn bộ thiết bị IoT trong hệ thống: thêm, sửa, xóa và cấu hình thiết bị.',
    purpose: 'Cho phép quản trị viên quản lý đầy đủ vòng đời của thiết bị IoT từ khi đăng ký đến khi ngừng hoạt động.',
    benefits: [
      'Quản lý tập trung tất cả thiết bị IoT',
      'Theo dõi thông tin chi tiết từng thiết bị',
      'Phân loại thiết bị theo loại và trạng thái',
      'Lưu trữ lịch sử hoạt động và bảo trì',
    ],
    features: [
      'Danh sách thiết bị với bộ lọc theo loại, trạng thái',
      'Form thêm/sửa thiết bị với đầy đủ thông tin',
      'Thống kê: Tổng, Online, Offline, Lỗi, Bảo trì',
      'Xem chi tiết từng thiết bị',
      'Xóa thiết bị không còn sử dụng',
    ],
    howToUse: [
      'Truy cập menu IoT → Device Management',
      'Click "Thêm thiết bị" để đăng ký thiết bị mới',
      'Điền đầy đủ thông tin: Tên, Loại, Giao thức, IP, Port...',
      'Sử dụng bộ lọc để tìm kiếm thiết bị nhanh',
      'Click vào thiết bị để xem chi tiết hoặc chỉnh sửa',
    ],
    tips: [
      'Đặt tên thiết bị theo quy chuẩn để dễ quản lý',
      'Cập nhật trạng thái thiết bị khi bảo trì',
      'Ghi chú đầy đủ thông tin vị trí và mục đích sử dụng',
    ],
    relatedPages: ['IoT Dashboard', 'IoT Gateway Config', 'Work Orders'],
  },
  {
    id: 'alarm-management',
    title: 'Alarm Management',
    icon: <AlertTriangle className="h-5 w-5" />,
    description: 'Quản lý và xử lý các cảnh báo từ thiết bị IoT.',
    purpose: 'Tập trung quản lý tất cả cảnh báo từ hệ thống IoT, giúp đội ngũ vận hành phản ứng nhanh với các sự cố.',
    benefits: [
      'Không bỏ sót cảnh báo quan trọng',
      'Phân loại mức độ ưu tiên cảnh báo',
      'Theo dõi tiến độ xử lý cảnh báo',
      'Lưu trữ lịch sử cảnh báo để phân tích',
    ],
    features: [
      'Danh sách cảnh báo với mức độ: Warning, Error, Critical',
      'Bộ lọc theo loại, trạng thái, thiết bị',
      'Nút Xác nhận và Xử lý cảnh báo',
      'Form tạo cảnh báo thủ công',
      'Thống kê cảnh báo theo thời gian',
    ],
    howToUse: [
      'Truy cập menu IoT → Alarm Management',
      'Xem danh sách cảnh báo chưa xử lý',
      'Click "Xác nhận" để nhận xử lý cảnh báo',
      'Click "Xử lý" sau khi đã khắc phục sự cố',
      'Sử dụng bộ lọc để tìm cảnh báo cụ thể',
    ],
    tips: [
      'Xử lý cảnh báo Critical ngay lập tức',
      'Ghi chú nguyên nhân và cách khắc phục',
      'Thiết lập thông báo qua Telegram/Email cho cảnh báo quan trọng',
    ],
    relatedPages: ['Alarm Threshold Config', 'Notification Preferences', 'Escalation Dashboard'],
  },
  {
    id: 'iot-realtime-dashboard',
    title: 'IoT Realtime Dashboard',
    icon: <Activity className="h-5 w-5" />,
    description: 'Giám sát dữ liệu realtime từ thiết bị IoT qua MQTT và OPC-UA.',
    purpose: 'Cung cấp khả năng giám sát dữ liệu realtime từ các thiết bị IoT, hỗ trợ phát hiện sớm các bất thường.',
    benefits: [
      'Xem dữ liệu realtime không độ trễ',
      'Biểu đồ trực quan xu hướng dữ liệu',
      'Phát hiện sớm các bất thường',
      'Hỗ trợ debug và troubleshooting',
    ],
    features: [
      'Biểu đồ realtime với UCL/LCL',
      'Kết nối MQTT Broker và OPC-UA Server',
      'Thống kê Data Points theo ngày',
      'Tab Tổng quan, Thiết bị, Dữ liệu Realtime, Cảnh báo',
      'Hiển thị trạng thái kết nối',
    ],
    howToUse: [
      'Truy cập menu IoT → IoT Realtime Dashboard',
      'Xem biểu đồ realtime ở tab Tổng quan',
      'Click tab Thiết bị để xem danh sách thiết bị kết nối',
      'Click tab Dữ liệu Realtime để xem dữ liệu chi tiết',
      'Kiểm tra trạng thái MQTT/OPC-UA ở cuối trang',
    ],
    tips: [
      'Cấu hình kết nối MQTT/OPC-UA trước khi sử dụng',
      'Thiết lập UCL/LCL phù hợp để phát hiện bất thường',
      'Sử dụng tab Cảnh báo để xem các điểm vượt ngưỡng',
    ],
    relatedPages: ['MQTT Connections', 'OPC-UA Connections', 'Alarm Threshold Config'],
  },
  {
    id: 'sensor-dashboard',
    title: 'Sensor Dashboard',
    icon: <Gauge className="h-5 w-5" />,
    description: 'Dashboard giám sát realtime tất cả sensors và thiết bị IoT.',
    purpose: 'Hiển thị trạng thái và giá trị realtime của tất cả sensors trong hệ thống, hỗ trợ giám sát liên tục.',
    benefits: [
      'Xem tất cả sensors trên một màn hình',
      'Auto refresh dữ liệu theo interval',
      'Thống kê Min/Max/Avg/σ cho mỗi sensor',
      'Biểu đồ trend cho từng sensor',
    ],
    features: [
      'Grid view với 3 columns mặc định',
      'Auto refresh 5s (có thể điều chỉnh)',
      'Bộ lọc theo loại sensor, trạng thái',
      'Export CSV dữ liệu sensor',
      'Thống kê: Tổng, Online, Offline, Cảnh báo',
    ],
    howToUse: [
      'Truy cập menu IoT → Sensor Dashboard',
      'Xem tổng quan sensors ở header',
      'Điều chỉnh số columns và interval nếu cần',
      'Sử dụng bộ lọc để xem sensors cụ thể',
      'Click Export CSV để xuất dữ liệu',
    ],
    tips: [
      'Tăng interval nếu có nhiều sensors để giảm tải',
      'Sử dụng 2 columns trên màn hình nhỏ',
      'Theo dõi σ (độ lệch chuẩn) để phát hiện bất thường',
    ],
    relatedPages: ['IoT Dashboard', 'Alarm Threshold Config', 'IoT Realtime Dashboard'],
  },
  {
    id: 'factory-floor-plan',
    title: 'Factory Floor Plan',
    icon: <Factory className="h-5 w-5" />,
    description: 'Sơ đồ nhà máy IoT với vị trí thiết bị và trạng thái realtime.',
    purpose: 'Hiển thị trực quan vị trí các thiết bị IoT trên sơ đồ nhà máy, giúp dễ dàng định vị và giám sát.',
    benefits: [
      'Xem vị trí thiết bị trực quan trên sơ đồ',
      'Nhận biết nhanh thiết bị có vấn đề',
      'Phân tích Pareto các sự cố',
      'Giám sát độ trễ kết nối',
    ],
    features: [
      'Sơ đồ nhà máy với vị trí thiết bị',
      'Màu sắc theo trạng thái: Online, Offline, Error, Maintenance',
      'Tab Pareto Analysis phân tích sự cố',
      'Tab Latency Monitor giám sát độ trễ',
      'Zoom và pan trên sơ đồ',
    ],
    howToUse: [
      'Truy cập menu IoT → Factory Floor Plan',
      'Xem sơ đồ nhà máy với vị trí thiết bị',
      'Click vào thiết bị để xem chi tiết',
      'Sử dụng tab Pareto để phân tích sự cố',
      'Sử dụng tab Latency để kiểm tra độ trễ',
    ],
    tips: [
      'Cập nhật vị trí thiết bị khi di chuyển',
      'Sử dụng Pareto để ưu tiên xử lý thiết bị hay lỗi nhất',
      'Kiểm tra Latency nếu dữ liệu bị delay',
    ],
    relatedPages: ['Layout Designer', '3D Factory Floor Plan', 'Device Management'],
  },
  // IoT Maintenance Group
  {
    id: 'work-orders',
    title: 'IoT Work Orders',
    icon: <Wrench className="h-5 w-5" />,
    description: 'Quản lý phiếu công việc bảo trì cho thiết bị IoT.',
    purpose: 'Theo dõi và quản lý các công việc bảo trì, sửa chữa thiết bị IoT một cách có hệ thống.',
    benefits: [
      'Quản lý công việc bảo trì tập trung',
      'Phân công và theo dõi tiến độ',
      'Lưu trữ lịch sử bảo trì',
      'Tự động tạo phiếu từ cảnh báo',
    ],
    features: [
      'Danh sách phiếu công việc với trạng thái',
      'Form tạo phiếu mới với đầy đủ thông tin',
      'Phân loại: Bảo trì định kỳ, Sửa chữa, Khẩn cấp',
      'Tự động gán người thực hiện',
      'Theo dõi tiến độ và hoàn thành',
    ],
    howToUse: [
      'Truy cập menu IoT → IoT Work Orders',
      'Click "Tạo phiếu mới" để tạo công việc',
      'Chọn thiết bị, loại công việc, độ ưu tiên',
      'Nhập mô tả chi tiết công việc',
      'Theo dõi tiến độ và cập nhật trạng thái',
    ],
    tips: [
      'Tạo phiếu ngay khi phát hiện vấn đề',
      'Ghi chú đầy đủ nguyên nhân và cách khắc phục',
      'Sử dụng độ ưu tiên để sắp xếp công việc',
    ],
    relatedPages: ['Device Management', 'Alarm Management', 'MTTR/MTBF Report'],
  },
  {
    id: 'mttr-mtbf-report',
    title: 'MTTR/MTBF Report',
    icon: <LineChart className="h-5 w-5" />,
    description: 'Báo cáo độ tin cậy thiết bị với chỉ số MTTR và MTBF.',
    purpose: 'Phân tích độ tin cậy và khả năng bảo trì của thiết bị thông qua các chỉ số MTTR và MTBF.',
    benefits: [
      'Đánh giá độ tin cậy thiết bị',
      'Xác định thiết bị cần thay thế',
      'Lập kế hoạch bảo trì hiệu quả',
      'So sánh hiệu suất giữa các thiết bị',
    ],
    features: [
      'Biểu đồ MTTR/MTBF theo thời gian',
      'Bảng thống kê chi tiết từng thiết bị',
      'Bộ lọc theo loại thiết bị, khoảng thời gian',
      'Export báo cáo PDF/Excel',
      'So sánh với benchmark ngành',
    ],
    howToUse: [
      'Truy cập menu IoT → MTTR/MTBF Report',
      'Chọn khoảng thời gian cần phân tích',
      'Xem biểu đồ và bảng thống kê',
      'Sử dụng bộ lọc để xem thiết bị cụ thể',
      'Export báo cáo nếu cần',
    ],
    tips: [
      'MTBF cao = thiết bị đáng tin cậy',
      'MTTR thấp = khả năng sửa chữa tốt',
      'So sánh với benchmark để đánh giá',
    ],
    relatedPages: ['IoT Work Orders', 'Device Management', 'Alarm Management'],
  },
  // IoT Connections Group
  {
    id: 'iot-gateway',
    title: 'IoT Gateway Config',
    icon: <Server className="h-5 w-5" />,
    description: 'Cấu hình và quản lý IoT Gateway trong hệ thống.',
    purpose: 'Quản lý các gateway IoT đóng vai trò trung gian thu thập và chuyển tiếp dữ liệu từ thiết bị.',
    benefits: [
      'Quản lý tập trung các gateway',
      'Theo dõi trạng thái kết nối',
      'Cấu hình chuyển đổi giao thức',
      'Giám sát hiệu suất gateway',
    ],
    features: [
      'Danh sách gateway với trạng thái',
      'Form thêm/sửa gateway',
      'Cấu hình thiết bị con của gateway',
      'Theo dõi throughput và latency',
      'Restart gateway từ xa',
    ],
    howToUse: [
      'Truy cập menu IoT → IoT Gateway Config',
      'Click "Thêm Gateway" để đăng ký gateway mới',
      'Nhập thông tin: Tên, IP, Port, Giao thức',
      'Cấu hình các thiết bị con kết nối qua gateway',
      'Theo dõi trạng thái và hiệu suất',
    ],
    tips: [
      'Đặt gateway gần thiết bị để giảm latency',
      'Cấu hình backup gateway cho high availability',
      'Monitor throughput để phát hiện bottleneck',
    ],
    relatedPages: ['Device Management', 'MQTT Connections', 'OPC-UA Connections'],
  },
  {
    id: 'mqtt-connections',
    title: 'MQTT Connections',
    icon: <Radio className="h-5 w-5" />,
    description: 'Quản lý kết nối MQTT Broker cho hệ thống IoT.',
    purpose: 'Cấu hình và quản lý kết nối đến MQTT Broker để thu thập dữ liệu từ thiết bị IoT.',
    benefits: [
      'Kết nối với MQTT Broker chuẩn',
      'Hỗ trợ TLS/SSL bảo mật',
      'Subscribe nhiều topics',
      'Theo dõi message throughput',
    ],
    features: [
      'Cấu hình MQTT Broker (host, port, credentials)',
      'Quản lý topics subscribe',
      'Xem message realtime',
      'Thống kê message rate',
      'Test connection',
    ],
    howToUse: [
      'Truy cập menu IoT → MQTT Connections',
      'Click "Add Connection" để thêm broker mới',
      'Nhập Broker URL, Port (1883/8883), Username/Password',
      'Thêm các topics cần subscribe',
      'Test connection và lưu',
    ],
    tips: [
      'Sử dụng port 8883 với TLS cho production',
      'Đặt QoS phù hợp với yêu cầu',
      'Monitor message rate để sizing broker',
    ],
    relatedPages: ['IoT Gateway Config', 'OPC-UA Connections', 'IoT Realtime Dashboard'],
  },
  {
    id: 'alarm-threshold-config',
    title: 'Alarm Threshold Config',
    icon: <Target className="h-5 w-5" />,
    description: 'Cấu hình ngưỡng cảnh báo cho các thông số đo lường.',
    purpose: 'Thiết lập các ngưỡng cảnh báo để hệ thống tự động phát hiện và thông báo khi giá trị vượt ngưỡng.',
    benefits: [
      'Phát hiện sớm bất thường',
      'Tùy chỉnh ngưỡng theo thiết bị',
      'Phân loại mức độ cảnh báo',
      'Giảm false positive',
    ],
    features: [
      'Cấu hình ngưỡng Warning/Error/Critical',
      'Áp dụng cho từng measurement',
      'Cấu hình hysteresis',
      'Preview ngưỡng trên biểu đồ',
      'Import/Export cấu hình',
    ],
    howToUse: [
      'Truy cập menu IoT → Alarm Threshold Config',
      'Chọn thiết bị và measurement',
      'Nhập ngưỡng: Warning, Error, Critical (Low/High)',
      'Cấu hình hysteresis nếu cần',
      'Lưu cấu hình',
    ],
    tips: [
      'Đặt ngưỡng dựa trên dữ liệu lịch sử',
      'Sử dụng hysteresis để tránh cảnh báo liên tục',
      'Review và điều chỉnh ngưỡng định kỳ',
    ],
    relatedPages: ['Alarm Management', 'Notification Preferences', 'Auto-resolve Settings'],
  },
  {
    id: 'telegram-settings',
    title: 'Telegram Settings',
    icon: <Bell className="h-5 w-5" />,
    description: 'Cấu hình thông báo qua Telegram Bot.',
    purpose: 'Thiết lập gửi thông báo cảnh báo và báo cáo qua Telegram để nhận tin nhắn realtime.',
    benefits: [
      'Nhận thông báo realtime trên điện thoại',
      'Không cần cài app riêng',
      'Hỗ trợ group chat',
      'Miễn phí không giới hạn',
    ],
    features: [
      'Cấu hình Bot Token',
      'Quản lý Chat ID nhận thông báo',
      'Chọn loại cảnh báo gửi',
      'Test gửi thông báo',
      'Xem lịch sử gửi',
    ],
    howToUse: [
      'Tạo Bot: Chat với @BotFather trên Telegram',
      'Gõ /newbot và làm theo hướng dẫn',
      'Copy Bot Token vào Telegram Settings',
      'Lấy Chat ID và nhập vào hệ thống',
      'Test gửi thông báo',
    ],
    tips: [
      'Tạo group riêng cho từng loại cảnh báo',
      'Sử dụng silent mode cho cảnh báo Warning',
      'Pin tin nhắn quan trọng trong group',
    ],
    relatedPages: ['Notification Preferences', 'SMS Notification Settings', 'Alarm Management'],
  },
  {
    id: 'notification-preferences',
    title: 'Notification Preferences',
    icon: <Bell className="h-5 w-5" />,
    description: 'Cấu hình tùy chọn nhận thông báo cho người dùng.',
    purpose: 'Cho phép người dùng tùy chỉnh cách thức và loại thông báo muốn nhận.',
    benefits: [
      'Tùy chỉnh theo nhu cầu cá nhân',
      'Giảm spam thông báo',
      'Chọn kênh thông báo phù hợp',
      'Lập lịch thời gian nhận',
    ],
    features: [
      'Bật/tắt từng loại thông báo',
      'Chọn kênh: Email, SMS, Telegram, In-app',
      'Cấu hình thời gian yên tĩnh',
      'Nhóm thông báo theo thiết bị',
      'Preview thông báo',
    ],
    howToUse: [
      'Truy cập menu IoT → Notification Preferences',
      'Chọn loại thông báo muốn nhận',
      'Chọn kênh nhận (Email, SMS, Telegram)',
      'Cấu hình thời gian yên tĩnh nếu cần',
      'Lưu cấu hình',
    ],
    tips: [
      'Chỉ bật SMS cho Critical alerts',
      'Sử dụng Telegram cho realtime',
      'Email phù hợp cho báo cáo định kỳ',
    ],
    relatedPages: ['Telegram Settings', 'SMS Notification Settings', 'Alarm Management'],
  },
  // Advanced Group
  {
    id: 'unified-dashboard',
    title: 'Unified IoT Dashboard',
    icon: <Monitor className="h-5 w-5" />,
    description: 'Dashboard tổng hợp với widgets có thể tùy chỉnh.',
    purpose: 'Cung cấp dashboard linh hoạt cho phép người dùng tự thiết kế layout và widgets theo nhu cầu.',
    benefits: [
      'Tùy chỉnh hoàn toàn theo nhu cầu',
      'Kéo thả widgets dễ dàng',
      'Lưu nhiều layout khác nhau',
      'Chia sẻ dashboard với team',
    ],
    features: [
      'Grid layout với widgets có thể kéo thả',
      'Widgets: Thiết bị, Cảnh báo, Biểu đồ, Bản đồ',
      'Auto refresh dữ liệu',
      'Fullscreen mode',
      'Export dashboard dưới dạng PDF',
    ],
    howToUse: [
      'Truy cập menu IoT → Unified IoT Dashboard',
      'Xem dashboard mặc định với các widgets',
      'Click Edit để tùy chỉnh layout',
      'Kéo thả widgets để sắp xếp lại',
      'Click Save để lưu cấu hình',
    ],
    tips: [
      'Sử dụng fullscreen mode khi trình chiếu',
      'Tạo nhiều dashboard cho các mục đích khác nhau',
      'Đặt auto refresh phù hợp với nhu cầu',
    ],
    relatedPages: ['IoT Dashboard', 'Sensor Dashboard', 'Factory Floor Plan'],
  },
  {
    id: 'layout-designer',
    title: 'Layout Designer',
    icon: <LayoutDashboard className="h-5 w-5" />,
    description: 'Công cụ thiết kế layout cho sơ đồ nhà máy IoT.',
    purpose: 'Cho phép người dùng tự thiết kế và tùy chỉnh sơ đồ mặt bằng nhà máy với vị trí các thiết bị IoT.',
    benefits: [
      'Thiết kế sơ đồ mặt bằng trực quan',
      'Kéo thả thiết bị lên sơ đồ',
      'Tùy chỉnh màu sắc và icon',
      'Lưu và chia sẻ layout',
    ],
    features: [
      'Canvas editor với zoom và pan',
      'Library các icon thiết bị',
      'Layers để quản lý các lớp',
      'Grid snap để căn chỉnh',
      'Export dưới dạng hình ảnh',
    ],
    howToUse: [
      'Truy cập menu IoT → Layout Designer',
      'Upload hình nền sơ đồ nhà máy',
      'Kéo thả thiết bị từ library lên canvas',
      'Điều chỉnh vị trí và kích thước',
      'Lưu layout khi hoàn thành',
    ],
    tips: [
      'Sử dụng grid snap để căn chỉnh chính xác',
      'Tạo layers riêng cho từng khu vực',
      'Export layout để backup',
    ],
    relatedPages: ['Factory Floor Plan', '3D Factory Floor Plan', 'IoT Dashboard'],
  },
  {
    id: 'iot-3d-floor-plan',
    title: '3D Factory Floor Plan',
    icon: <Factory className="h-5 w-5" />,
    description: 'Sơ đồ nhà máy 3D với vị trí thiết bị IoT.',
    purpose: 'Hiển thị sơ đồ nhà máy dưới dạng 3D giúp trực quan hóa vị trí thiết bị và trạng thái hoạt động.',
    benefits: [
      'Xem nhà máy dưới góc nhìn 3D',
      'Tương tác với thiết bị trực tiếp',
      'Hiển thị trạng thái realtime',
      'Hỗ trợ VR/AR (tương lai)',
    ],
    features: [
      'Render 3D với Three.js',
      'Rotate, zoom, pan camera',
      'Click vào thiết bị để xem chi tiết',
      'Màu sắc theo trạng thái',
      'Animation cho thiết bị hoạt động',
    ],
    howToUse: [
      'Truy cập menu IoT → 3D Factory Floor Plan',
      'Sử dụng chuột để xoay góc nhìn',
      'Scroll để zoom in/out',
      'Click vào thiết bị để xem thông tin',
      'Sử dụng panel bên phải để filter',
    ],
    tips: [
      'Sử dụng trên máy tính có GPU tốt',
      'Giảm chi tiết nếu máy chậm',
      'Sử dụng fullscreen để xem tốt hơn',
    ],
    relatedPages: ['Factory Floor Plan', 'Layout Designer', '3D Model Management'],
  },
  {
    id: 'model-3d-management',
    title: '3D Model Management',
    icon: <Database className="h-5 w-5" />,
    description: 'Quản lý các model 3D cho thiết bị IoT.',
    purpose: 'Cho phép upload và quản lý các model 3D để sử dụng trong sơ đồ 3D nhà máy.',
    benefits: [
      'Thư viện model 3D tập trung',
      'Hỗ trợ nhiều định dạng: GLTF, OBJ, FBX',
      'Preview model trước khi sử dụng',
      'Gán model cho loại thiết bị',
    ],
    features: [
      'Upload model 3D',
      'Preview với viewer 3D',
      'Quản lý metadata model',
      'Gán model cho device type',
      'Tìm kiếm và filter model',
    ],
    howToUse: [
      'Truy cập menu IoT → 3D Model Management',
      'Click Upload để thêm model mới',
      'Chọn file model (GLTF/OBJ/FBX)',
      'Nhập thông tin: Tên, Loại thiết bị',
      'Preview và lưu model',
    ],
    tips: [
      'Sử dụng GLTF để tối ưu performance',
      'Giảm polygon count cho model lớn',
      'Đặt tên model theo quy chuẩn',
    ],
    relatedPages: ['3D Factory Floor Plan', 'Device Management', 'Layout Designer'],
  },
  {
    id: 'scheduled-ota',
    title: 'IoT Scheduled OTA',
    icon: <Timer className="h-5 w-5" />,
    description: 'Lập lịch cập nhật firmware OTA cho thiết bị IoT.',
    purpose: 'Cho phép lập lịch cập nhật firmware từ xa (Over-The-Air) cho các thiết bị IoT theo thời gian định sẵn.',
    benefits: [
      'Cập nhật firmware tự động',
      'Lập lịch ngoài giờ sản xuất',
      'Rollback nếu cập nhật lỗi',
      'Theo dõi tiến độ cập nhật',
    ],
    features: [
      'Upload firmware mới',
      'Chọn thiết bị cần cập nhật',
      'Lập lịch thời gian cập nhật',
      'Theo dõi tiến độ realtime',
      'Rollback về version cũ',
    ],
    howToUse: [
      'Truy cập menu IoT → IoT Scheduled OTA',
      'Upload firmware mới',
      'Chọn thiết bị hoặc nhóm thiết bị',
      'Đặt lịch cập nhật',
      'Theo dõi tiến độ và kết quả',
    ],
    tips: [
      'Luôn test firmware trên thiết bị pilot trước',
      'Lập lịch ngoài giờ sản xuất',
      'Backup firmware cũ trước khi cập nhật',
    ],
    relatedPages: ['Device Management', 'IoT Gateway Config', 'Work Orders'],
  },
  {
    id: 'opcua-connections',
    title: 'OPC-UA Connections',
    icon: <Server className="h-5 w-5" />,
    description: 'Quản lý kết nối OPC-UA Server cho hệ thống IoT.',
    purpose: 'Cấu hình và quản lý kết nối đến OPC-UA Server để thu thập dữ liệu từ thiết bị công nghiệp.',
    benefits: [
      'Kết nối với thiết bị công nghiệp chuẩn',
      'Hỗ trợ bảo mật OPC-UA',
      'Browse node tree trực quan',
      'Subscribe nhiều nodes cùng lúc',
    ],
    features: [
      'Cấu hình OPC-UA endpoint',
      'Browse node tree',
      'Subscribe/Unsubscribe nodes',
      'Xem giá trị realtime',
      'Cấu hình security mode',
    ],
    howToUse: [
      'Truy cập menu IoT → OPC-UA Connections',
      'Click Add Connection để thêm server mới',
      'Nhập endpoint URL và credentials',
      'Browse node tree để chọn nodes',
      'Subscribe các nodes cần giám sát',
    ],
    tips: [
      'Sử dụng security mode Sign & Encrypt cho production',
      'Chỉ subscribe nodes cần thiết',
      'Kiểm tra certificate khi kết nối lỗi',
    ],
    relatedPages: ['IoT Gateway Config', 'MQTT Connections', 'IoT Realtime Dashboard'],
  },
  {
    id: 'sms-settings',
    title: 'SMS Notification Settings',
    icon: <Smartphone className="h-5 w-5" />,
    description: 'Cấu hình thông báo qua SMS.',
    purpose: 'Thiết lập gửi SMS thông báo cảnh báo và báo cáo quan trọng đến điện thoại.',
    benefits: [
      'Nhận thông báo khẩn cấp qua SMS',
      'Không cần internet để nhận',
      'Hỗ trợ nhiều nhà mạng',
      'Gửi đến nhiều số điện thoại',
    ],
    features: [
      'Cấu hình Twilio/SMS Gateway',
      'Quản lý danh sách số điện thoại',
      'Chọn loại thông báo gửi SMS',
      'Test gửi SMS',
      'Xem lịch sử gửi SMS',
    ],
    howToUse: [
      'Truy cập menu IoT → SMS Settings',
      'Nhập thông tin Twilio Account',
      'Thêm số điện thoại nhận thông báo',
      'Chọn loại cảnh báo gửi SMS',
      'Test gửi SMS để kiểm tra',
    ],
    tips: [
      'Chỉ gửi SMS cho cảnh báo Critical',
      'Kiểm tra số dư Twilio định kỳ',
      'Sử dụng template ngắn gọn',
    ],
    relatedPages: ['Telegram Settings', 'Notification Preferences', 'Escalation Dashboard'],
  },
  {
    id: 'escalation-dashboard',
    title: 'Escalation Dashboard',
    icon: <AlertTriangle className="h-5 w-5" />,
    description: 'Dashboard theo dõi escalation cảnh báo.',
    purpose: 'Theo dõi và quản lý quy trình escalation khi cảnh báo không được xử lý kịp thời.',
    benefits: [
      'Không bỏ sót cảnh báo quan trọng',
      'Tự động escalate theo thời gian',
      'Theo dõi SLA xử lý cảnh báo',
      'Báo cáo hiệu suất xử lý',
    ],
    features: [
      'Danh sách cảnh báo đang escalate',
      'Timeline escalation',
      'Cấu hình quy tắc escalation',
      'Thống kê SLA',
      'Báo cáo escalation theo thời gian',
    ],
    howToUse: [
      'Truy cập menu IoT → Escalation Dashboard',
      'Xem danh sách cảnh báo đang escalate',
      'Click vào cảnh báo để xem chi tiết',
      'Xử lý cảnh báo để dừng escalation',
      'Xem báo cáo SLA ở tab Statistics',
    ],
    tips: [
      'Thiết lập escalation phù hợp với quy trình',
      'Gán đúng người nhận escalation',
      'Review SLA định kỳ để cải thiện',
    ],
    relatedPages: ['Alarm Management', 'Notification Preferences', 'Work Orders'],
  },
  {
    id: 'auto-resolve-settings',
    title: 'Auto-resolve Settings',
    icon: <Zap className="h-5 w-5" />,
    description: 'Cấu hình tự động resolve cảnh báo.',
    purpose: 'Thiết lập quy tắc tự động resolve cảnh báo khi giá trị trở về bình thường.',
    benefits: [
      'Giảm công việc thủ công',
      'Cảnh báo tự động đóng khi hết lỗi',
      'Tùy chỉnh điều kiện resolve',
      'Lưu lịch sử auto-resolve',
    ],
    features: [
      'Bật/tắt auto-resolve',
      'Cấu hình thời gian chờ',
      'Điều kiện resolve theo measurement',
      'Exclude một số loại cảnh báo',
      'Log auto-resolve actions',
    ],
    howToUse: [
      'Truy cập menu IoT → Auto-resolve Settings',
      'Bật tính năng Auto-resolve',
      'Cấu hình thời gian chờ (vd: 5 phút)',
      'Chọn loại cảnh báo áp dụng',
      'Lưu cấu hình',
    ],
    tips: [
      'Không auto-resolve cảnh báo Critical',
      'Đặt thời gian chờ phù hợp',
      'Review log để phát hiện vấn đề',
    ],
    relatedPages: ['Alarm Management', 'Alarm Threshold Config', 'Escalation Dashboard'],
  },
  {
    id: 'latency-monitoring',
    title: 'Latency Monitoring',
    icon: <Activity className="h-5 w-5" />,
    description: 'Giám sát độ trễ kết nối IoT.',
    purpose: 'Theo dõi và phân tích độ trễ trong việc thu thập dữ liệu từ thiết bị IoT.',
    benefits: [
      'Phát hiện sớm vấn đề kết nối',
      'Đo lường hiệu suất hệ thống',
      'Tối ưu hóa cấu hình mạng',
      'Báo cáo SLA về độ trễ',
    ],
    features: [
      'Biểu đồ latency realtime',
      'Thống kê Min/Max/Avg latency',
      'Cảnh báo khi latency cao',
      'So sánh latency giữa các gateway',
      'Export báo cáo latency',
    ],
    howToUse: [
      'Truy cập menu IoT → Latency Monitoring',
      'Xem biểu đồ latency tổng quan',
      'Chọn gateway hoặc thiết bị cụ thể',
      'Thiết lập ngưỡng cảnh báo latency',
      'Export báo cáo nếu cần',
    ],
    tips: [
      'Latency < 100ms là tốt',
      'Kiểm tra mạng nếu latency cao đột ngột',
      'So sánh với baseline để phát hiện bất thường',
    ],
    relatedPages: ['IoT Gateway Config', 'IoT Realtime Dashboard', 'Factory Floor Plan'],
  },
];

// Video categories
const videoCategories = [
  { id: 'all', label: 'Tất cả', icon: <Video className="h-4 w-4" /> },
  { id: 'overview', label: 'Tổng quan', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'connections', label: 'Kết nối', icon: <Network className="h-4 w-4" /> },
  { id: 'alerts', label: 'Cảnh báo', icon: <Bell className="h-4 w-4" /> },
  { id: 'monitoring', label: 'Giám sát', icon: <Activity className="h-4 w-4" /> },
  { id: 'floorplan', label: 'Sơ đồ', icon: <Factory className="h-4 w-4" /> },
  { id: 'maintenance', label: 'Bảo trì', icon: <Wrench className="h-4 w-4" /> },
  { id: 'advanced', label: 'Nâng cao', icon: <Settings className="h-4 w-4" /> },
];

// FAQ categories
const faqCategories = [
  { id: 'all', label: 'Tất cả', icon: <MessageCircleQuestion className="h-4 w-4" /> },
  { id: 'overview', label: 'Tổng quan', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'connections', label: 'Kết nối', icon: <Network className="h-4 w-4" /> },
  { id: 'alerts', label: 'Cảnh báo', icon: <Bell className="h-4 w-4" /> },
  { id: 'monitoring', label: 'Giám sát', icon: <Activity className="h-4 w-4" /> },
  { id: 'floorplan', label: 'Sơ đồ', icon: <Factory className="h-4 w-4" /> },
  { id: 'maintenance', label: 'Bảo trì', icon: <Wrench className="h-4 w-4" /> },
  { id: 'advanced', label: 'Nâng cao', icon: <Settings className="h-4 w-4" /> },
  { id: 'security', label: 'Bảo mật', icon: <Shield className="h-4 w-4" /> },
];

export default function IoTUserGuide() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [mainTab, setMainTab] = useState('guide');
  const [videoCategory, setVideoCategory] = useState('all');
  const [faqCategory, setFaqCategory] = useState('all');
  const [faqSearchQuery, setFaqSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: 'Tất cả', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'overview', label: 'Tổng quan', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'maintenance', label: 'Bảo trì', icon: <Wrench className="h-4 w-4" /> },
    { id: 'connections', label: 'Kết nối', icon: <Network className="h-4 w-4" /> },
    { id: 'config', label: 'Cấu hình', icon: <Settings className="h-4 w-4" /> },
  ];

  const getCategoryForSection = (id: string): string => {
    if (['iot-dashboard', 'device-management', 'alarm-management', 'iot-realtime-dashboard', 'sensor-dashboard', 'factory-floor-plan'].includes(id)) {
      return 'overview';
    }
    if (['work-orders', 'mttr-mtbf-report'].includes(id)) {
      return 'maintenance';
    }
    if (['iot-gateway', 'mqtt-connections'].includes(id)) {
      return 'connections';
    }
    return 'config';
  };

  const filteredSections = iotGuideSections.filter(section => {
    const matchesSearch = section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || getCategoryForSection(section.id) === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredVideos = useMemo(() => {
    return videoTutorials.filter(video => {
      const matchesCategory = videoCategory === 'all' || video.category === videoCategory;
      const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [videoCategory, searchQuery]);

  const filteredFaqs = useMemo(() => {
    return faqItems.filter(faq => {
      const matchesCategory = faqCategory === 'all' || faq.category === faqCategory;
      const matchesSearch = faq.question.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
        faq.tags.some(tag => tag.toLowerCase().includes(faqSearchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [faqCategory, faqSearchQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b shadow-sm">
        <div className="container py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
              <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Hướng dẫn sử dụng Hệ thống IoT
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Tài liệu chi tiết, video hướng dẫn và FAQ về các chức năng trong hệ thống IoT
              </p>
            </div>
          </div>

          {/* Main Tabs */}
          <Tabs value={mainTab} onValueChange={setMainTab} className="mt-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="guide" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Hướng dẫn
              </TabsTrigger>
              <TabsTrigger value="videos" className="gap-2">
                <Video className="h-4 w-4" />
                Video
              </TabsTrigger>
              <TabsTrigger value="faq" className="gap-2">
                <MessageCircleQuestion className="h-4 w-4" />
                FAQ
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="container py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{iotGuideSections.length}+</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Trang chức năng</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Video className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{videoTutorials.length}</p>
                <p className="text-sm text-green-600 dark:text-green-400">Video hướng dẫn</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <MessageCircleQuestion className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{faqItems.length}</p>
                <p className="text-sm text-purple-600 dark:text-purple-400">Câu hỏi FAQ</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <LineChart className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">Realtime</p>
                <p className="text-sm text-orange-600 dark:text-orange-400">Giám sát dữ liệu</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="container pb-12">
        {/* Guide Tab Content */}
        {mainTab === 'guide' && (
          <>
            {/* Search and Filter for Guide */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Tìm kiếm chức năng..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {categories.map(cat => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                    className="gap-2"
                  >
                    {cat.icon}
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {filteredSections.map((section) => (
                <Card key={section.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-700 border-b">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          {section.icon}
                        </div>
                        <div>
                          <CardTitle className="text-xl">{section.title}</CardTitle>
                          <CardDescription className="mt-1">{section.description}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {getCategoryForSection(section.id)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Tabs defaultValue="purpose" className="w-full">
                      <TabsList className="w-full justify-start rounded-none border-b bg-slate-50 dark:bg-slate-800 p-0 h-auto">
                        <TabsTrigger value="purpose" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-3">
                          <Target className="h-4 w-4 mr-2" />
                          Mục đích
                        </TabsTrigger>
                        <TabsTrigger value="benefits" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-3">
                          <Zap className="h-4 w-4 mr-2" />
                          Lợi ích
                        </TabsTrigger>
                        <TabsTrigger value="features" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-3">
                          <Database className="h-4 w-4 mr-2" />
                          Tính năng
                        </TabsTrigger>
                        <TabsTrigger value="howto" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-3">
                          <FileText className="h-4 w-4 mr-2" />
                          Cách sử dụng
                        </TabsTrigger>
                        <TabsTrigger value="tips" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-3">
                          <HelpCircle className="h-4 w-4 mr-2" />
                          Mẹo hay
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="purpose" className="p-6 m-0">
                        <div className="prose dark:prose-invert max-w-none">
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                            {section.purpose}
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent value="benefits" className="p-6 m-0">
                        <div className="grid md:grid-cols-2 gap-3">
                          {section.benefits.map((benefit, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                              <div className="p-1 bg-green-100 dark:bg-green-900 rounded">
                                <ChevronRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </div>
                              <span className="text-slate-700 dark:text-slate-300">{benefit}</span>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="features" className="p-6 m-0">
                        <div className="space-y-2">
                          {section.features.map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400">
                                {idx + 1}
                              </div>
                              <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="howto" className="p-6 m-0">
                        <div className="space-y-3">
                          {section.howToUse.map((step, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium shrink-0">
                                {idx + 1}
                              </div>
                              <p className="text-slate-700 dark:text-slate-300 pt-1">{step}</p>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="tips" className="p-6 m-0">
                        <div className="space-y-3">
                          {section.tips.map((tip, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                              <div className="p-1 bg-amber-100 dark:bg-amber-900 rounded">
                                <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                              </div>
                              <span className="text-slate-700 dark:text-slate-300">{tip}</span>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>

                    {/* Related Pages */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Link2 className="h-4 w-4" />
                        <span>Trang liên quan:</span>
                        <div className="flex gap-2 flex-wrap">
                          {section.relatedPages.map((page, idx) => (
                            <Badge key={idx} variant="secondary" className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700">
                              {page}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredSections.length === 0 && (
              <Card className="p-12 text-center">
                <Search className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">Không tìm thấy kết quả</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Thử tìm kiếm với từ khóa khác</p>
              </Card>
            )}
          </>
        )}

        {/* Videos Tab Content */}
        {mainTab === 'videos' && (
          <>
            {/* Search and Filter for Videos */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Tìm kiếm video..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {videoCategories.map(cat => (
                  <Button
                    key={cat.id}
                    variant={videoCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVideoCategory(cat.id)}
                    className="gap-2"
                  >
                    {cat.icon}
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Video Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video) => (
                <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Video Thumbnail */}
                  <div className="relative aspect-video bg-slate-900 group cursor-pointer">
                    <img
                      src={`https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="h-8 w-8 text-white ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </div>
                    <Badge className="absolute top-2 left-2" variant="secondary">
                      {videoCategories.find(c => c.id === video.category)?.label}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2">
                      {video.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                      {video.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {video.relatedFeatures.slice(0, 2).map((feature, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {video.relatedFeatures.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{video.relatedFeatures.length - 2}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3 gap-2"
                      onClick={() => window.open(`https://www.youtube.com/watch?v=${video.youtubeId}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Xem trên YouTube
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredVideos.length === 0 && (
              <Card className="p-12 text-center">
                <Video className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">Không tìm thấy video</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Thử tìm kiếm với từ khóa khác hoặc chọn danh mục khác</p>
              </Card>
            )}
          </>
        )}

        {/* FAQ Tab Content */}
        {mainTab === 'faq' && (
          <>
            {/* Search and Filter for FAQ */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Tìm kiếm câu hỏi..."
                  value={faqSearchQuery}
                  onChange={(e) => setFaqSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {faqCategories.map(cat => (
                  <Button
                    key={cat.id}
                    variant={faqCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFaqCategory(cat.id)}
                    className="gap-2"
                  >
                    {cat.icon}
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* FAQ Accordion */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircleQuestion className="h-5 w-5" />
                  Câu hỏi thường gặp ({filteredFaqs.length})
                </CardTitle>
                <CardDescription>
                  Tìm câu trả lời cho các câu hỏi phổ biến về hệ thống IoT
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {filteredFaqs.map((faq, index) => (
                    <AccordionItem key={faq.id} value={faq.id}>
                      <AccordionTrigger className="text-left hover:no-underline">
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <span className="font-medium text-slate-900 dark:text-white">
                              {faq.question}
                            </span>
                            <div className="flex gap-1 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {faqCategories.find(c => c.id === faq.category)?.label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pl-11 pr-4 pb-2">
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                            {faq.answer}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-3">
                            {faq.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                {filteredFaqs.length === 0 && (
                  <div className="text-center py-12">
                    <MessageCircleQuestion className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">Không tìm thấy câu hỏi</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Thử tìm kiếm với từ khóa khác hoặc chọn danh mục khác</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Cần hỗ trợ thêm?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Bell className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" />
                    <h4 className="font-medium text-slate-900 dark:text-white">Liên hệ hỗ trợ</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Gửi ticket hỗ trợ kỹ thuật qua hệ thống
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <Video className="h-8 w-8 text-green-600 dark:text-green-400 mb-2" />
                    <h4 className="font-medium text-slate-900 dark:text-white">Video hướng dẫn</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Xem video hướng dẫn chi tiết từng chức năng
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <BookOpen className="h-8 w-8 text-purple-600 dark:text-purple-400 mb-2" />
                    <h4 className="font-medium text-slate-900 dark:text-white">Tài liệu API</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Tham khảo tài liệu API để tích hợp hệ thống
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-slate-800 border-t py-6">
        <div className="container text-center text-sm text-slate-500 dark:text-slate-400">
          <p>Hệ thống Tính toán CPK/SPC - Hướng dẫn sử dụng IoT</p>
          <p className="mt-1">Phiên bản 1.0 - Cập nhật: Tháng 1/2026</p>
        </div>
      </div>
    </div>
  );
}
