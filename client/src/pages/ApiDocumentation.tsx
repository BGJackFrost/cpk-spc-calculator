import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Download, 
  Search, 
  Server,
  Shield,
  Cpu,
  Database,
  Wifi,
  Brain,
  Key
} from "lucide-react";

interface ApiEndpoint {
  method: string;
  path: string;
  summary: string;
  tags: string[];
  description?: string;
}

const apiEndpoints: ApiEndpoint[] = [
  { method: "POST", path: "/spc.analyze", summary: "Phân tích dữ liệu SPC", tags: ["SPC"], description: "Thực hiện phân tích thống kê quy trình" },
  { method: "POST", path: "/spc.calculateCpk", summary: "Tính toán chỉ số CPK", tags: ["CPK"], description: "Tính toán chỉ số năng lực quy trình" },
  { method: "GET", path: "/iotDashboard.listDevices", summary: "Danh sách thiết bị IoT", tags: ["IoT"], description: "Lấy danh sách thiết bị IoT" },
  { method: "POST", path: "/ai.detectAnomalies", summary: "Phát hiện bất thường", tags: ["AI"], description: "Sử dụng AI phát hiện bất thường" },
  { method: "POST", path: "/license.activate", summary: "Kích hoạt license", tags: ["License"], description: "Kích hoạt license key" },
  { method: "POST", path: "/erpIntegration.sync", summary: "Đồng bộ ERP", tags: ["ERP"], description: "Đồng bộ dữ liệu với ERP" },
  { method: "GET", path: "/security.getAuditLogs", summary: "Audit logs", tags: ["Security"], description: "Lấy nhật ký kiểm toán" },
];

const tagIcons: Record<string, React.ReactNode> = {
  SPC: <Database className="h-4 w-4" />,
  CPK: <Cpu className="h-4 w-4" />,
  IoT: <Wifi className="h-4 w-4" />,
  AI: <Brain className="h-4 w-4" />,
  License: <Key className="h-4 w-4" />,
  ERP: <Server className="h-4 w-4" />,
  Security: <Shield className="h-4 w-4" />,
};

const methodColors: Record<string, string> = {
  GET: "bg-green-500",
  POST: "bg-blue-500",
  PUT: "bg-yellow-500",
  DELETE: "bg-red-500",
};

export default function ApiDocumentation() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  
  const filteredEndpoints = apiEndpoints.filter(endpoint => {
    const matchesSearch = searchQuery === "" || 
      endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === null || endpoint.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });
  
  const tags = Array.from(new Set(apiEndpoints.flatMap(e => e.tags)));
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">API Documentation</h1>
            <p className="text-muted-foreground mt-1">Tài liệu API cho hệ thống CPK/SPC Calculator v2.0</p>
          </div>
          <Button variant="outline" asChild>
            <a href="/api-docs/openapi.yaml" download>
              <Download className="h-4 w-4 mr-2" />
              Download OpenAPI
            </a>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{apiEndpoints.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">API Version</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2.0.0</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Base URL</CardTitle>
            </CardHeader>
            <CardContent>
              <code className="text-sm bg-muted px-2 py-1 rounded">/api/trpc</code>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Authentication</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">JWT / Cookie</Badge>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="endpoints" className="space-y-4">
          <TabsList>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="authentication">Authentication</TabsTrigger>
            <TabsTrigger value="errors">Error Codes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="endpoints" className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm endpoint..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button variant={selectedTag === null ? "default" : "outline"} size="sm" onClick={() => setSelectedTag(null)}>All</Button>
                {tags.map(tag => (
                  <Button key={tag} variant={selectedTag === tag ? "default" : "outline"} size="sm" onClick={() => setSelectedTag(tag)}>
                    {tagIcons[tag]}<span className="ml-1">{tag}</span>
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              {filteredEndpoints.map((endpoint, index) => (
                <Card key={index} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedEndpoint(expandedEndpoint === endpoint.path ? null : endpoint.path)}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Badge className={`${methodColors[endpoint.method]} text-white`}>{endpoint.method}</Badge>
                      <code className="font-mono text-sm flex-1">{endpoint.path}</code>
                      <span className="text-muted-foreground text-sm">{endpoint.summary}</span>
                    </div>
                    {expandedEndpoint === endpoint.path && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="authentication">
            <Card>
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
                <CardDescription>Hệ thống hỗ trợ hai phương thức xác thực</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">1. Cookie-based Authentication</h3>
                  <p className="text-sm text-muted-foreground">Sử dụng session cookie sau khi đăng nhập qua OAuth.</p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">2. Bearer Token Authentication</h3>
                  <p className="text-sm text-muted-foreground">Sử dụng JWT token trong header Authorization.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="errors">
            <Card>
              <CardHeader>
                <CardTitle>Error Codes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { code: "BAD_REQUEST", status: 400, description: "Request không hợp lệ" },
                    { code: "UNAUTHORIZED", status: 401, description: "Chưa xác thực" },
                    { code: "FORBIDDEN", status: 403, description: "Không có quyền" },
                    { code: "NOT_FOUND", status: 404, description: "Không tìm thấy" },
                    { code: "TOO_MANY_REQUESTS", status: 429, description: "Vượt quá giới hạn" },
                    { code: "INTERNAL_SERVER_ERROR", status: 500, description: "Lỗi server" },
                  ].map(error => (
                    <div key={error.code} className="flex items-center gap-4 p-3 bg-muted rounded">
                      <Badge variant="destructive">{error.status}</Badge>
                      <code className="font-mono text-sm">{error.code}</code>
                      <span className="text-muted-foreground text-sm">{error.description}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
