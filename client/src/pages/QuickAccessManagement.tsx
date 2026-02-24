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
  RefreshCw, Download, Upload, FileJson, Folder, FolderPlus, Pencil, Palette
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { ALL_SYSTEM_MENUS, SYSTEMS } from "@/config/systemMenu";

// DnD Kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Spring animation config
const springTransition = {
  type: 'spring',
  damping: 25,
  stiffness: 300,
};

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

// Sortable Item Component
interface SortableItemProps {
  item: {
    id: number;
    menuId: string;
    menuPath: string;
    menuLabel: string;
    systemId: string | null;
    sortOrder: number;
  };
  onRemove: (id: number) => void;
}

function SortableItem({ item, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: item.id,
    transition: {
      duration: 250,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 250ms cubic-bezier(0.25, 1, 0.5, 1)',
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 1,
    scale: isDragging ? 1.02 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border bg-card transition-all duration-200 ${
        isDragging 
          ? "shadow-xl ring-2 ring-primary bg-primary/5 border-primary" 
          : "hover:bg-accent/50 hover:shadow-sm"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className={`cursor-grab active:cursor-grabbing touch-none p-1 rounded hover:bg-accent transition-colors ${
          isDragging ? "text-primary" : "text-muted-foreground"
        }`}
      >
        <GripVertical className="h-5 w-5" />
      </button>
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
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive"
        onClick={() => onRemove(item.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function QuickAccessManagement() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSystem, setSelectedSystem] = useState<string>("all");

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const importMutation = trpc.quickAccess.import.useMutation({
    onSuccess: (result) => {
      toast.success(`Import thành công: ${result.imported} items`, {
        description: result.skipped > 0 ? `Bỏ qua ${result.skipped} items trùng lặp` : undefined,
      });
      refetch();
    },
    onError: (error) => {
      toast.error("Import thất bại", { description: error.message });
    },
  });

  // Category queries and mutations
  const { data: categories = [], refetch: refetchCategories } = trpc.quickAccess.listCategories.useQuery();
  
  const createCategoryMutation = trpc.quickAccess.createCategory.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo danh mục mới");
      refetchCategories();
      setNewCategoryName("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateCategoryMutation = trpc.quickAccess.updateCategory.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật danh mục");
      refetchCategories();
      setEditingCategory(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteCategoryMutation = trpc.quickAccess.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa danh mục");
      refetchCategories();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const moveToCategoryMutation = trpc.quickAccess.moveToCategory.useMutation({
    onSuccess: () => {
      toast.success("Đã chuyển item vào danh mục");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Category state
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("blue");
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");

  // Export handler
  const handleExport = async () => {
    try {
      const data = await trpc.quickAccess.export.query();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quick-access-settings-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export thành công");
    } catch (error) {
      toast.error("Export thất bại");
    }
  };

  // Import handler
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Validate structure
        if (!data.version || !Array.isArray(data.items)) {
          throw new Error("File không hợp lệ");
        }

        importMutation.mutate({
          version: data.version,
          items: data.items,
          replaceExisting: true,
        });
      } catch (error) {
        toast.error("File không hợp lệ", {
          description: error instanceof Error ? error.message : "Vui lòng chọn file JSON hợp lệ",
        });
      }
    };
    input.click();
  };

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

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = quickAccessItems.findIndex(item => item.id === active.id);
      const newIndex = quickAccessItems.findIndex(item => item.id === over.id);

      const newItems = arrayMove(quickAccessItems, oldIndex, newIndex);
      
      reorderMutation.mutate({
        items: newItems.map((item, idx) => ({ id: item.id, sortOrder: idx })),
      });
    }
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
            <Button variant="outline" size="sm" onClick={handleExport} disabled={quickAccessItems.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
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
              Quick Access ({quickAccessItems.length})
            </TabsTrigger>
            <TabsTrigger value="categories">
              <Folder className="h-4 w-4 mr-2" />
              Danh mục
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
                  Kéo thả để sắp xếp thứ tự các menu yêu thích của bạn
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
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={quickAccessItems.map(item => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {quickAccessItems.map((item) => (
                          <SortableItem
                            key={item.id}
                            item={item}
                            onRemove={handleRemove}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Create New Category */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderPlus className="h-5 w-5" />
                    Tạo danh mục mới
                  </CardTitle>
                  <CardDescription>
                    Tạo danh mục tùy chỉnh để nhóm các menu Quick Access
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tên danh mục</label>
                    <Input
                      placeholder="Nhập tên danh mục..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Màu sắc</label>
                    <div className="flex gap-2 flex-wrap">
                      {["blue", "green", "purple", "orange", "red", "pink", "cyan", "yellow"].map(color => (
                        <button
                          key={color}
                          onClick={() => setNewCategoryColor(color)}
                          className={`w-8 h-8 rounded-full transition-all ${
                            newCategoryColor === color ? "ring-2 ring-offset-2 ring-primary" : ""
                          }`}
                          style={{ backgroundColor: `var(--${color}-500, ${color})` }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={() => createCategoryMutation.mutate({ name: newCategoryName, color: newCategoryColor })}
                    disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo danh mục
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Categories */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Folder className="h-5 w-5" />
                    Danh mục hiện có ({categories.length})
                  </CardTitle>
                  <CardDescription>
                    Quản lý các danh mục Quick Access của bạn
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {categories.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Chưa có danh mục nào</p>
                      <p className="text-sm mt-2">Tạo danh mục mới để nhóm các menu</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {categories.map((cat) => (
                        <div
                          key={cat.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div
                            className="w-4 h-4 rounded-full shrink-0"
                            style={{ backgroundColor: `var(--${cat.color}-500, ${cat.color})` }}
                          />
                          {editingCategory === cat.id ? (
                            <Input
                              value={editCategoryName}
                              onChange={(e) => setEditCategoryName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  updateCategoryMutation.mutate({ id: cat.id, name: editCategoryName });
                                } else if (e.key === "Escape") {
                                  setEditingCategory(null);
                                }
                              }}
                              autoFocus
                              className="flex-1"
                            />
                          ) : (
                            <span className="flex-1 font-medium">{cat.name}</span>
                          )}
                          <div className="flex gap-1">
                            {editingCategory === cat.id ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateCategoryMutation.mutate({ id: cat.id, name: editCategoryName })}
                                >
                                  <Star className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setEditingCategory(null)}
                                >
                                  <StarOff className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setEditingCategory(cat.id);
                                    setEditCategoryName(cat.name);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    if (confirm(`Xóa danh mục "${cat.name}"? Các menu trong danh mục sẽ chuyển về "Chưa phân loại".`)) {
                                      deleteCategoryMutation.mutate({ id: cat.id });
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Assign Items to Categories */}
            {categories.length > 0 && quickAccessItems.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Phân loại Quick Access</CardTitle>
                  <CardDescription>
                    Kéo thả hoặc chọn danh mục cho các menu Quick Access
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {quickAccessItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                      >
                        <Star className="h-4 w-4 text-yellow-500 shrink-0" />
                        <span className="flex-1 font-medium">{item.menuLabel}</span>
                        <select
                          value={item.categoryId || ""}
                          onChange={(e) => {
                            const categoryId = e.target.value ? parseInt(e.target.value) : null;
                            moveToCategoryMutation.mutate({ itemId: item.id, categoryId });
                          }}
                          className="px-3 py-1.5 rounded-md border bg-background text-sm"
                        >
                          <option value="">Chưa phân loại</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
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
