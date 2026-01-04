/**
 * WidgetConfigScreen - Mobile Widget Configuration
 * Cho phép người dùng cấu hình widget để theo dõi line/product trên mobile
 */

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Settings,
  Save,
  RefreshCw,
  Smartphone,
  LayoutGrid,
  Factory,
  Package,
  Activity,
  Gauge,
  Clock,
  Eye,
  EyeOff,
  GripVertical,
  Check,
  X,
  Sparkles,
  Zap,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

// Types
interface WidgetConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  order: number;
  type: 'cpk' | 'oee' | 'spc' | 'chart' | 'alert';
}

interface LineSelection {
  id: number;
  name: string;
  selected: boolean;
}

interface ProductSelection {
  id: number;
  code: string;
  name: string;
  selected: boolean;
}

export default function WidgetConfigScreen() {
  // State for widget configuration
  const [widgets, setWidgets] = useState<WidgetConfig[]>([
    {
      id: 'cpk_summary',
      name: 'CPK Summary',
      description: 'Tổng quan CPK các dây chuyền',
      icon: <Gauge className="h-5 w-5" />,
      enabled: true,
      order: 1,
      type: 'cpk'
    },
    {
      id: 'oee_realtime',
      name: 'OEE Realtime',
      description: 'Hiệu suất thiết bị tổng thể',
      icon: <Activity className="h-5 w-5" />,
      enabled: true,
      order: 2,
      type: 'oee'
    },
    {
      id: 'spc_alerts',
      name: 'SPC Alerts',
      description: 'Cảnh báo vi phạm SPC Rules',
      icon: <AlertTriangle className="h-5 w-5" />,
      enabled: true,
      order: 3,
      type: 'alert'
    },
    {
      id: 'cpk_trend',
      name: 'CPK Trend Chart',
      description: 'Biểu đồ xu hướng CPK',
      icon: <TrendingUp className="h-5 w-5" />,
      enabled: false,
      order: 4,
      type: 'chart'
    },
    {
      id: 'production_stats',
      name: 'Production Stats',
      description: 'Thống kê sản xuất theo ca',
      icon: <BarChart3 className="h-5 w-5" />,
      enabled: false,
      order: 5,
      type: 'chart'
    },
    {
      id: 'quality_pie',
      name: 'Quality Distribution',
      description: 'Phân bổ chất lượng sản phẩm',
      icon: <PieChart className="h-5 w-5" />,
      enabled: false,
      order: 6,
      type: 'chart'
    }
  ]);

  // State for line/product selection
  const [selectedLines, setSelectedLines] = useState<LineSelection[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<ProductSelection[]>([]);
  
  // State for display settings
  const [metricType, setMetricType] = useState<'cpk' | 'oee' | 'both'>('both');
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [compactMode, setCompactMode] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [showSparklines, setShowSparklines] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [rotateInterval, setRotateInterval] = useState(10);

  // Fetch production lines
  const { data: productionLines } = trpc.productionLine.getAll.useQuery();
  const { data: products } = trpc.product.getAll.useQuery();

  // Initialize selections when data loads
  useEffect(() => {
    if (productionLines && selectedLines.length === 0) {
      setSelectedLines(productionLines.map((line, index) => ({
        id: line.id,
        name: line.name,
        selected: index < 3 // Select first 3 by default
      })));
    }
  }, [productionLines]);

  useEffect(() => {
    if (products && selectedProducts.length === 0) {
      setSelectedProducts(products.map((product, index) => ({
        id: product.id,
        code: product.code,
        name: product.name,
        selected: index < 5 // Select first 5 by default
      })));
    }
  }, [products]);

  // Load saved config from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('mobile_widget_config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (config.widgets) setWidgets(prev => prev.map(w => {
          const saved = config.widgets.find((s: any) => s.id === w.id);
          return saved ? { ...w, enabled: saved.enabled, order: saved.order } : w;
        }));
        if (config.metricType) setMetricType(config.metricType);
        if (config.refreshInterval) setRefreshInterval(config.refreshInterval);
        if (config.compactMode !== undefined) setCompactMode(config.compactMode);
        if (config.darkMode !== undefined) setDarkMode(config.darkMode);
        if (config.showSparklines !== undefined) setShowSparklines(config.showSparklines);
        if (config.autoRotate !== undefined) setAutoRotate(config.autoRotate);
        if (config.rotateInterval) setRotateInterval(config.rotateInterval);
        if (config.selectedLineIds) {
          setSelectedLines(prev => prev.map(l => ({
            ...l,
            selected: config.selectedLineIds.includes(l.id)
          })));
        }
        if (config.selectedProductIds) {
          setSelectedProducts(prev => prev.map(p => ({
            ...p,
            selected: config.selectedProductIds.includes(p.id)
          })));
        }
      } catch (e) {
        console.error('Error loading widget config:', e);
      }
    }
  }, []);

  // Toggle widget
  const toggleWidget = (widgetId: string) => {
    setWidgets(prev => prev.map(w => 
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w
    ));
  };

  // Toggle line selection
  const toggleLine = (lineId: number) => {
    setSelectedLines(prev => prev.map(l => 
      l.id === lineId ? { ...l, selected: !l.selected } : l
    ));
  };

  // Toggle product selection
  const toggleProduct = (productId: number) => {
    setSelectedProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, selected: !p.selected } : p
    ));
  };

  // Select all lines
  const selectAllLines = () => {
    setSelectedLines(prev => prev.map(l => ({ ...l, selected: true })));
  };

  // Deselect all lines
  const deselectAllLines = () => {
    setSelectedLines(prev => prev.map(l => ({ ...l, selected: false })));
  };

  // Select all products
  const selectAllProducts = () => {
    setSelectedProducts(prev => prev.map(p => ({ ...p, selected: true })));
  };

  // Deselect all products
  const deselectAllProducts = () => {
    setSelectedProducts(prev => prev.map(p => ({ ...p, selected: false })));
  };

  // Save configuration
  const saveConfig = () => {
    const config = {
      widgets: widgets.map(w => ({ id: w.id, enabled: w.enabled, order: w.order })),
      metricType,
      refreshInterval,
      compactMode,
      darkMode,
      showSparklines,
      autoRotate,
      rotateInterval,
      selectedLineIds: selectedLines.filter(l => l.selected).map(l => l.id),
      selectedProductIds: selectedProducts.filter(p => p.selected).map(p => p.id)
    };
    
    localStorage.setItem('mobile_widget_config', JSON.stringify(config));
    toast.success('Đã lưu cấu hình widget');
  };

  // Reset to defaults
  const resetConfig = () => {
    localStorage.removeItem('mobile_widget_config');
    setMetricType('both');
    setRefreshInterval(30);
    setCompactMode(false);
    setDarkMode(true);
    setShowSparklines(true);
    setAutoRotate(false);
    setRotateInterval(10);
    setWidgets(prev => prev.map((w, i) => ({ ...w, enabled: i < 3, order: i + 1 })));
    setSelectedLines(prev => prev.map((l, i) => ({ ...l, selected: i < 3 })));
    setSelectedProducts(prev => prev.map((p, i) => ({ ...p, selected: i < 5 })));
    toast.success('Đã khôi phục cấu hình mặc định');
  };

  // Get type badge color
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'cpk':
        return <Badge className="bg-blue-500">CPK</Badge>;
      case 'oee':
        return <Badge className="bg-green-500">OEE</Badge>;
      case 'spc':
        return <Badge className="bg-purple-500">SPC</Badge>;
      case 'chart':
        return <Badge className="bg-orange-500">Chart</Badge>;
      case 'alert':
        return <Badge variant="destructive">Alert</Badge>;
      default:
        return <Badge variant="outline">Other</Badge>;
    }
  };

  const enabledWidgetCount = widgets.filter(w => w.enabled).length;
  const selectedLineCount = selectedLines.filter(l => l.selected).length;
  const selectedProductCount = selectedProducts.filter(p => p.selected).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Smartphone className="h-6 w-6" />
              Widget Configuration
            </h1>
            <p className="text-muted-foreground">
              Cấu hình widget hiển thị trên mobile app
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetConfig}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button onClick={saveConfig}>
              <Save className="mr-2 h-4 w-4" />
              Lưu cấu hình
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Widgets đang bật</p>
                  <p className="text-2xl font-bold">{enabledWidgetCount}/{widgets.length}</p>
                </div>
                <LayoutGrid className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Dây chuyền theo dõi</p>
                  <p className="text-2xl font-bold">{selectedLineCount}/{selectedLines.length}</p>
                </div>
                <Factory className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sản phẩm theo dõi</p>
                  <p className="text-2xl font-bold">{selectedProductCount}/{selectedProducts.length}</p>
                </div>
                <Package className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Refresh Interval</p>
                  <p className="text-2xl font-bold">{refreshInterval}s</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration Tabs */}
        <Tabs defaultValue="widgets" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="widgets">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Widgets
            </TabsTrigger>
            <TabsTrigger value="lines">
              <Factory className="mr-2 h-4 w-4" />
              Dây chuyền
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="mr-2 h-4 w-4" />
              Sản phẩm
            </TabsTrigger>
            <TabsTrigger value="display">
              <Settings className="mr-2 h-4 w-4" />
              Hiển thị
            </TabsTrigger>
          </TabsList>

          {/* Widgets Tab */}
          <TabsContent value="widgets">
            <Card>
              <CardHeader>
                <CardTitle>Cấu hình Widgets</CardTitle>
                <CardDescription>
                  Bật/tắt và sắp xếp các widget hiển thị trên màn hình chính
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {widgets.sort((a, b) => a.order - b.order).map((widget) => (
                    <div
                      key={widget.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        widget.enabled ? 'bg-accent/50' : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                        <div className={`p-2 rounded-lg ${widget.enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                          {widget.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{widget.name}</p>
                            {getTypeBadge(widget.type)}
                          </div>
                          <p className="text-sm text-muted-foreground">{widget.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={widget.enabled}
                        onCheckedChange={() => toggleWidget(widget.id)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lines Tab */}
          <TabsContent value="lines">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Chọn Dây chuyền</CardTitle>
                    <CardDescription>
                      Chọn các dây chuyền muốn theo dõi trên widget
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllLines}>
                      <Check className="mr-1 h-4 w-4" />
                      Chọn tất cả
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllLines}>
                      <X className="mr-1 h-4 w-4" />
                      Bỏ chọn
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {selectedLines.map((line) => (
                      <div
                        key={line.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent/50 ${
                          line.selected ? 'bg-accent border-primary' : ''
                        }`}
                        onClick={() => toggleLine(line.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox checked={line.selected} />
                          <Factory className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{line.name}</span>
                        </div>
                        {line.selected && (
                          <Badge variant="secondary">
                            <Eye className="mr-1 h-3 w-3" />
                            Đang theo dõi
                          </Badge>
                        )}
                      </div>
                    ))}
                    {selectedLines.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Không có dây chuyền nào
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Chọn Sản phẩm</CardTitle>
                    <CardDescription>
                      Chọn các sản phẩm muốn theo dõi trên widget
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllProducts}>
                      <Check className="mr-1 h-4 w-4" />
                      Chọn tất cả
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllProducts}>
                      <X className="mr-1 h-4 w-4" />
                      Bỏ chọn
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {selectedProducts.map((product) => (
                      <div
                        key={product.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent/50 ${
                          product.selected ? 'bg-accent border-primary' : ''
                        }`}
                        onClick={() => toggleProduct(product.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox checked={product.selected} />
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium">{product.code}</span>
                            <span className="text-muted-foreground ml-2">- {product.name}</span>
                          </div>
                        </div>
                        {product.selected && (
                          <Badge variant="secondary">
                            <Eye className="mr-1 h-3 w-3" />
                            Đang theo dõi
                          </Badge>
                        )}
                      </div>
                    ))}
                    {selectedProducts.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Không có sản phẩm nào
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Display Settings Tab */}
          <TabsContent value="display">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Metric Type */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gauge className="h-5 w-5" />
                    Loại Metric hiển thị
                  </CardTitle>
                  <CardDescription>
                    Chọn loại chỉ số muốn hiển thị trên widget
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={metricType} onValueChange={(v) => setMetricType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpk">Chỉ CPK</SelectItem>
                      <SelectItem value="oee">Chỉ OEE</SelectItem>
                      <SelectItem value="both">Cả CPK và OEE</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LineChart className="h-4 w-4 text-muted-foreground" />
                      <Label>Hiển thị Sparklines</Label>
                    </div>
                    <Switch
                      checked={showSparklines}
                      onCheckedChange={setShowSparklines}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Refresh Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5" />
                    Tần suất cập nhật
                  </CardTitle>
                  <CardDescription>
                    Cấu hình thời gian tự động refresh dữ liệu
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Refresh Interval</Label>
                      <span className="text-sm font-medium">{refreshInterval} giây</span>
                    </div>
                    <Slider
                      value={[refreshInterval]}
                      onValueChange={(v) => setRefreshInterval(v[0])}
                      min={10}
                      max={120}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Tối thiểu 10 giây, khuyến nghị 30 giây
                    </p>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <Label>Auto-rotate widgets</Label>
                    </div>
                    <Switch
                      checked={autoRotate}
                      onCheckedChange={setAutoRotate}
                    />
                  </div>

                  {autoRotate && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Rotate Interval</Label>
                        <span className="text-sm font-medium">{rotateInterval} giây</span>
                      </div>
                      <Slider
                        value={[rotateInterval]}
                        onValueChange={(v) => setRotateInterval(v[0])}
                        min={5}
                        max={60}
                        step={5}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Display Mode */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Chế độ hiển thị
                  </CardTitle>
                  <CardDescription>
                    Tùy chỉnh giao diện widget
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                      <Label>Compact Mode</Label>
                    </div>
                    <Switch
                      checked={compactMode}
                      onCheckedChange={setCompactMode}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Hiển thị nhiều widget hơn trên màn hình nhỏ
                  </p>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {darkMode ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Label>Dark Mode</Label>
                    </div>
                    <Switch
                      checked={darkMode}
                      onCheckedChange={setDarkMode}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sử dụng giao diện tối cho môi trường ánh sáng yếu
                  </p>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Preview
                  </CardTitle>
                  <CardDescription>
                    Xem trước widget trên mobile
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div 
                    className={`mx-auto w-[200px] h-[350px] rounded-2xl border-4 border-gray-800 p-2 ${
                      darkMode ? 'bg-gray-900' : 'bg-white'
                    }`}
                  >
                    <div className="h-full rounded-xl overflow-hidden">
                      <div className={`p-2 space-y-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {widgets.filter(w => w.enabled).slice(0, 3).map((widget) => (
                          <div 
                            key={widget.id}
                            className={`p-2 rounded-lg ${
                              darkMode ? 'bg-gray-800' : 'bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className="scale-75">{widget.icon}</div>
                              <span className="text-xs font-medium truncate">{widget.name}</span>
                            </div>
                            {showSparklines && (
                              <div className="h-8 flex items-end gap-0.5">
                                {[40, 60, 45, 70, 55, 80, 65].map((h, i) => (
                                  <div
                                    key={i}
                                    className="flex-1 bg-primary/60 rounded-t"
                                    style={{ height: `${h}%` }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {widgets.filter(w => w.enabled).length === 0 && (
                          <div className="text-center py-8 text-xs text-muted-foreground">
                            Chưa có widget nào được bật
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
