import { useState, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  LayoutGrid,
  Plus,
  Trash2,
  Settings,
  RotateCcw,
  Save,
  GripVertical,
  BarChart3,
  PieChart,
  Activity,
  AlertTriangle,
  Table,
  Brain,
  Gauge,
  TrendingUp,
  Loader2,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

interface WidgetConfig {
  id: number;
  widgetTemplateId: number;
  widgetKey: string;
  widgetName: string;
  category: string;
  componentName: string;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
  config: any;
  isVisible: boolean;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}

interface WidgetTemplate {
  id: number;
  key: string;
  name: string;
  description: string;
  category: string;
  componentName: string;
  defaultConfig: any;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  defaultWidth: number;
  defaultHeight: number;
  isDefault: boolean;
}

const categoryIcons: Record<string, React.ReactNode> = {
  chart: <BarChart3 className="h-4 w-4" />,
  stats: <Gauge className="h-4 w-4" />,
  table: <Table className="h-4 w-4" />,
  alert: <AlertTriangle className="h-4 w-4" />,
  ai: <Brain className="h-4 w-4" />,
  custom: <Settings className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  chart: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  stats: "bg-green-500/10 text-green-500 border-green-500/20",
  table: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  alert: "bg-red-500/10 text-red-500 border-red-500/20",
  ai: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  custom: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

export default function DashboardCustomization() {
  const { toast } = useToast();
  const [selectedWidget, setSelectedWidget] = useState<WidgetConfig | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Fetch widget templates
  const { data: templates, isLoading: loadingTemplates } = trpc.dashboardCustomization.getWidgetTemplates.useQuery({
    isActive: true,
  });

  // Fetch user's widgets
  const { data: userWidgets, isLoading: loadingWidgets, refetch: refetchWidgets } = trpc.dashboardCustomization.getUserWidgets.useQuery({});

  // Mutations
  const addWidgetMutation = trpc.dashboardCustomization.addWidget.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã thêm widget vào dashboard" });
      refetchWidgets();
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const updateWidgetMutation = trpc.dashboardCustomization.updateWidget.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã cập nhật widget" });
      refetchWidgets();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const removeWidgetMutation = trpc.dashboardCustomization.removeWidget.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã xóa widget" });
      refetchWidgets();
      setSelectedWidget(null);
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const resetMutation = trpc.dashboardCustomization.resetToDefault.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã khôi phục dashboard về mặc định" });
      refetchWidgets();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const updateLayoutMutation = trpc.dashboardCustomization.updateWidgetLayout.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã lưu layout" });
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  // Transform data
  const widgets: WidgetConfig[] = useMemo(() => {
    if (!userWidgets) return [];
    return userWidgets.map((w: any) => ({
      id: w.id,
      widgetTemplateId: w.widget_template_id,
      widgetKey: w.widget_key,
      widgetName: w.widget_name,
      category: w.category,
      componentName: w.component_name,
      gridX: w.grid_x,
      gridY: w.grid_y,
      gridWidth: w.grid_width,
      gridHeight: w.grid_height,
      config: w.config,
      isVisible: w.is_visible === 1,
      minWidth: w.min_width,
      minHeight: w.min_height,
      maxWidth: w.max_width,
      maxHeight: w.max_height,
    }));
  }, [userWidgets]);

  const templateList: WidgetTemplate[] = useMemo(() => {
    if (!templates) return [];
    return templates.map((t: any) => ({
      id: t.id,
      key: t.key,
      name: t.name,
      description: t.description,
      category: t.category,
      componentName: t.component_name,
      defaultConfig: t.defaultConfig,
      minWidth: t.min_width,
      minHeight: t.min_height,
      maxWidth: t.max_width,
      maxHeight: t.max_height,
      defaultWidth: t.default_width,
      defaultHeight: t.default_height,
      isDefault: t.is_default === 1,
    }));
  }, [templates]);

  // Group templates by category
  const templatesByCategory = useMemo(() => {
    const grouped: Record<string, WidgetTemplate[]> = {};
    templateList.forEach((t) => {
      if (!grouped[t.category]) grouped[t.category] = [];
      grouped[t.category].push(t);
    });
    return grouped;
  }, [templateList]);

  // Add widget handler
  const handleAddWidget = useCallback((template: WidgetTemplate) => {
    // Find next available position
    let maxY = 0;
    widgets.forEach((w) => {
      const bottomY = w.gridY + w.gridHeight;
      if (bottomY > maxY) maxY = bottomY;
    });

    addWidgetMutation.mutate({
      widgetTemplateId: template.id,
      gridX: 0,
      gridY: maxY,
      gridWidth: template.defaultWidth,
      gridHeight: template.defaultHeight,
      config: template.defaultConfig,
    });
  }, [widgets, addWidgetMutation]);

  // Move widget handler
  const handleMoveWidget = useCallback((widget: WidgetConfig, direction: 'up' | 'down' | 'left' | 'right') => {
    let newX = widget.gridX;
    let newY = widget.gridY;

    switch (direction) {
      case 'up':
        newY = Math.max(0, widget.gridY - 1);
        break;
      case 'down':
        newY = widget.gridY + 1;
        break;
      case 'left':
        newX = Math.max(0, widget.gridX - 1);
        break;
      case 'right':
        newX = Math.min(12 - widget.gridWidth, widget.gridX + 1);
        break;
    }

    if (newX !== widget.gridX || newY !== widget.gridY) {
      updateWidgetMutation.mutate({
        id: widget.id,
        gridX: newX,
        gridY: newY,
      });
    }
  }, [updateWidgetMutation]);

  // Resize widget handler
  const handleResizeWidget = useCallback((widget: WidgetConfig, larger: boolean) => {
    let newWidth = widget.gridWidth;
    let newHeight = widget.gridHeight;

    if (larger) {
      if (widget.gridWidth < widget.maxWidth) {
        newWidth = Math.min(widget.maxWidth, widget.gridWidth + 1);
      } else if (widget.gridHeight < widget.maxHeight) {
        newHeight = Math.min(widget.maxHeight, widget.gridHeight + 1);
      }
    } else {
      if (widget.gridWidth > widget.minWidth) {
        newWidth = Math.max(widget.minWidth, widget.gridWidth - 1);
      } else if (widget.gridHeight > widget.minHeight) {
        newHeight = Math.max(widget.minHeight, widget.gridHeight - 1);
      }
    }

    if (newWidth !== widget.gridWidth || newHeight !== widget.gridHeight) {
      updateWidgetMutation.mutate({
        id: widget.id,
        gridWidth: newWidth,
        gridHeight: newHeight,
      });
    }
  }, [updateWidgetMutation]);

  // Toggle visibility handler
  const handleToggleVisibility = useCallback((widget: WidgetConfig) => {
    updateWidgetMutation.mutate({
      id: widget.id,
      isVisible: !widget.isVisible,
    });
  }, [updateWidgetMutation]);

  if (loadingTemplates || loadingWidgets) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <LayoutGrid className="h-8 w-8 text-primary" />
              Tùy chỉnh Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Thêm, xóa và sắp xếp các widget trên Dashboard AVI/AOI
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-4">
              <Switch
                id="edit-mode"
                checked={editMode}
                onCheckedChange={setEditMode}
              />
              <Label htmlFor="edit-mode">Chế độ chỉnh sửa</Label>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm Widget
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Thêm Widget mới</DialogTitle>
                  <DialogDescription>
                    Chọn loại widget bạn muốn thêm vào dashboard
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[400px] pr-4">
                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="all">Tất cả</TabsTrigger>
                      {Object.keys(templatesByCategory).map((cat) => (
                        <TabsTrigger key={cat} value={cat} className="capitalize">
                          {cat}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    <TabsContent value="all" className="space-y-4">
                      {templateList.map((template) => (
                        <Card
                          key={template.id}
                          className="cursor-pointer hover:border-primary transition-colors"
                          onClick={() => handleAddWidget(template)}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base flex items-center gap-2">
                                {categoryIcons[template.category]}
                                {template.name}
                              </CardTitle>
                              <Badge variant="outline" className={categoryColors[template.category]}>
                                {template.category}
                              </Badge>
                            </div>
                            <CardDescription>{template.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="text-xs text-muted-foreground">
                              Kích thước: {template.defaultWidth}x{template.defaultHeight} (min: {template.minWidth}x{template.minHeight}, max: {template.maxWidth}x{template.maxHeight})
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </TabsContent>
                    {Object.entries(templatesByCategory).map(([cat, temps]) => (
                      <TabsContent key={cat} value={cat} className="space-y-4">
                        {temps.map((template) => (
                          <Card
                            key={template.id}
                            className="cursor-pointer hover:border-primary transition-colors"
                            onClick={() => handleAddWidget(template)}
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                  {categoryIcons[template.category]}
                                  {template.name}
                                </CardTitle>
                              </div>
                              <CardDescription>{template.description}</CardDescription>
                            </CardHeader>
                          </Card>
                        ))}
                      </TabsContent>
                    ))}
                  </Tabs>
                </ScrollArea>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              onClick={() => resetMutation.mutate({})}
              disabled={resetMutation.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Khôi phục mặc định
            </Button>
          </div>
        </div>

        {/* Widget Grid Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Xem trước Dashboard</CardTitle>
            <CardDescription>
              {editMode ? "Click vào widget để chỉnh sửa vị trí và kích thước" : "Bật chế độ chỉnh sửa để thay đổi layout"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative border rounded-lg p-4 min-h-[500px] bg-muted/30">
              {/* Grid lines (12 columns) */}
              <div className="absolute inset-4 grid grid-cols-12 gap-2 pointer-events-none opacity-20">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="border border-dashed border-primary h-full" />
                ))}
              </div>

              {/* Widgets */}
              <div className="relative grid grid-cols-12 gap-2 auto-rows-[100px]">
                {widgets.map((widget) => (
                  <div
                    key={widget.id}
                    className={`
                      relative rounded-lg border-2 transition-all
                      ${widget.isVisible ? 'bg-card' : 'bg-muted/50 opacity-60'}
                      ${editMode ? 'cursor-pointer hover:border-primary' : ''}
                      ${selectedWidget?.id === widget.id ? 'border-primary ring-2 ring-primary/20' : 'border-border'}
                    `}
                    style={{
                      gridColumn: `span ${widget.gridWidth}`,
                      gridRow: `span ${widget.gridHeight}`,
                    }}
                    onClick={() => editMode && setSelectedWidget(widget)}
                  >
                    <div className="absolute inset-0 p-3 flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {editMode && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                          {categoryIcons[widget.category]}
                          <span className="font-medium text-sm truncate">{widget.widgetName}</span>
                        </div>
                        {!widget.isVisible && <EyeOff className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
                        {widget.gridWidth}x{widget.gridHeight}
                      </div>
                    </div>

                    {/* Edit controls */}
                    {editMode && selectedWidget?.id === widget.id && (
                      <div className="absolute -top-10 left-0 right-0 flex items-center justify-center gap-1 bg-background border rounded-lg p-1 shadow-lg z-10">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); handleMoveWidget(widget, 'up'); }}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); handleMoveWidget(widget, 'down'); }}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); handleMoveWidget(widget, 'left'); }}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); handleMoveWidget(widget, 'right'); }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-5 bg-border mx-1" />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); handleResizeWidget(widget, false); }}
                        >
                          <Minimize2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); handleResizeWidget(widget, true); }}
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-5 bg-border mx-1" />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); handleToggleVisibility(widget); }}
                        >
                          {widget.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); removeWidgetMutation.mutate({ id: widget.id }); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {widgets.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <LayoutGrid className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có widget nào</p>
                    <p className="text-sm">Click "Thêm Widget" để bắt đầu</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Widget List */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách Widget ({widgets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border
                    ${selectedWidget?.id === widget.id ? 'border-primary bg-primary/5' : 'border-border'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${categoryColors[widget.category]}`}>
                      {categoryIcons[widget.category]}
                    </div>
                    <div>
                      <div className="font-medium">{widget.widgetName}</div>
                      <div className="text-xs text-muted-foreground">
                        Vị trí: ({widget.gridX}, {widget.gridY}) | Kích thước: {widget.gridWidth}x{widget.gridHeight}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={widget.isVisible ? "default" : "secondary"}>
                      {widget.isVisible ? "Hiển thị" : "Ẩn"}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleToggleVisibility(widget)}
                    >
                      {widget.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeWidgetMutation.mutate({ id: widget.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
