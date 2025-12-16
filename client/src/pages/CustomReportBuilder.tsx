import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Plus, Trash2, GripVertical, BarChart3, LineChart, PieChart, 
  Table, Download, Save, Eye, Settings, Layers, Calendar, Filter,
  ChevronUp, ChevronDown, Copy
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import {
  ResponsiveContainer, BarChart, Bar, LineChart as ReLineChart, Line,
  PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";

// Available data sources
const dataSources = [
  { id: "oee", name: "OEE Records", nameVi: "Dữ liệu OEE" },
  { id: "spc", name: "SPC/CPK Data", nameVi: "Dữ liệu SPC/CPK" },
  { id: "machines", name: "Machines", nameVi: "Máy móc" },
  { id: "maintenance", name: "Maintenance", nameVi: "Bảo trì" },
  { id: "alerts", name: "Alerts", nameVi: "Cảnh báo" },
  { id: "defects", name: "Defects", nameVi: "Lỗi sản phẩm" },
];

// Available fields per data source
const dataFields: Record<string, { id: string; name: string; nameVi: string; type: string }[]> = {
  oee: [
    { id: "machineId", name: "Machine ID", nameVi: "ID Máy", type: "number" },
    { id: "machineName", name: "Machine Name", nameVi: "Tên Máy", type: "string" },
    { id: "oee", name: "OEE (%)", nameVi: "OEE (%)", type: "number" },
    { id: "availability", name: "Availability (%)", nameVi: "Khả dụng (%)", type: "number" },
    { id: "performance", name: "Performance (%)", nameVi: "Hiệu suất (%)", type: "number" },
    { id: "quality", name: "Quality (%)", nameVi: "Chất lượng (%)", type: "number" },
    { id: "recordDate", name: "Date", nameVi: "Ngày", type: "date" },
  ],
  spc: [
    { id: "productCode", name: "Product Code", nameVi: "Mã SP", type: "string" },
    { id: "parameterName", name: "Parameter", nameVi: "Thông số", type: "string" },
    { id: "cpk", name: "CPK", nameVi: "CPK", type: "number" },
    { id: "cp", name: "CP", nameVi: "CP", type: "number" },
    { id: "mean", name: "Mean", nameVi: "Trung bình", type: "number" },
    { id: "stdDev", name: "Std Dev", nameVi: "Độ lệch chuẩn", type: "number" },
  ],
  machines: [
    { id: "id", name: "ID", nameVi: "ID", type: "number" },
    { id: "name", name: "Name", nameVi: "Tên", type: "string" },
    { id: "code", name: "Code", nameVi: "Mã", type: "string" },
    { id: "status", name: "Status", nameVi: "Trạng thái", type: "string" },
    { id: "productionLine", name: "Production Line", nameVi: "Dây chuyền", type: "string" },
  ],
  maintenance: [
    { id: "machineId", name: "Machine ID", nameVi: "ID Máy", type: "number" },
    { id: "type", name: "Type", nameVi: "Loại", type: "string" },
    { id: "scheduledDate", name: "Scheduled Date", nameVi: "Ngày lên lịch", type: "date" },
    { id: "completedDate", name: "Completed Date", nameVi: "Ngày hoàn thành", type: "date" },
    { id: "status", name: "Status", nameVi: "Trạng thái", type: "string" },
  ],
  alerts: [
    { id: "id", name: "ID", nameVi: "ID", type: "number" },
    { id: "type", name: "Type", nameVi: "Loại", type: "string" },
    { id: "severity", name: "Severity", nameVi: "Mức độ", type: "string" },
    { id: "message", name: "Message", nameVi: "Nội dung", type: "string" },
    { id: "createdAt", name: "Created At", nameVi: "Thời gian", type: "date" },
  ],
  defects: [
    { id: "productCode", name: "Product Code", nameVi: "Mã SP", type: "string" },
    { id: "defectType", name: "Defect Type", nameVi: "Loại lỗi", type: "string" },
    { id: "quantity", name: "Quantity", nameVi: "Số lượng", type: "number" },
    { id: "date", name: "Date", nameVi: "Ngày", type: "date" },
  ],
};

// Chart types
const chartTypes = [
  { id: "bar", name: "Bar Chart", nameVi: "Biểu đồ cột", icon: BarChart3 },
  { id: "line", name: "Line Chart", nameVi: "Biểu đồ đường", icon: LineChart },
  { id: "pie", name: "Pie Chart", nameVi: "Biểu đồ tròn", icon: PieChart },
  { id: "table", name: "Table", nameVi: "Bảng dữ liệu", icon: Table },
];

interface ReportSection {
  id: string;
  type: "chart" | "table" | "text";
  chartType?: "bar" | "line" | "pie";
  title: string;
  dataSource: string;
  fields: string[];
  filters: { field: string; operator: string; value: string }[];
  groupBy?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface ReportConfig {
  name: string;
  description: string;
  dateRange: { start: string; end: string };
  sections: ReportSection[];
}

// Sample data for preview
const sampleData = [
  { name: "CNC-001", oee: 85, availability: 90, performance: 95, quality: 99 },
  { name: "CNC-002", oee: 78, availability: 85, performance: 92, quality: 98 },
  { name: "LATHE-001", oee: 82, availability: 88, performance: 93, quality: 99 },
  { name: "LATHE-002", oee: 75, availability: 82, performance: 91, quality: 97 },
  { name: "MILL-001", oee: 88, availability: 92, performance: 96, quality: 99 },
];

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function CustomReportBuilder() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("design");
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    name: "",
    description: "",
    dateRange: { start: "", end: "" },
    sections: [],
  });
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const addSection = (type: ReportSection["type"], chartType?: ReportSection["chartType"]) => {
    const newSection: ReportSection = {
      id: `section_${Date.now()}`,
      type,
      chartType,
      title: language === "vi" ? "Phần mới" : "New Section",
      dataSource: "oee",
      fields: [],
      filters: [],
    };
    setReportConfig(prev => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
    setSelectedSection(newSection.id);
  };

  const updateSection = (id: string, updates: Partial<ReportSection>) => {
    setReportConfig(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === id ? { ...s, ...updates } : s),
    }));
  };

  const removeSection = (id: string) => {
    setReportConfig(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== id),
    }));
    if (selectedSection === id) {
      setSelectedSection(null);
    }
  };

  const moveSection = (id: string, direction: "up" | "down") => {
    const index = reportConfig.sections.findIndex(s => s.id === id);
    if (index === -1) return;
    
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= reportConfig.sections.length) return;
    
    const newSections = [...reportConfig.sections];
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    setReportConfig(prev => ({ ...prev, sections: newSections }));
  };

  const selectedSectionData = useMemo(() => {
    return reportConfig.sections.find(s => s.id === selectedSection);
  }, [reportConfig.sections, selectedSection]);

  const handleSaveReport = () => {
    if (!reportConfig.name) {
      toast.error(language === "vi" ? "Vui lòng nhập tên báo cáo" : "Please enter report name");
      return;
    }
    // Save to localStorage for demo
    const savedReports = JSON.parse(localStorage.getItem("customReports") || "[]");
    savedReports.push({ ...reportConfig, id: Date.now(), createdAt: new Date() });
    localStorage.setItem("customReports", JSON.stringify(savedReports));
    toast.success(language === "vi" ? "Đã lưu báo cáo!" : "Report saved!");
  };

  const handleExportReport = () => {
    toast.success(language === "vi" ? "Đang xuất báo cáo..." : "Exporting report...");
  };

  const renderChartPreview = (section: ReportSection) => {
    if (section.type === "table") {
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Machine</th>
                <th className="p-2 text-center">OEE</th>
                <th className="p-2 text-center">Availability</th>
                <th className="p-2 text-center">Performance</th>
                <th className="p-2 text-center">Quality</th>
              </tr>
            </thead>
            <tbody>
              {sampleData.map((row, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2">{row.name}</td>
                  <td className="p-2 text-center">{row.oee}%</td>
                  <td className="p-2 text-center">{row.availability}%</td>
                  <td className="p-2 text-center">{row.performance}%</td>
                  <td className="p-2 text-center">{row.quality}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (section.chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={sampleData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="oee" fill="#3b82f6" name="OEE" />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (section.chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={200}>
          <ReLineChart data={sampleData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="oee" stroke="#3b82f6" name="OEE" />
          </ReLineChart>
        </ResponsiveContainer>
      );
    }

    if (section.chartType === "pie") {
      return (
        <ResponsiveContainer width="100%" height={200}>
          <RePieChart>
            <Pie
              data={sampleData}
              dataKey="oee"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {sampleData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </RePieChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {language === "vi" ? "Tạo Báo cáo Tùy chỉnh" : "Custom Report Builder"}
            </h1>
            <p className="text-muted-foreground">
              {language === "vi" 
                ? "Thiết kế báo cáo với các trường và biểu đồ tùy chọn" 
                : "Design reports with custom fields and charts"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveReport}>
              <Save className="h-4 w-4 mr-2" />
              {language === "vi" ? "Lưu" : "Save"}
            </Button>
            <Button onClick={handleExportReport}>
              <Download className="h-4 w-4 mr-2" />
              {language === "vi" ? "Xuất" : "Export"}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="design">
              <Settings className="h-4 w-4 mr-2" />
              {language === "vi" ? "Thiết kế" : "Design"}
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              {language === "vi" ? "Xem trước" : "Preview"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="design" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Report Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {language === "vi" ? "Cài đặt Báo cáo" : "Report Settings"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{language === "vi" ? "Tên báo cáo" : "Report Name"}</Label>
                    <Input
                      value={reportConfig.name}
                      onChange={(e) => setReportConfig(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={language === "vi" ? "Nhập tên báo cáo..." : "Enter report name..."}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === "vi" ? "Mô tả" : "Description"}</Label>
                    <Textarea
                      value={reportConfig.description}
                      onChange={(e) => setReportConfig(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={language === "vi" ? "Mô tả báo cáo..." : "Report description..."}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>{language === "vi" ? "Từ ngày" : "Start Date"}</Label>
                      <Input
                        type="date"
                        value={reportConfig.dateRange.start}
                        onChange={(e) => setReportConfig(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, start: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{language === "vi" ? "Đến ngày" : "End Date"}</Label>
                      <Input
                        type="date"
                        value={reportConfig.dateRange.end}
                        onChange={(e) => setReportConfig(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, end: e.target.value }
                        }))}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Label className="mb-2 block">{language === "vi" ? "Thêm phần mới" : "Add Section"}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {chartTypes.map((chart) => (
                        <Button
                          key={chart.id}
                          variant="outline"
                          size="sm"
                          className="justify-start"
                          onClick={() => addSection(
                            chart.id === "table" ? "table" : "chart",
                            chart.id === "table" ? undefined : chart.id as any
                          )}
                        >
                          <chart.icon className="h-4 w-4 mr-2" />
                          {language === "vi" ? chart.nameVi : chart.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sections List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {language === "vi" ? "Các phần" : "Sections"} ({reportConfig.sections.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reportConfig.sections.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Layers className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>{language === "vi" ? "Chưa có phần nào" : "No sections yet"}</p>
                      <p className="text-sm">{language === "vi" ? "Thêm biểu đồ hoặc bảng" : "Add a chart or table"}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {reportConfig.sections.map((section, index) => (
                        <div
                          key={section.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedSection === section.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                          }`}
                          onClick={() => setSelectedSection(section.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              {section.type === "chart" && section.chartType === "bar" && <BarChart3 className="h-4 w-4" />}
                              {section.type === "chart" && section.chartType === "line" && <LineChart className="h-4 w-4" />}
                              {section.type === "chart" && section.chartType === "pie" && <PieChart className="h-4 w-4" />}
                              {section.type === "table" && <Table className="h-4 w-4" />}
                              <span className="font-medium">{section.title}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => { e.stopPropagation(); moveSection(section.id, "up"); }}
                                disabled={index === 0}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => { e.stopPropagation(); moveSection(section.id, "down"); }}
                                disabled={index === reportConfig.sections.length - 1}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {dataSources.find(d => d.id === section.dataSource)?.[language === "vi" ? "nameVi" : "name"]}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section Editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {language === "vi" ? "Chỉnh sửa phần" : "Edit Section"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedSectionData ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{language === "vi" ? "Tiêu đề" : "Title"}</Label>
                        <Input
                          value={selectedSectionData.title}
                          onChange={(e) => updateSection(selectedSectionData.id, { title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === "vi" ? "Nguồn dữ liệu" : "Data Source"}</Label>
                        <Select
                          value={selectedSectionData.dataSource}
                          onValueChange={(v) => updateSection(selectedSectionData.id, { dataSource: v, fields: [] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {dataSources.map((source) => (
                              <SelectItem key={source.id} value={source.id}>
                                {language === "vi" ? source.nameVi : source.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{language === "vi" ? "Các trường" : "Fields"}</Label>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {dataFields[selectedSectionData.dataSource]?.map((field) => (
                            <div key={field.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={field.id}
                                checked={selectedSectionData.fields.includes(field.id)}
                                onCheckedChange={(checked) => {
                                  const newFields = checked
                                    ? [...selectedSectionData.fields, field.id]
                                    : selectedSectionData.fields.filter(f => f !== field.id);
                                  updateSection(selectedSectionData.id, { fields: newFields });
                                }}
                              />
                              <label htmlFor={field.id} className="text-sm">
                                {language === "vi" ? field.nameVi : field.name}
                              </label>
                              <Badge variant="outline" className="text-xs">
                                {field.type}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      {selectedSectionData.type === "chart" && (
                        <div className="space-y-2">
                          <Label>{language === "vi" ? "Nhóm theo" : "Group By"}</Label>
                          <Select
                            value={selectedSectionData.groupBy || ""}
                            onValueChange={(v) => updateSection(selectedSectionData.id, { groupBy: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={language === "vi" ? "Chọn trường" : "Select field"} />
                            </SelectTrigger>
                            <SelectContent>
                              {dataFields[selectedSectionData.dataSource]?.map((field) => (
                                <SelectItem key={field.id} value={field.id}>
                                  {language === "vi" ? field.nameVi : field.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Settings className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>{language === "vi" ? "Chọn một phần để chỉnh sửa" : "Select a section to edit"}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{reportConfig.name || (language === "vi" ? "Báo cáo chưa đặt tên" : "Untitled Report")}</CardTitle>
                {reportConfig.description && (
                  <CardDescription>{reportConfig.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {reportConfig.sections.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">{language === "vi" ? "Báo cáo trống" : "Empty Report"}</p>
                    <p>{language === "vi" ? "Thêm các phần trong tab Thiết kế" : "Add sections in the Design tab"}</p>
                  </div>
                ) : (
                  reportConfig.sections.map((section) => (
                    <div key={section.id} className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-4">{section.title}</h3>
                      {renderChartPreview(section)}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
