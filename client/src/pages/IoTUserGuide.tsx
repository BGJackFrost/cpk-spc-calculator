import { useState } from 'react';
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
  Radio,
  Search,
  Server,
  Settings,
  Shield,
  Smartphone,
  Target,
  Timer,
  Wrench,
  Zap,
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
      'Sử dụng tính năng tự động gán để tiết kiệm thời gian',
    ],
    relatedPages: ['Device Management', 'Alarm Management', 'MTTR/MTBF Report'],
  },
  {
    id: 'mttr-mtbf-report',
    title: 'MTTR/MTBF Report',
    icon: <LineChart className="h-5 w-5" />,
    description: 'Báo cáo chỉ số MTTR (Mean Time To Repair) và MTBF (Mean Time Between Failures).',
    purpose: 'Phân tích hiệu suất bảo trì và độ tin cậy của thiết bị thông qua các chỉ số MTTR/MTBF.',
    benefits: [
      'Đánh giá hiệu quả công tác bảo trì',
      'Dự đoán thời điểm cần bảo trì',
      'So sánh độ tin cậy giữa các thiết bị',
      'Cải thiện quy trình bảo trì',
    ],
    features: [
      'Biểu đồ MTTR/MTBF theo thời gian',
      'So sánh giữa các thiết bị/dây chuyền',
      'Tính toán Availability',
      'Export báo cáo Excel/PDF',
      'Lập lịch gửi báo cáo tự động',
    ],
    howToUse: [
      'Truy cập menu IoT → MTTR/MTBF Report',
      'Chọn thiết bị hoặc dây chuyền cần xem',
      'Chọn khoảng thời gian phân tích',
      'Xem biểu đồ và các chỉ số KPI',
      'Export báo cáo nếu cần',
    ],
    tips: [
      'MTTR thấp = thời gian sửa chữa nhanh',
      'MTBF cao = thiết bị ít hỏng hóc',
      'Availability = MTBF / (MTBF + MTTR)',
    ],
    relatedPages: ['Work Orders', 'MTTR/MTBF Comparison', 'MTTR/MTBF Prediction'],
  },
  // IoT Connections Group
  {
    id: 'iot-gateway',
    title: 'IoT Gateway Config',
    icon: <Server className="h-5 w-5" />,
    description: 'Cấu hình các gateway kết nối với thiết bị IoT.',
    purpose: 'Quản lý và cấu hình các gateway làm cầu nối giữa thiết bị IoT và hệ thống.',
    benefits: [
      'Quản lý tập trung các gateway',
      'Hỗ trợ nhiều giao thức: MQTT, OPC-UA, Modbus, HTTP',
      'Giám sát trạng thái kết nối',
      'Cấu hình data points thu thập',
    ],
    features: [
      'Danh sách gateways với trạng thái',
      'Form thêm gateway mới',
      'Test connection trước khi lưu',
      'Cấu hình data points cho mỗi gateway',
      'Tab Giám sát Realtime',
    ],
    howToUse: [
      'Truy cập menu IoT → IoT Gateway Config',
      'Click "Thêm Gateway" để thêm mới',
      'Chọn loại: OPC-UA, Modbus, MQTT, HTTP',
      'Nhập thông tin kết nối: IP, Port, Credentials',
      'Click "Test Connection" để kiểm tra',
    ],
    tips: [
      'Luôn test connection trước khi lưu',
      'Đặt tên gateway theo vị trí hoặc chức năng',
      'Cấu hình data points phù hợp với nhu cầu',
    ],
    relatedPages: ['MQTT Connections', 'OPC-UA Connections', 'Device Management'],
  },
  {
    id: 'mqtt-connections',
    title: 'MQTT Connections',
    icon: <Radio className="h-5 w-5" />,
    description: 'Quản lý kết nối MQTT Broker cho hệ thống IoT.',
    purpose: 'Cấu hình và quản lý kết nối đến MQTT Broker để thu thập dữ liệu từ thiết bị IoT.',
    benefits: [
      'Kết nối với nhiều MQTT Broker',
      'Subscribe nhiều topics cùng lúc',
      'Xem messages realtime',
      'Hỗ trợ TLS/SSL bảo mật',
    ],
    features: [
      'Danh sách MQTT connections',
      'Form cấu hình broker: Host, Port, Username, Password',
      'Quản lý topics subscribe',
      'Xem messages realtime',
      'Test connection và publish message',
    ],
    howToUse: [
      'Truy cập menu IoT → MQTT Connections',
      'Click "Add Connection" để thêm broker mới',
      'Nhập thông tin: Host, Port, Credentials',
      'Thêm các topics cần subscribe',
      'Click Connect để bắt đầu nhận dữ liệu',
    ],
    tips: [
      'Sử dụng TLS cho kết nối production',
      'Đặt QoS phù hợp với yêu cầu',
      'Sử dụng wildcard topics để subscribe nhiều sensors',
    ],
    relatedPages: ['IoT Gateway Config', 'IoT Realtime Dashboard', 'Sensor Dashboard'],
  },
  // IoT Config Group
  {
    id: 'alarm-threshold-config',
    title: 'Alarm Threshold Config',
    icon: <Target className="h-5 w-5" />,
    description: 'Cấu hình ngưỡng cảnh báo cho các phép đo.',
    purpose: 'Thiết lập ngưỡng Warning và Critical cho từng phép đo, tự động tạo cảnh báo khi vượt ngưỡng.',
    benefits: [
      'Tự động phát hiện giá trị bất thường',
      'Phân biệt mức độ Warning và Critical',
      'Cấu hình theo máy và fixture',
      'Áp dụng SPC Rules',
    ],
    features: [
      'Tab Ngưỡng: Cấu hình USL, LSL, CPK',
      'Tab SPC Rules: Áp dụng Western Electric Rules',
      'Tab Thông báo: Cấu hình kênh thông báo',
      'Hỗ trợ Global và theo máy/fixture',
      'Bộ lọc theo trạng thái',
    ],
    howToUse: [
      'Truy cập menu IoT → Alarm Threshold Config',
      'Click "Thêm cấu hình" để tạo ngưỡng mới',
      'Chọn Máy, Fixture (hoặc Global)',
      'Nhập Measurement Name',
      'Cấu hình ngưỡng Warning và Critical',
    ],
    tips: [
      'Warning = 80% của Critical để cảnh báo sớm',
      'Sử dụng CPK để đánh giá năng lực quy trình',
      'Áp dụng SPC Rules cho phát hiện xu hướng',
    ],
    relatedPages: ['Alarm Management', 'IoT Realtime Dashboard', 'Notification Preferences'],
  },
  {
    id: 'telegram-settings',
    title: 'Telegram Settings',
    icon: <Smartphone className="h-5 w-5" />,
    description: 'Cấu hình thông báo qua Telegram Bot.',
    purpose: 'Thiết lập Telegram Bot để nhận thông báo cảnh báo và báo cáo từ hệ thống.',
    benefits: [
      'Nhận thông báo tức thì qua Telegram',
      'Hỗ trợ nhiều nhóm/kênh',
      'Gửi báo cáo định kỳ',
      'Không cần cài đặt app riêng',
    ],
    features: [
      'Cấu hình Bot Token và Chat ID',
      'Test gửi message',
      'Chọn loại thông báo muốn nhận',
      'Lập lịch gửi báo cáo',
      'Quản lý nhiều cấu hình',
    ],
    howToUse: [
      'Tạo Bot trên Telegram qua @BotFather',
      'Lấy Bot Token và Chat ID',
      'Truy cập menu IoT → Telegram Settings',
      'Nhập Bot Token và Chat ID',
      'Click Test để kiểm tra',
    ],
    tips: [
      'Tạo group riêng cho từng loại thông báo',
      'Sử dụng Bot riêng cho production',
      'Lưu Bot Token an toàn, không chia sẻ',
    ],
    relatedPages: ['Notification Preferences', 'Alarm Management', 'MTTR/MTBF Report'],
  },
  {
    id: 'notification-preferences',
    title: 'Notification Preferences',
    icon: <Bell className="h-5 w-5" />,
    description: 'Cấu hình tùy chọn thông báo cho người dùng.',
    purpose: 'Cho phép người dùng tùy chỉnh loại thông báo muốn nhận và kênh nhận thông báo.',
    benefits: [
      'Tùy chỉnh theo nhu cầu cá nhân',
      'Tránh spam thông báo không cần thiết',
      'Chọn kênh phù hợp: Email, Telegram, SMS',
      'Thiết lập thời gian nhận thông báo',
    ],
    features: [
      'Bật/tắt từng loại thông báo',
      'Chọn kênh: Email, Telegram, SMS',
      'Thiết lập quiet hours',
      'Cấu hình escalation',
      'Preview thông báo',
    ],
    howToUse: [
      'Truy cập menu IoT → Notification Preferences',
      'Chọn loại thông báo muốn nhận',
      'Chọn kênh nhận thông báo',
      'Thiết lập quiet hours nếu cần',
      'Lưu cấu hình',
    ],
    tips: [
      'Bật Critical alerts cho tất cả kênh',
      'Sử dụng quiet hours ngoài giờ làm việc',
      'Cấu hình escalation cho cảnh báo quan trọng',
    ],
    relatedPages: ['Telegram Settings', 'SMS Settings', 'Escalation Dashboard'],
  },
  // Additional IoT Features
  {
    id: 'iot-unified-dashboard',
    title: 'Unified IoT Dashboard',
    icon: <Gauge className="h-5 w-5" />,
    description: 'Dashboard tổng hợp tất cả thông tin IoT trên một màn hình.',
    purpose: 'Cung cấp cái nhìn toàn diện về hệ thống IoT với tất cả thông tin quan trọng được hiển thị trên một dashboard duy nhất.',
    benefits: [
      'Xem tất cả thông tin IoT trên một màn hình',
      'Tùy chỉnh layout theo nhu cầu',
      'Widgets có thể kéo thả và resize',
      'Lưu cấu hình dashboard cá nhân',
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

export default function IoTUserGuide() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

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
                Tài liệu chi tiết về các chức năng trong hệ thống IoT
              </p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mt-6">
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
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">33+</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Trang chức năng</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Cpu className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">4</p>
                <p className="text-sm text-green-600 dark:text-green-400">Giao thức hỗ trợ</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">3</p>
                <p className="text-sm text-purple-600 dark:text-purple-400">Kênh thông báo</p>
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
