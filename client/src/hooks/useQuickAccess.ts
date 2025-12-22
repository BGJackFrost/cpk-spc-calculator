import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks";
import { ALL_SYSTEM_MENUS, MenuItem } from "@/config/systemMenu";
import { Star, type LucideIcon } from "lucide-react";

// Map icon names to actual icons
const iconMap: Record<string, LucideIcon> = {};

// Build icon map from all system menus
Object.values(ALL_SYSTEM_MENUS).forEach(menu => {
  menu.menuGroups.forEach(group => {
    group.items.forEach(item => {
      // Store icon by path for lookup
      iconMap[item.path] = item.icon;
    });
  });
});

export interface QuickAccessItem {
  id: number;
  menuId: string;
  menuPath: string;
  menuLabel: string;
  sortOrder: number;
  icon: LucideIcon;
}

export function useQuickAccess() {
  const { user } = useAuth();
  
  const { data: quickAccessData, isLoading, refetch } = trpc.quickAccess.list.useQuery(
    undefined,
    {
      enabled: !!user,
      staleTime: 30000, // 30 seconds
    }
  );

  // Transform quick access data to menu items
  const quickAccessItems = useMemo(() => {
    if (!quickAccessData) return [];
    
    return quickAccessData.map(item => ({
      id: item.id,
      menuId: item.menuId,
      menuPath: item.menuPath,
      menuLabel: item.menuLabel,
      sortOrder: item.sortOrder,
      icon: iconMap[item.menuPath] || Star,
    }));
  }, [quickAccessData]);

  // Convert to MenuItem format for sidebar
  const quickAccessMenuItems: MenuItem[] = useMemo(() => {
    return quickAccessItems.map(item => ({
      id: `quick-${item.menuId}`,
      icon: item.icon,
      labelKey: item.menuLabel, // Use label directly instead of key
      path: item.menuPath,
    }));
  }, [quickAccessItems]);

  return {
    quickAccessItems,
    quickAccessMenuItems,
    isLoading,
    refetch,
    hasQuickAccess: quickAccessItems.length > 0,
  };
}
