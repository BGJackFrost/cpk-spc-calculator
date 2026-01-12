import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Play, Trash2, Edit, Code, Globe, BarChart3, Table, Gauge, PieChart, RefreshCw, Eye, EyeOff, Loader2 } from "lucide-react";

type WidgetType = 'sql_query' | 'api_endpoint' | 'chart' | 'table' | 'kpi_card' | 'gauge' | 'custom';
type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'radar';

interface WidgetFormData {
  name: string;
  description: string;
  widgetType: WidgetType;
  sqlQuery: string;
  apiEndpoint: string;
  apiMethod: 'GET' | 'POST';
  apiHeaders: string;
  apiBody: string;
  width: number;
  height: number;
  refreshInterval: number;
  chartType: ChartType;
  isPublic: boolean;
}

const defaultFormData: WidgetFormData = {
  name: '',
  description: '',
  widgetType: 'sql_query',
  sqlQuery: '',
  apiEndpoint: '',
  apiMethod: 'GET',
  apiHeaders: '{}',
  apiBody: '{}',
  width: 1,
  height: 1,
  refreshInterval: 60,
  chartType: 'bar',
  isPublic: false,
};

const widgetTypeLabels: Record<WidgetType, { label: string; icon: React.ReactNode }> = {
  sql_query: { label: 'SQL Query', icon: <Code className="h-4 w-4" /> },
  api_endpoint: { label: 'API Endpoint', icon: <Globe className="h-4 w-4" /> },
  chart: { label: 'Biểu đồ', icon: <BarChart3 className="h-4 w-4" /> },
  table: { label: 'Bảng dữ liệu', icon: <Table className="h-4 w-4" /> },
  kpi_card: { label: 'KPI Card', icon: <PieChart className="h-4 w-4" /> },
  gauge: { label: 'Gauge', icon: <Gauge className="h-4 w-4" /> },
  custom: { label: 'Tùy chỉnh', icon: <Code className="h-4 w-4" /> },
};

export default function CustomWidgets() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<number | null>(null);
  const [formData, setFormData] = useState<WidgetFormData>(defaultFormData);
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);

  const utils = trpc.useUtils();
  const { data: widgets, isLoading } = trpc.customWidget.list.useQuery({ includePublic: true });
  
  const createMutation = trpc.customWidget.create.useMutation({
    onSuccess: () => {
      toast.success('Tạo widget thành công');
      setIsCreateOpen(false);
      setFormData(defaultFormData);
      utils.customWidget.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.customWidget.update.useMutation({
    onSuccess: () => {
      toast.success('Cập nhật widget thành công');
      setEditingWidget(null);
      setFormData(defaultFormData);
      utils.customWidget.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.customWidget.delete.useMutation({
    onSuccess: () => {
      toast.success('Xóa widget thành công');
      utils.customWidget.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const testQueryMutation = trpc.customWidget.testQuery.useMutation();
  const testApiMutation = trpc.customWidget.testApi.useMutation();

  const handleTestQuery = async () => {
    setIsTestLoading(true);
    try {
      if (formData.widgetType === 'api_endpoint') {
        const result = await testApiMutation.mutateAsync({
          endpoint: formData.apiEndpoint,
          method: formData.apiMethod,
          headers: JSON.parse(formData.apiHeaders || '{}'),
          body: formData.apiMethod === 'POST' ? JSON.parse(formData.apiBody || '{}') : undefined,
        });
        setTestResult(result);
        if (result.success) {
          toast.success('Test API thành công');
        } else {
          toast.error(result.error || 'Test API thất bại');
        }
      } else {
        const result = await testQueryMutation.mutateAsync({ query: formData.sqlQuery });
        setTestResult(result);
        if (result.success) {
          toast.success(`Query thành công: ${result.rowCount} dòng`);
        } else {
          toast.error(result.error || 'Query thất bại');
        }
      }
    } catch (error) {
      toast.error('Lỗi khi test');
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleSubmit = () => {
    const data = {
      name: formData.name,
      description: formData.description || undefined,
      widgetType: formData.widgetType,
      sqlQuery: formData.sqlQuery || undefined,
      apiEndpoint: formData.apiEndpoint || undefined,
      apiMethod: formData.apiMethod,
      apiHeaders: formData.apiHeaders ? JSON.parse(formData.apiHeaders) : undefined,
      apiBody: formData.apiBody ? JSON.parse(formData.apiBody) : undefined,
      width: formData.width,
      height: formData.height,
      refreshInterval: formData.refreshInterval,
      chartType: formData.chartType,
      isPublic: formData.isPublic,
    };

    if (editingWidget) {
      updateMutation.mutate({ id: editingWidget, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (widget: any) => {
    setFormData({
      name: widget.name,
      description: widget.description || '',
      widgetType: widget.widgetType,
      sqlQuery: widget.sqlQuery || '',
      apiEndpoint: widget.apiEndpoint || '',
      apiMethod: widget.apiMethod || 'GET',
      apiHeaders: widget.apiHeaders ? JSON.stringify(widget.apiHeaders, null, 2) : '{}',
      apiBody: widget.apiBody ? JSON.stringify(widget.apiBody, null, 2) : '{}',
      width: widget.width,
      height: widget.height,
      refreshInterval: widget.refreshInterval,
      chartType: widget.chartType || 'bar',
      isPublic: widget.isPublic === 1,
    });
    setEditingWidget(widget.id);
    setIsCreateOpen(true);
  };

  const WidgetForm = () => (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tên widget *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nhập tên widget"
          />
        </div>
        <div className="space-y-2">
          <Label>Loại widget *</Label>
          <Select
            value={formData.widgetType}
            onValueChange={(v) => setFormData({ ...formData, widgetType: v as WidgetType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(widgetTypeLabels).map(([key, { label, icon }]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    {icon}
                    {label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Mô tả</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Mô tả widget"
          rows={2}
        />
      </div>

      <Tabs defaultValue={formData.widgetType === 'api_endpoint' ? 'api' : 'sql'}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sql">SQL Query</TabsTrigger>
          <TabsTrigger value="api">API Endpoint</TabsTrigger>
        </TabsList>
        <TabsContent value="sql" className="space-y-2">
          <Label>SQL Query</Label>
          <Textarea
            value={formData.sqlQuery}
            onChange={(e) => setFormData({ ...formData, sqlQuery: e.target.value })}
            placeholder="SELECT * FROM table_name LIMIT 10"
            rows={5}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">Chỉ hỗ trợ câu lệnh SELECT</p>
        </TabsContent>
        <TabsContent value="api" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>API Endpoint</Label>
              <Input
                value={formData.apiEndpoint}
                onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                placeholder="https://api.example.com/data"
              />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select
                value={formData.apiMethod}
                onValueChange={(v) => setFormData({ ...formData, apiMethod: v as 'GET' | 'POST' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Headers (JSON)</Label>
            <Textarea
              value={formData.apiHeaders}
              onChange={(e) => setFormData({ ...formData, apiHeaders: e.target.value })}
              placeholder='{"Authorization": "Bearer token"}'
              rows={2}
              className="font-mono text-sm"
            />
          </div>
          {formData.apiMethod === 'POST' && (
            <div className="space-y-2">
              <Label>Body (JSON)</Label>
              <Textarea
                value={formData.apiBody}
                onChange={(e) => setFormData({ ...formData, apiBody: e.target.value })}
                placeholder='{"key": "value"}'
                rows={3}
                className="font-mono text-sm"
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Width</Label>
          <Select
            value={String(formData.width)}
            onValueChange={(v) => setFormData({ ...formData, width: parseInt(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Height</Label>
          <Select
            value={String(formData.height)}
            onValueChange={(v) => setFormData({ ...formData, height: parseInt(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Refresh (s)</Label>
          <Input
            type="number"
            min={10}
            max={3600}
            value={formData.refreshInterval}
            onChange={(e) => setFormData({ ...formData, refreshInterval: parseInt(e.target.value) || 60 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Chart Type</Label>
          <Select
            value={formData.chartType}
            onValueChange={(v) => setFormData({ ...formData, chartType: v as ChartType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['line', 'bar', 'pie', 'doughnut', 'area', 'scatter', 'radar'].map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={formData.isPublic}
          onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
        />
        <Label>Công khai widget cho tất cả người dùng</Label>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleTestQuery}
          disabled={isTestLoading || (!formData.sqlQuery && !formData.apiEndpoint)}
        >
          {isTestLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
          Test
        </Button>
      </div>

      {testResult && (
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={testResult.success ? 'default' : 'destructive'}>
              {testResult.success ? 'Thành công' : 'Thất bại'}
            </Badge>
            {testResult.rowCount !== undefined && (
              <span className="text-sm text-muted-foreground">{testResult.rowCount} dòng</span>
            )}
          </div>
          {testResult.error && (
            <p className="text-sm text-destructive">{testResult.error}</p>
          )}
          {testResult.data && (
            <pre className="text-xs overflow-auto max-h-40 bg-background p-2 rounded">
              {JSON.stringify(testResult.data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Widget Tùy chỉnh</h1>
            <p className="text-muted-foreground">Tạo và quản lý widget với SQL query hoặc API endpoint riêng</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              setEditingWidget(null);
              setFormData(defaultFormData);
              setTestResult(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Tạo Widget
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingWidget ? 'Chỉnh sửa Widget' : 'Tạo Widget mới'}</DialogTitle>
                <DialogDescription>
                  Tạo widget tùy chỉnh với SQL query hoặc API endpoint
                </DialogDescription>
              </DialogHeader>
              <WidgetForm />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleSubmit} disabled={!formData.name}>
                  {editingWidget ? 'Cập nhật' : 'Tạo'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : widgets?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <Code className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có widget nào</p>
              <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Tạo Widget đầu tiên
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {widgets?.map((widget) => (
              <Card key={widget.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {widgetTypeLabels[widget.widgetType as WidgetType]?.icon}
                      <CardTitle className="text-lg">{widget.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      {widget.isPublic === 1 ? (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {widget.description || 'Không có mô tả'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline">
                      {widgetTypeLabels[widget.widgetType as WidgetType]?.label}
                    </Badge>
                    <Badge variant="secondary">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {widget.refreshInterval}s
                    </Badge>
                    <Badge variant="secondary">
                      {widget.width}x{widget.height}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(widget)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Bạn có chắc muốn xóa widget này?')) {
                          deleteMutation.mutate({ id: widget.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
