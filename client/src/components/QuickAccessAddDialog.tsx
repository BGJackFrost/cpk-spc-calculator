import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Star, StarOff, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ALL_SYSTEM_MENUS, SYSTEMS } from "@/config/systemMenu";

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

interface QuickAccessAddDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function QuickAccessAddDialog({ trigger, onSuccess }: QuickAccessAddDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSystem, setSelectedSystem] = useState<string>("all");

  // Fetch user's quick access items
  const { data: quickAccessItems = [], refetch } = trpc.quickAccess.list.useQuery();

  // Add mutation
  const addMutation = trpc.quickAccess.add.useMutation({
    onSuccess: () => {
      toast.success("Đã thêm vào Quick Access");
      refetch();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Remove mutation
  const removeMutation = trpc.quickAccess.remove.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa khỏi Quick Access");
      refetch();
      onSuccess?.();
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

  // Toggle item
  const handleToggle = (item: typeof allMenuItems[0]) => {
    if (isInQuickAccess(item.id)) {
      const qaItem = quickAccessItems.find(q => q.menuId === item.id);
      if (qaItem) {
        removeMutation.mutate({ id: qaItem.id });
      }
    } else {
      addMutation.mutate({
        menuId: item.id,
        menuPath: item.path,
        menuLabel: item.label,
        menuIcon: item.icon,
        systemId: item.systemId,
      });
    }
  };

  // Get system color class
  const getSystemColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
      orange: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
      green: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
      purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
      slate: "bg-slate-100 text-slate-800 dark:bg-slate-900/50 dark:text-slate-300",
      emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Thêm vào Quick Access</DialogTitle>
          <DialogDescription>
            Chọn menu để thêm vào danh sách truy cập nhanh
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-2">
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
              className="px-3 py-2 rounded-md border bg-background text-sm"
            >
              <option value="all">Tất cả</option>
              {Object.entries(SYSTEMS).map(([key, system]) => (
                <option key={key} value={system.id}>
                  {system.shortName}
                </option>
              ))}
            </select>
          </div>

          {/* Menu Items List */}
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {filteredMenuItems.map((item) => {
                const inQuickAccess = isInQuickAccess(item.id);
                return (
                  <button
                    key={`${item.systemId}-${item.id}`}
                    onClick={() => handleToggle(item)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                      inQuickAccess 
                        ? "bg-primary/10 border-primary/50" 
                        : "hover:bg-accent/50 border-transparent hover:border-border"
                    }`}
                  >
                    <div className={`p-1.5 rounded ${inQuickAccess ? "bg-primary/20" : "bg-muted"}`}>
                      {inQuickAccess ? (
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      ) : (
                        <StarOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.label}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getSystemColorClass(item.systemColor)}`}
                        >
                          {item.systemName}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">{item.path}</span>
                      </div>
                    </div>
                    {inQuickAccess && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
              
              {filteredMenuItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Không tìm thấy menu phù hợp
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer info */}
          <div className="text-xs text-muted-foreground text-center">
            Đã chọn {quickAccessItems.length} menu
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
