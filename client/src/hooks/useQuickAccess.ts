import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks";
import { ALL_SYSTEM_MENUS, MenuItem, MenuGroup } from "@/config/systemMenu";
import { Star, Folder, type LucideIcon } from "lucide-react";

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
  categoryId: number | null;
  isPinned: boolean;
  icon: LucideIcon;
}

export interface QuickAccessCategory {
  id: number;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  isExpanded: boolean;
  items: QuickAccessItem[];
}

export function useQuickAccess() {
  const { user } = useAuth();
  
  // Fetch items by category
  const { data: categoryData, isLoading, refetch } = trpc.quickAccess.listByCategory.useQuery(
    undefined,
    {
      enabled: !!user,
      staleTime: 30000, // 30 seconds
    }
  );

  // Fetch categories list
  const { data: categoriesData, refetch: refetchCategories } = trpc.quickAccess.listCategories.useQuery(
    undefined,
    {
      enabled: !!user,
      staleTime: 30000,
    }
  );

  // Fetch pin limit
  const { data: pinLimitData, refetch: refetchPinLimit } = trpc.quickAccess.getPinLimit.useQuery(
    undefined,
    {
      enabled: !!user,
      staleTime: 30000,
    }
  );

  // Transform to QuickAccessItem format
  const transformItem = (item: any): QuickAccessItem => ({
    id: item.id,
    menuId: item.menuId,
    menuPath: item.menuPath,
    menuLabel: item.menuLabel,
    sortOrder: item.sortOrder,
    categoryId: item.categoryId,
    isPinned: item.isPinned === 1,
    icon: iconMap[item.menuPath] || Star,
  });

  // Categories with items
  const categories: QuickAccessCategory[] = useMemo(() => {
    if (!categoryData?.categories) return [];
    
    return categoryData.categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon || "Folder",
      color: cat.color || "blue",
      sortOrder: cat.sortOrder,
      isExpanded: cat.isExpanded === 1,
      items: cat.items.map(transformItem),
    }));
  }, [categoryData]);

  // Uncategorized items
  const uncategorizedItems: QuickAccessItem[] = useMemo(() => {
    if (!categoryData?.uncategorized) return [];
    return categoryData.uncategorized.map(transformItem);
  }, [categoryData]);

  // Pinned items
  const pinnedItems: QuickAccessItem[] = useMemo(() => {
    if (!categoryData?.pinned) return [];
    return categoryData.pinned.map(transformItem);
  }, [categoryData]);

  // All items flat (for backward compatibility)
  const quickAccessItems: QuickAccessItem[] = useMemo(() => {
    const allItems: QuickAccessItem[] = [];
    allItems.push(...pinnedItems); // Pinned items first
    categories.forEach(cat => allItems.push(...cat.items));
    allItems.push(...uncategorizedItems);
    return allItems;
  }, [pinnedItems, categories, uncategorizedItems]);

  // Convert to MenuItem format for sidebar (flat list)
  const quickAccessMenuItems: MenuItem[] = useMemo(() => {
    return quickAccessItems.map(item => ({
      id: `quick-${item.menuId}`,
      icon: item.icon,
      labelKey: item.menuLabel, // Use label directly instead of key
      path: item.menuPath,
    }));
  }, [quickAccessItems]);

  // Convert to MenuGroup format for sidebar (with categories)
  const quickAccessMenuGroups: MenuGroup[] = useMemo(() => {
    const groups: MenuGroup[] = [];
    
    // Add category groups
    categories.forEach(cat => {
      if (cat.items.length > 0) {
        groups.push({
          id: `quick-cat-${cat.id}`,
          labelKey: cat.name,
          icon: Folder, // Will be replaced with dynamic icon
          defaultOpen: cat.isExpanded,
          items: cat.items.map(item => ({
            id: `quick-${item.menuId}`,
            icon: item.icon,
            labelKey: item.menuLabel,
            path: item.menuPath,
          })),
        });
      }
    });
    
    // Add uncategorized items as a group if any
    if (uncategorizedItems.length > 0) {
      groups.push({
        id: "quick-uncategorized",
        labelKey: "Chưa phân loại",
        icon: Star,
        defaultOpen: true,
        items: uncategorizedItems.map(item => ({
          id: `quick-${item.menuId}`,
          icon: item.icon,
          labelKey: item.menuLabel,
          path: item.menuPath,
        })),
      });
    }
    
    return groups;
  }, [categories, uncategorizedItems]);

  const refetchAll = () => {
    refetch();
    refetchCategories();
    refetchPinLimit();
  };

  return {
    // Items
    quickAccessItems,
    quickAccessMenuItems,
    uncategorizedItems,
    pinnedItems,
    
    // Categories
    categories,
    categoriesData: categoriesData || [],
    quickAccessMenuGroups,
    
    // Pin limit
    maxPinned: pinLimitData?.maxPinned ?? 5,
    currentPinned: pinLimitData?.currentPinned ?? 0,
    
    // State
    isLoading,
    hasQuickAccess: quickAccessItems.length > 0,
    hasCategories: categories.length > 0,
    hasPinnedItems: pinnedItems.length > 0,
    
    // Actions
    refetch: refetchAll,
  };
}
