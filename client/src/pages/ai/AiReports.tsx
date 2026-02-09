import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, RefreshCw, Download, Brain, Plus, Calendar, Clock, Mail, Eye, Trash2, Edit, Play, Pause, CheckCircle, AlertTriangle } from "lucide-react";

// Mock reports data
// Mock data removed - mockReportsData (data comes from tRPC or is not yet implemented)

export default function AiReports() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [newReport, setNewReport] = useState({
    name: "",
    type: "spc",
    frequency: "daily",
    aiEnhanced: true,
    recipients: "",
  });

  const handleCreateReport = () => {
    toast({ title: "Thành công", description: "Đã tạo template báo cáo mới" });
    setIsCreateOpen(false);
    setNewReport({ name: "", type: "spc", frequency: "daily", aiEnhanced: true, recipients: "" });
  };

  const handleGenerateNow = (id: number) => {
    toast({ title: "Đang tạo báo cáo", description: "Báo cáo đang được AI tạo..." });
    setTimeout(() => {
      toast({ title: "Hoàn thành", description: "Báo cáo đã được tạo thành công" });
    }, 2000);
  };

  const handleDownload = (id: number) => {
    toast({ title: "Đang tải xuống", description: "Báo cáo đang được tải xuống..." });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500">Hoạt động</Badge>;
      case "paused": return <Badge className="bg-yellow-500">Tạm dừng</Badge>;
      case "completed": return <Badge className="bg-blue-500">Hoàn thành</Badge>;
      case "error": return <Badge className="bg-red-500">Lỗi</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "spc": return <Badge variant="outline" className="border-blue-500 text-blue-500">SPC</Badge>;
      case "oee": return <Badge variant="outline" className="border-green-500 text-green-500">OEE</Badge>;
      case "defect": return <Badge variant="outline" className="border-red-500 text-red-500">Defect</Badge>;
      case "ai": return <Badge variant="outline" className="border-purple-500 text-purple-500">AI</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-500" />
              AI Reports
            </h1>
            <p className="text-muted-foreground mt-1">Báo cáo tự động với AI insights</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />Làm mới
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Tạo báo cáo</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tạo template báo cáo mới</DialogTitle>
                  <DialogDescription>Cấu hình báo cáo tự động với AI</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Tên báo cáo</Label>
                    <Input value={newReport.name} onChange={(e) => setNewReport({ ...newReport, name: e.target.value })} placeholder="Báo cáo SPC hàng ngày" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Loại báo cáo</Label>
                      <Select value={newReport.type} onValueChange={(v) => setNewReport({ ...newReport, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="spc">SPC/CPK</SelectItem>
                          <SelectItem value="oee">OEE</SelectItem>
                          <SelectItem value="defect">Defect</SelectItem>
                          <SelectItem value="ai">AI Insights</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Tần suất</Label>
                      <Select value={newReport.frequency} onValueChange={(v) => setNewReport({ ...newReport, frequency: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Hàng ngày</SelectItem>
                          <SelectItem value="weekly">Hàng tuần</SelectItem>
                          <SelectItem value="monthly">Hàng tháng</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Email nhận báo cáo (phân cách bằng dấu phẩy)</Label>
                    <Input value={newReport.recipients} onChange={(e) => setNewReport({ ...newReport, recipients: e.target.value })} placeholder="user1@example.com, user2@example.com" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>AI Enhanced</Label>
                      <p className="text-sm text-muted-foreground">Thêm phân tích và insights từ AI</p>
                    </div>
                    <Switch checked={newReport.aiEnhanced} onCheckedChange={(v) => setNewReport({ ...newReport, aiEnhanced: v })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
                  <Button onClick={handleCreateReport}>Tạo báo cáo</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Tổng báo cáo</p>
              <p className="text-3xl font-bold">{mockReportsData.aiSummary.totalReports}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Tháng này</p>
              <p className="text-3xl font-bold">{mockReportsData.aiSummary.thisMonth}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Thời gian tạo TB</p>
              <p className="text-3xl font-bold">{mockReportsData.aiSummary.avgGenerationTime}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="pt-4">
              <p className="text-sm text-purple-700">AI Enhanced</p>
              <p className="text-3xl font-bold text-purple-800">{mockReportsData.aiSummary.aiEnhanced}%</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="w-5 h-5 text-blue-500" />AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {mockReportsData.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded bg-white">
                  {insight.type === "positive" && <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />}
                  {insight.type === "warning" && <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />}
                  {insight.type === "info" && <Brain className="w-4 h-4 text-blue-500 mt-0.5" />}
                  <span className="text-sm">{insight.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="templates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="recent">Báo cáo gần đây</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Templates báo cáo</CardTitle>
                <CardDescription>Quản lý các template báo cáo tự động</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên báo cáo</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Tần suất</TableHead>
                      <TableHead>Lần chạy cuối</TableHead>
                      <TableHead>Người nhận</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockReportsData.templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>{getTypeBadge(template.type)}</TableCell>
                        <TableCell>
                          {template.frequency === "daily" && "Hàng ngày"}
                          {template.frequency === "weekly" && "Hàng tuần"}
                          {template.frequency === "monthly" && "Hàng tháng"}
                        </TableCell>
                        <TableCell>{template.lastRun}</TableCell>
                        <TableCell>{template.recipients} người</TableCell>
                        <TableCell>{getStatusBadge(template.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleGenerateNow(template.id)}>
                              <Play className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Báo cáo gần đây</CardTitle>
                <CardDescription>Danh sách báo cáo đã được tạo</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên báo cáo</TableHead>
                      <TableHead>Thời gian tạo</TableHead>
                      <TableHead>Kích thước</TableHead>
                      <TableHead>Định dạng</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockReportsData.recentReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.name}</TableCell>
                        <TableCell>{report.generatedAt}</TableCell>
                        <TableCell>{report.size}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.format}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDownload(report.id)}>
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
