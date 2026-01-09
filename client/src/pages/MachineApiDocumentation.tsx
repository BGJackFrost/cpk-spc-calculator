import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileText, Code, Copy, Check, Key, Send, AlertCircle, CheckCircle2, Webhook, Terminal, Braces } from "lucide-react";
import { toast } from "sonner";

const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  const [copied, setCopied] = useState(false);
  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Da copy vao clipboard");
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

# Post inspection result
inspection_data = {
    "serialNumber": "SN123456789",
    "machineId": "AVI-01",
    "workstationId": "WS-001",
    "productionLineId": "LINE-A",
    "productCode": "PROD-001",
    "status": "pass",  # pass, fail, warning
    "measurements": [
        {"name": "dimension_x", "value": 10.05, "unit": "mm", "usl": 10.1, "lsl": 9.9},
        {"name": "dimension_y", "value": 5.02, "unit": "mm", "usl": 5.1, "lsl": 4.9}
    ],
    "defects": [],
    "cycleTime": 250,
    "timestamp": "2024-01-09T10:30:00Z"
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
    public string Status { get; set; }
    public List<Measurement> Measurements { get; set; }
    public List<Defect> Defects { get; set; }
    public int CycleTime { get; set; }
    public DateTime Timestamp { get; set; }
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

// Example usage
const inspectionData = {
  serialNumber: "SN123456789",
  machineId: "AVI-01",
  workstationId: "WS-001",
  productionLineId: "LINE-A",
  productCode: "PROD-001",
  status: "pass",
  measurements: [
    { name: "dimension_x", value: 10.05, unit: "mm", usl: 10.1, lsl: 9.9 }
  ],
  defects: [],
  cycleTime: 250,
  timestamp: new Date().toISOString()
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
    "status": "pass",
    "measurements": [
      {"name": "dimension_x", "value": 10.05, "unit": "mm", "usl": 10.1, "lsl": 9.9}
    ],
    "defects": [],
    "cycleTime": 250,
    "timestamp": "2024-01-09T10:30:00Z"
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
            <p className="text-muted-foreground mt-1">Huong dan tich hop API cho may san xuat</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="text-sm">Muc luc</CardTitle></CardHeader>
            <CardContent>
              <nav className="space-y-2 text-sm">
                <a href="#authentication" className="block text-muted-foreground hover:text-foreground">Authentication</a>
                <a href="#endpoints" className="block text-muted-foreground hover:text-foreground">Endpoints</a>
                <a href="#inspection" className="block text-muted-foreground hover:text-foreground pl-4">- Inspection</a>
                <a href="#measurement" className="block text-muted-foreground hover:text-foreground pl-4">- Measurement</a>
                <a href="#oee" className="block text-muted-foreground hover:text-foreground pl-4">- OEE Data</a>
                <a href="#batch" className="block text-muted-foreground hover:text-foreground pl-4">- Batch Upload</a>
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
                <CardDescription>Xac thuc API bang API Key</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Tat ca cac request den API deu can co API Key trong header:</p>
                <CodeBlock code={`Authorization: Bearer your-api-key-here`} language="text" />
                <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-500">Luu y bao mat</p>
                      <p className="text-sm text-muted-foreground">Khong chia se API Key. Luu tru an toan trong bien moi truong hoac file cau hinh bao mat.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Tao API Key</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Dang nhap vao he thong voi quyen Admin</li>
                    <li>Vao menu Cai dat &gt; API Keys</li>
                    <li>Click "Tao API Key moi"</li>
                    <li>Dat ten va chon quyen cho API Key</li>
                    <li>Copy va luu tru API Key an toan</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            <Card id="endpoints">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" />Endpoints</CardTitle>
                <CardDescription>Danh sach cac endpoint API</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-lg border p-4" id="inspection">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-500">POST</Badge>
                      <code className="text-sm">/api/machine/inspection</code>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Gui ket qua kiem tra tu may</p>
                    <h5 className="font-medium mb-2">Request Body:</h5>
                    <CodeBlock code={`{
  "serialNumber": "string",      // Ma serial san pham (bat buoc)
  "machineId": "string",         // Ma may (bat buoc)
  "workstationId": "string",     // Ma cong tram (bat buoc)
  "productionLineId": "string",  // Ma day chuyen (bat buoc)
  "productCode": "string",       // Ma san pham (bat buoc)
  "status": "pass|fail|warning", // Ket qua kiem tra (bat buoc)
  "measurements": [              // Danh sach do luong (tuy chon)
    {
      "name": "string",
      "value": number,
      "unit": "string",
      "usl": number,
      "lsl": number
    }
  ],
  "defects": [                   // Danh sach loi (tuy chon)
    {
      "type": "string",
      "severity": "low|medium|high|critical",
      "location": { "x": number, "y": number },
      "description": "string"
    }
  ],
  "cycleTime": number,           // Thoi gian chu ky (ms)
  "timestamp": "ISO8601"         // Thoi diem kiem tra
}`} language="json" />
                  </div>

                  <div className="rounded-lg border p-4" id="measurement">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-500">POST</Badge>
                      <code className="text-sm">/api/machine/measurement</code>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Gui du lieu do luong don le</p>
                    <CodeBlock code={`{
  "serialNumber": "string",
  "machineId": "string",
  "measurementName": "string",
  "value": number,
  "unit": "string",
  "usl": number,
  "lsl": number,
  "timestamp": "ISO8601"
}`} language="json" />
                  </div>

                  <div className="rounded-lg border p-4" id="oee">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-500">POST</Badge>
                      <code className="text-sm">/api/machine/oee</code>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Gui du lieu OEE tu may</p>
                    <CodeBlock code={`{
  "machineId": "string",
  "availability": number,    // 0-100
  "performance": number,     // 0-100
  "quality": number,         // 0-100
  "oee": number,            // 0-100 (hoac tinh tu 3 chi so tren)
  "plannedProductionTime": number,
  "actualRunTime": number,
  "totalCount": number,
  "goodCount": number,
  "timestamp": "ISO8601"
}`} language="json" />
                  </div>

                  <div className="rounded-lg border p-4" id="batch">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-500">POST</Badge>
                      <code className="text-sm">/api/machine/batch</code>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Gui nhieu ket qua kiem tra cung luc (toi da 100)</p>
                    <CodeBlock code={`{
  "inspections": [
    { /* inspection object */ },
    { /* inspection object */ }
  ]
}`} language="json" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card id="examples">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5" />Code Examples</CardTitle>
                <CardDescription>Vi du code cho cac ngon ngu pho bien</CardDescription>
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
                <CardDescription>Xu ly loi va ma trang thai</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-lg border">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b"><th className="p-3 text-left">Status Code</th><th className="p-3 text-left">Mo ta</th></tr></thead>
                      <tbody>
                        <tr className="border-b"><td className="p-3"><Badge className="bg-green-500">200</Badge></td><td className="p-3">Thanh cong</td></tr>
                        <tr className="border-b"><td className="p-3"><Badge className="bg-yellow-500">400</Badge></td><td className="p-3">Du lieu khong hop le</td></tr>
                        <tr className="border-b"><td className="p-3"><Badge className="bg-red-500">401</Badge></td><td className="p-3">Chua xac thuc hoac API Key khong hop le</td></tr>
                        <tr className="border-b"><td className="p-3"><Badge className="bg-red-500">403</Badge></td><td className="p-3">Khong co quyen truy cap</td></tr>
                        <tr className="border-b"><td className="p-3"><Badge className="bg-red-500">429</Badge></td><td className="p-3">Vuot qua gioi han request</td></tr>
                        <tr><td className="p-3"><Badge className="bg-red-500">500</Badge></td><td className="p-3">Loi server</td></tr>
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
                <CardDescription>Nhan thong bao tu dong khi co su kien</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>He thong co the gui thong bao den URL cua ban khi co cac su kien sau:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Phat hien loi san pham (defect detected)</li>
                  <li>CPK duoi nguong canh bao</li>
                  <li>OEE giam dot ngot</li>
                  <li>May gap su co</li>
                </ul>
                <h4 className="font-medium">Webhook Payload:</h4>
                <CodeBlock code={`{
  "event": "inspection.failed",
  "timestamp": "2024-01-09T10:30:00Z",
  "data": {
    "serialNumber": "SN123456789",
    "machineId": "AVI-01",
    "status": "fail",
    "defects": [...]
  }
}`} language="json" />
                <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-500">Cau hinh Webhook</p>
                      <p className="text-sm text-muted-foreground">Vao menu Cai dat &gt; Webhooks de cau hinh URL nhan thong bao va chon cac su kien can theo doi.</p>
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
