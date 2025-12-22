import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Star, StarOff, Plus, Trash2, GripVertical, Search, 
  LayoutDashboard, TrendingUp, HardHat, Factory, Key, Settings,
  ArrowUp, ArrowDown, RefreshCw
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { ALL_SYSTEM_MENUS, SYSTEMS } from "@/config/systemMenu";

// Icon mapping
const iconMap: Record<string, any> = {
  LayoutDashboard, TrendingUp, HardHat, Factory, Key, Settings
};

// Get all available menu items from all systems
function getAllMenuItems() {
  const items: Array<{
    id: string;
    path: string;
    label: string;
    icon: string;
    systemId: string;
    systemName: string;
    systemColor: string;
  }> = [];

  Object.entries(ALL_SYSTEM_MENUS).forEach(([systemId, config]) => {
    config.menuGroups.forEach(group => {
      group.items.forEach(item => {
        items.push({
          id: item.id,
          path: item.path,
          label: item.labelKey,
          icon: item.icon?.name || "Star",
          systemId,
          systemName: config.system.shortName,
          systemColor: config.system.color,
        });
      });
    });
  });

  return items;
}

export default function QuickAccessManagement() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSystem, setSelectedSystem] = useState<string>("all");

  // Fetch user's quick access items
  const { data: quickAccessItems = [], refetch, isLoading } = trpc.quickAccess.list.useQuery();

  // Mutations
  const addMutation = trpc.quickAccess.add.useMutation({
    onSuccess: () => {
      toast.success("Đã thêm vào Quick Access");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeMutation = trpc.quickAccess.remove.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa khỏi Quick Access");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const reorderMutation = trpc.quickAccess.reorder.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật thứ tự");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const clearAllMutation = trpc.quickAccess.clearAll.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa tất cả Quick Access");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Get all available menu items
  const allMenuItems = useMemo(() => getAllMenuItems(), []);

  // Filter menu items
  const filteredMenuItems = useMemo(() => {
    return allMenuItems.filter(item => {
      const matchSearch = searchTerm === "" || 
        item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.path.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSystem = selectedSystem === "all" || item.systemId === selectedSystem;
      return matchSearch && matchSystem;
    });
  }, [allMenuItems, searchTerm, selectedSystem]);

  // Check if item is in quick access
  const isInQuickAccess = (menuId: string) => {
    return quickAccessItems.some(item => item.menuId === menuId);
  };

  // Add item to quick access
  const handleAdd = (item: typeof allMenuItems[0]) => {
    addMutation.mutate({
      menuId: item.id,
      menuPath: item.path,
      menuLabel: item.label,
      menuIcon: item.icon,
      systemId: item.systemId,
    });
  };

  // Remove item from quick access
  const handleRemove = (id: number) => {
    removeMutation.mutate({ id });
  };

  // Move item up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...quickAccessItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    reorderMutation.mutate({
      items: newItems.map((item, idx) => ({ id: item.id, sortOrder: idx })),
    });
  };

  // Move item down
  const handleMoveDown = (index: number) => {
    if (index === quickAccessItems.length - 1) return;
    const newItems = [...quickAccessItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    reorderMutation.mutate({
      items: newItems.map((item, idx) => ({ id: item.id, sortOrder: idx })),
    });
  };

  // Get system color class
  const getSystemColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      orange: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      green: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      purple: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      slate: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
      emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Quản lý Quick Access</h1>
            <p className="text-muted-foreground mt-1">
              Tùy chỉnh menu truy cập nhanh trên Dashboard
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
            {quickAccessItems.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => clearAllMutation.mutate()}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa tất cả
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="my-quick-access" className="space-y-4">
          <TabsList>
            <TabsTrigger value="my-quick-access">
              <Star className="h-4 w-4 mr-2" />
              Quick Access của tôi ({quickAccessItems.length})
            </TabsTrigger>
            <TabsTrigger value="add-new">
              <Plus className="h-4 w-4 mr-2" />
              Thêm mới
            </TabsTrigger>
          </TabsList>

          {/* My Quick Access Tab */}
          <TabsContent value="my-quick-access">
            <Card>
              <CardHeader>
                <CardTitle>Menu Quick Access</CardTitle>
                <CardDescription>
                  Các menu bạn đã thêm vào Quick Access. Sử dụng mũi tên để sắp xếp thứ tự.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Đang tải...
                  </div>
                ) : quickAccessItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <StarOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có menu nào trong Quick Access</p>
                    <p className="text-sm mt-2">
                      Chuyển sang tab "Thêm mới" để thêm menu yêu thích
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {quickAccessItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.menuLabel}</span>
                            {item.systemId && (
                              <Badge variant="secondary" className="text-xs">
                                {item.systemId.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">{item.menuPath}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === quickAccessItems.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemove(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Add New Tab */}
          <TabsContent value="add-new">
            <Card>
              <CardHeader>
                <CardTitle>Thêm menu vào Quick Access</CardTitle>
                <CardDescription>
                  Chọn menu từ các hệ thống để thêm vào Quick Access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm menu..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <select
                    value={selectedSystem}
                    onChange={(e) => setSelectedSystem(e.target.value)}
                    className="px-3 py-2 rounded-md border bg-background"
                  >
                    <option value="all">Tất cả hệ thống</option>
                    {Object.entries(SYSTEMS).map(([key, system]) => (
                      <option key={key} value={system.id}>
                        {system.shortName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Menu Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredMenuItems.map((item) => {
                    const inQuickAccess = isInQuickAccess(item.id);
                    return (
                      <div
                        key={`${item.systemId}-${item.id}`}
                        className={`p-3 rounded-lg border transition-colors ${
                          inQuickAccess 
                            ? "bg-primary/10 border-primary" 
                            : "hover:bg-accent/50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${getSystemColorClass(item.systemColor)}`}
                              >
                                {item.systemName}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{item.path}</span>
                            </div>
                          </div>
                          <Button
                            variant={inQuickAccess ? "secondary" : "outline"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              if (inQuickAccess) {
                                const qaItem = quickAccessItems.find(q => q.menuId === item.id);
                                if (qaItem) handleRemove(qaItem.id);
                              } else {
                                handleAdd(item);
                              }
                            }}
                          >
                            {inQuickAccess ? (
                              <Star className="h-4 w-4 fill-current text-yellow-500" />
                            ) : (
                              <StarOff className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredMenuItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Không tìm thấy menu phù hợp
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
