import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, Code, Copy, Check, Key, Send, AlertCircle, CheckCircle2, 
  Webhook, Factory, Building2, MessageSquare, Database 
} from "lucide-react";
import { toast } from "sonner";

const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  const [copied, setCopied] = useState(false);
  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Đã copy vào clipboard");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={copyToClipboard}>
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </Button>
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
};

export default function MachineApiDocumentation() {
  const baseUrl = window.location.origin;

  const pythonExample = `import requests
import json

API_KEY = "your-api-key-here"
BASE_URL = "${baseUrl}/api/machine"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Post inspection result với factory/workshop
inspection_data = {
    "serialNumber": "SN123456789",
    "machineId": "AVI-01",
    "workstationId": "WS-001",
    "productionLineId": "LINE-A",
    "productCode": "PROD-001",
    "factoryId": 1,              # ID nhà máy (tùy chọn)
    "factoryCode": "FAC-HN",     # Mã nhà máy (tùy chọn)
    "workshopId": 1,             # ID nhà xưởng (tùy chọn)
    "workshopCode": "WS-A1",     # Mã nhà xưởng (tùy chọn)
    "status": "pass",
    "measurements": [
        {
            "name": "dimension_x", 
            "value": 10.05, 
            "unit": "mm", 
            "usl": 10.1, 
            "lsl": 9.9,
            "remark": "Đo lần 1, điều kiện chuẩn"  # Ghi chú cho phép đo
        }
    ],
    "defects": [],
    "cycleTime": 250,
    "timestamp": "2024-01-09T10:30:00Z",
    "remark": "Kiểm tra ca sáng, máy hoạt động ổn định"  # Ghi chú tổng thể
}

response = requests.post(
    f"{BASE_URL}/inspection",
    headers=headers,
    json=inspection_data
)

print(response.json())`;

  const csharpExample = `using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class MachineApiClient
{
    private readonly HttpClient _client;
    private readonly string _baseUrl = "${baseUrl}/api/machine";
    
    public MachineApiClient(string apiKey)
    {
        _client = new HttpClient();
        _client.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
    }
    
    public async Task<string> PostInspectionAsync(InspectionData data)
    {
        var json = JsonSerializer.Serialize(data);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        
        var response = await _client.PostAsync($"{_baseUrl}/inspection", content);
        return await response.Content.ReadAsStringAsync();
    }
}

public class InspectionData
{
    public string SerialNumber { get; set; }
    public string MachineId { get; set; }
    public string WorkstationId { get; set; }
    public string ProductionLineId { get; set; }
    public string ProductCode { get; set; }
    public int? FactoryId { get; set; }        // ID nhà máy
    public string FactoryCode { get; set; }    // Mã nhà máy
    public int? WorkshopId { get; set; }       // ID nhà xưởng
    public string WorkshopCode { get; set; }   // Mã nhà xưởng
    public string Status { get; set; }
    public List<Measurement> Measurements { get; set; }
    public List<Defect> Defects { get; set; }
    public int CycleTime { get; set; }
    public DateTime Timestamp { get; set; }
    public string Remark { get; set; }         // Ghi chú
}

public class Measurement
{
    public string Name { get; set; }
    public double Value { get; set; }
    public string Unit { get; set; }
    public double Usl { get; set; }
    public double Lsl { get; set; }
    public string Remark { get; set; }         // Ghi chú cho phép đo
}`;

  const javascriptExample = `const API_KEY = "your-api-key-here";
const BASE_URL = "${baseUrl}/api/machine";

async function postInspection(data) {
  const response = await fetch(\`\${BASE_URL}/inspection\`, {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${API_KEY}\`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
  
  return await response.json();
}

// Example usage với factory/workshop
const inspectionData = {
  serialNumber: "SN123456789",
  machineId: "AVI-01",
  workstationId: "WS-001",
  productionLineId: "LINE-A",
  productCode: "PROD-001",
  factoryId: 1,              // ID nhà máy
  factoryCode: "FAC-HN",     // Mã nhà máy
  workshopId: 1,             // ID nhà xưởng
  workshopCode: "WS-A1",     // Mã nhà xưởng
  status: "pass",
  measurements: [
    { 
      name: "dimension_x", 
      value: 10.05, 
      unit: "mm", 
      usl: 10.1, 
      lsl: 9.9,
      remark: "Đo lần 1"     // Ghi chú cho phép đo
    }
  ],
  defects: [],
  cycleTime: 250,
  timestamp: new Date().toISOString(),
  remark: "Kiểm tra ca sáng"  // Ghi chú tổng thể
};

postInspection(inspectionData)
  .then(result => console.log(result))
  .catch(error => console.error(error));`;

  const curlExample = `curl -X POST "${baseUrl}/api/machine/inspection" \\
  -H "Authorization: Bearer your-api-key-here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "serialNumber": "SN123456789",
    "machineId": "AVI-01",
    "workstationId": "WS-001",
    "productionLineId": "LINE-A",
    "productCode": "PROD-001",
    "factoryId": 1,
    "factoryCode": "FAC-HN",
    "workshopId": 1,
    "workshopCode": "WS-A1",
    "status": "pass",
    "measurements": [
      {
        "name": "dimension_x", 
        "value": 10.05, 
        "unit": "mm", 
        "usl": 10.1, 
        "lsl": 9.9,
        "remark": "Đo lần 1"
      }
    ],
    "defects": [],
    "cycleTime": 250,
    "timestamp": "2024-01-09T10:30:00Z",
    "remark": "Kiểm tra ca sáng"
  }'`;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              Machine API Documentation
            </h1>
            <p className="text-muted-foreground mt-1">Hướng dẫn tích hợp API cho máy sản xuất</p>
          </div>
          <Badge variant="outline" className="text-sm">
            API Version 2.0
          </Badge>
        </div>

        {/* New Features Banner */}
        <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/20">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium">Tính năng mới trong API v2.0</p>
                <p className="text-sm text-muted-foreground">
                  Hỗ trợ cấu trúc phân cấp Factory → Workshop → ProductionLine và trường ghi chú (remark) cho mỗi điểm đo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="text-sm">Mục lục</CardTitle></CardHeader>
            <CardContent>
              <nav className="space-y-2 text-sm">
                <a href="#authentication" className="block text-muted-foreground hover:text-foreground">Authentication</a>
                <a href="#hierarchy" className="block text-muted-foreground hover:text-foreground">Cấu trúc phân cấp</a>
                <a href="#endpoints" className="block text-muted-foreground hover:text-foreground">Endpoints</a>
                <a href="#inspection" className="block text-muted-foreground hover:text-foreground pl-4">- Inspection</a>
                <a href="#measurement" className="block text-muted-foreground hover:text-foreground pl-4">- Measurement</a>
                <a href="#oee" className="block text-muted-foreground hover:text-foreground pl-4">- OEE Data</a>
                <a href="#batch" className="block text-muted-foreground hover:text-foreground pl-4">- Batch Upload</a>
                <a href="#remarks" className="block text-muted-foreground hover:text-foreground">Ghi chú (Remarks)</a>
                <a href="#examples" className="block text-muted-foreground hover:text-foreground">Code Examples</a>
                <a href="#errors" className="block text-muted-foreground hover:text-foreground">Error Handling</a>
                <a href="#webhooks" className="block text-muted-foreground hover:text-foreground">Webhooks</a>
              </nav>
            </CardContent>
          </Card>

          <div className="lg:col-span-3 space-y-6">
            <Card id="authentication">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />Authentication</CardTitle>
                <CardDescription>Xác thực API bằng API Key</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Tất cả các request đến API đều cần có API Key trong header:</p>
                <CodeBlock code={`Authorization: Bearer your-api-key-here`} language="text" />
                <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-500">Lưu ý bảo mật</p>
                      <p className="text-sm text-muted-foreground">Không chia sẻ API Key. Lưu trữ an toàn trong biến môi trường hoặc file cấu hình bảo mật.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Tạo API Key</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Đăng nhập vào hệ thống với quyền Admin</li>
                    <li>Vào menu Cài đặt → API Keys</li>
                    <li>Click "Tạo API Key mới"</li>
                    <li>Đặt tên và chọn quyền cho API Key</li>
                    <li>Copy và lưu trữ API Key an toàn</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* New: Hierarchy Structure */}
            <Card id="hierarchy">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />Cấu trúc phân cấp</CardTitle>
                <CardDescription>Factory → Workshop → ProductionLine → Workstation → Machine</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Hệ thống hỗ trợ cấu trúc phân cấp đầy đủ cho việc quản lý và theo dõi dữ liệu sản xuất:</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Factory className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">Factory (Nhà máy)</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Cấp cao nhất trong hệ thống. Mỗi nhà máy có mã riêng (factoryCode) và có thể chứa nhiều nhà xưởng.
                    </p>
                  </div>
                  
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Workshop (Nhà xưởng)</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Thuộc một nhà máy. Mỗi xưởng có mã riêng (workshopCode) và chứa các dây chuyền sản xuất.
                    </p>
                  </div>
                </div>

                <h4 className="font-medium mt-4">Các trường mới trong API:</h4>
                <CodeBlock code={`{
  "factoryId": number,        // ID nhà máy (tùy chọn)
  "factoryCode": "string",    // Mã nhà máy, ví dụ: "FAC-HN", "FAC-HCM"
  "workshopId": number,       // ID nhà xưởng (tùy chọn)
  "workshopCode": "string"    // Mã nhà xưởng, ví dụ: "WS-A1", "WS-B2"
}`} language="json" />

                <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-500">Tương thích ngược</p>
                      <p className="text-sm text-muted-foreground">
                        Các trường factory/workshop là tùy chọn. API vẫn hoạt động bình thường nếu không truyền các trường này.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card id="endpoints">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" />Endpoints</CardTitle>
                <CardDescription>Danh sách các endpoint API</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-lg border p-4" id="inspection">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-500">POST</Badge>
                      <code className="text-sm">/api/machine/inspection</code>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Gửi kết quả kiểm tra từ máy</p>
                    <h5 className="font-medium mb-2">Request Body:</h5>
                    <CodeBlock code={`{
  "serialNumber": "string",      // Mã serial sản phẩm (bắt buộc)
  "machineId": "string",         // Mã máy (bắt buộc)
  "workstationId": "string",     // Mã công trạm (bắt buộc)
  "productionLineId": "string",  // Mã dây chuyền (bắt buộc)
  "productCode": "string",       // Mã sản phẩm (bắt buộc)
  "factoryId": number,           // ID nhà máy (tùy chọn)
  "factoryCode": "string",       // Mã nhà máy (tùy chọn)
  "workshopId": number,          // ID nhà xưởng (tùy chọn)
  "workshopCode": "string",      // Mã nhà xưởng (tùy chọn)
  "status": "pass|fail|warning", // Kết quả kiểm tra (bắt buộc)
  "measurements": [              // Danh sách đo lường (tùy chọn)
    {
      "name": "string",
      "value": number,
      "unit": "string",
      "usl": number,
      "lsl": number,
      "remark": "string"         // Ghi chú cho phép đo
    }
  ],
  "defects": [                   // Danh sách lỗi (tùy chọn)
    {
      "type": "string",
      "severity": "low|medium|high|critical",
      "location": { "x": number, "y": number },
      "description": "string"
    }
  ],
  "cycleTime": number,           // Thời gian chu kỳ (ms)
  "timestamp": "ISO8601",        // Thời điểm kiểm tra
  "remark": "string"             // Ghi chú tổng thể (tùy chọn)
}`} language="json" />
                  </div>

                  <div className="rounded-lg border p-4" id="measurement">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-500">POST</Badge>
                      <code className="text-sm">/api/machine/measurement</code>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Gửi dữ liệu đo lường đơn lẻ</p>
                    <CodeBlock code={`{
  "serialNumber": "string",
  "machineId": "string",
  "measurementName": "string",
  "value": number,
  "unit": "string",
  "usl": number,
  "lsl": number,
  "factoryId": number,           // ID nhà máy (tùy chọn)
  "workshopId": number,          // ID nhà xưởng (tùy chọn)
  "timestamp": "ISO8601",
  "remark": "string"             // Ghi chú (tùy chọn)
}`} language="json" />
                  </div>

                  <div className="rounded-lg border p-4" id="oee">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-500">POST</Badge>
                      <code className="text-sm">/api/machine/oee</code>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Gửi dữ liệu OEE từ máy</p>
                    <CodeBlock code={`{
  "machineId": "string",
  "factoryId": number,           // ID nhà máy (tùy chọn)
  "workshopId": number,          // ID nhà xưởng (tùy chọn)
  "availability": number,        // 0-100
  "performance": number,         // 0-100
  "quality": number,             // 0-100
  "oee": number,                 // 0-100 (hoặc tính từ 3 chỉ số trên)
  "plannedProductionTime": number,
  "actualRunTime": number,
  "totalCount": number,
  "goodCount": number,
  "timestamp": "ISO8601",
  "remark": "string"             // Ghi chú (tùy chọn)
}`} language="json" />
                  </div>

                  <div className="rounded-lg border p-4" id="batch">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-500">POST</Badge>
                      <code className="text-sm">/api/machine/batch</code>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Gửi nhiều kết quả kiểm tra cùng lúc (tối đa 100)</p>
                    <CodeBlock code={`{
  "inspections": [
    { /* inspection object với factory/workshop fields */ },
    { /* inspection object */ }
  ]
}`} language="json" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* New: Remarks Section */}
            <Card id="remarks">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />Ghi chú (Remarks)</CardTitle>
                <CardDescription>Thêm ghi chú cho các điểm đo và kết quả kiểm tra</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Hệ thống hỗ trợ thêm ghi chú ở nhiều cấp độ khác nhau:</p>
                
                <div className="space-y-3">
                  <div className="rounded-lg border p-4">
                    <h5 className="font-medium mb-2">1. Ghi chú cấp Inspection</h5>
                    <p className="text-sm text-muted-foreground mb-2">
                      Ghi chú tổng thể cho một lần kiểm tra. Ví dụ: điều kiện môi trường, ca làm việc, người thực hiện.
                    </p>
                    <CodeBlock code={`{
  "remark": "Kiểm tra ca sáng, nhiệt độ 25°C, độ ẩm 60%"
}`} language="json" />
                  </div>
                  
                  <div className="rounded-lg border p-4">
                    <h5 className="font-medium mb-2">2. Ghi chú cấp Measurement</h5>
                    <p className="text-sm text-muted-foreground mb-2">
                      Ghi chú cho từng phép đo riêng lẻ. Ví dụ: lý do giá trị bất thường, điều kiện đo đặc biệt.
                    </p>
                    <CodeBlock code={`{
  "measurements": [
    {
      "name": "dimension_x",
      "value": 10.05,
      "remark": "Đo lại lần 2 do giá trị lần 1 bất thường"
    }
  ]
}`} language="json" />
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-500">Lợi ích của ghi chú</p>
                      <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                        <li>• Truy xuất nguồn gốc dữ liệu dễ dàng</li>
                        <li>• Phân tích nguyên nhân khi có vấn đề</li>
                        <li>• Tài liệu hóa quy trình kiểm tra</li>
                        <li>• Hỗ trợ audit và compliance</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card id="examples">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5" />Code Examples</CardTitle>
                <CardDescription>Ví dụ code cho các ngôn ngữ phổ biến</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="python">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="python">Python</TabsTrigger>
                    <TabsTrigger value="csharp">C#</TabsTrigger>
                    <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                  </TabsList>
                  <TabsContent value="python" className="mt-4"><CodeBlock code={pythonExample} language="python" /></TabsContent>
                  <TabsContent value="csharp" className="mt-4"><CodeBlock code={csharpExample} language="csharp" /></TabsContent>
                  <TabsContent value="javascript" className="mt-4"><CodeBlock code={javascriptExample} language="javascript" /></TabsContent>
                  <TabsContent value="curl" className="mt-4"><CodeBlock code={curlExample} language="bash" /></TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card id="errors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5" />Error Handling</CardTitle>
                <CardDescription>Xử lý lỗi và mã trạng thái</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-lg border">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b"><th className="p-3 text-left">Status Code</th><th className="p-3 text-left">Mô tả</th></tr></thead>
                      <tbody>
                        <tr className="border-b"><td className="p-3"><Badge className="bg-green-500">200</Badge></td><td className="p-3">Thành công</td></tr>
                        <tr className="border-b"><td className="p-3"><Badge className="bg-yellow-500">400</Badge></td><td className="p-3">Dữ liệu không hợp lệ</td></tr>
                        <tr className="border-b"><td className="p-3"><Badge className="bg-red-500">401</Badge></td><td className="p-3">Chưa xác thực hoặc API Key không hợp lệ</td></tr>
                        <tr className="border-b"><td className="p-3"><Badge className="bg-red-500">403</Badge></td><td className="p-3">Không có quyền truy cập</td></tr>
                        <tr className="border-b"><td className="p-3"><Badge className="bg-red-500">429</Badge></td><td className="p-3">Vượt quá giới hạn request</td></tr>
                        <tr><td className="p-3"><Badge className="bg-red-500">500</Badge></td><td className="p-3">Lỗi server</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <h4 className="font-medium">Response Format:</h4>
                  <CodeBlock code={`{
  "success": boolean,
  "data": { /* response data */ },
  "error": {
    "code": "string",
    "message": "string",
    "details": { /* additional info */ }
  }
}`} language="json" />
                </div>
              </CardContent>
            </Card>

            <Card id="webhooks">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5" />Webhooks</CardTitle>
                <CardDescription>Nhận thông báo tự động khi có sự kiện</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Hệ thống có thể gửi thông báo đến URL của bạn khi có các sự kiện sau:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Phát hiện lỗi sản phẩm (defect detected)</li>
                  <li>CPK dưới ngưỡng cảnh báo</li>
                  <li>OEE giảm đột ngột</li>
                  <li>Máy gặp sự cố</li>
                </ul>
                <h4 className="font-medium">Webhook Payload:</h4>
                <CodeBlock code={`{
  "event": "inspection.failed",
  "timestamp": "2024-01-09T10:30:00Z",
  "data": {
    "serialNumber": "SN123456789",
    "machineId": "AVI-01",
    "factoryCode": "FAC-HN",
    "workshopCode": "WS-A1",
    "status": "fail",
    "defects": [...],
    "remark": "Kiểm tra ca sáng"
  }
}`} language="json" />
                <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-500">Cấu hình Webhook</p>
                      <p className="text-sm text-muted-foreground">Vào menu Cài đặt → Webhooks để cấu hình URL nhận thông báo và chọn các sự kiện cần theo dõi.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
