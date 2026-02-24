import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import { useQuickAccess } from "@/hooks/useQuickAccess";
import { Pin, Star, Folder } from "lucide-react";

interface QuickAccessSearchProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function QuickAccessSearch({ open: controlledOpen, onOpenChange }: QuickAccessSearchProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { quickAccessItems, pinnedItems, categories, uncategorizedItems } = useQuickAccess();

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Global keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  const handleSelect = useCallback((path: string) => {
    setLocation(path);
    setOpen(false);
  }, [setLocation, setOpen]);

  const hasItems = quickAccessItems.length > 0;

  return (
    <CommandDialog 
      open={open} 
      onOpenChange={setOpen}
      title="Tìm kiếm Quick Access"
      description="Tìm kiếm và điều hướng đến các menu đã lưu"
    >
      <CommandInput placeholder="Tìm kiếm menu..." />
      <CommandList>
        <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>
        
        {!hasItems && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Chưa có menu nào trong Quick Access</p>
            <p className="text-xs mt-1">Click chuột phải vào menu để thêm</p>
          </div>
        )}

        {/* Pinned Items */}
        {pinnedItems.length > 0 && (
          <CommandGroup heading="Đã ghim">
            {pinnedItems.map((item) => (
              <CommandItem
                key={`pinned-${item.id}`}
                value={`${item.menuLabel} ${item.menuPath}`}
                onSelect={() => handleSelect(item.menuPath)}
                className="cursor-pointer"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.menuLabel}</span>
                <Pin className="h-3 w-3 ml-auto text-amber-500" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Categorized Items */}
        {categories.map((category) => {
          if (category.items.length === 0) return null;
          return (
            <CommandGroup key={`cat-${category.id}`} heading={category.name}>
              {category.items.map((item) => (
                <CommandItem
                  key={`cat-${category.id}-${item.id}`}
                  value={`${item.menuLabel} ${item.menuPath} ${category.name}`}
                  onSelect={() => handleSelect(item.menuPath)}
                  className="cursor-pointer"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.menuLabel}</span>
                  <CommandShortcut>
                    <Folder className="h-3 w-3" style={{ color: category.color }} />
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}

        {/* Uncategorized Items */}
        {uncategorizedItems.length > 0 && (
          <CommandGroup heading="Chưa phân loại">
            {uncategorizedItems.map((item) => (
              <CommandItem
                key={`uncat-${item.id}`}
                value={`${item.menuLabel} ${item.menuPath}`}
                onSelect={() => handleSelect(item.menuPath)}
                className="cursor-pointer"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.menuLabel}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
      
      {/* Footer with keyboard hints */}
      <div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center gap-4">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
          <span>Di chuyển</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd>
          <span>Chọn</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd>
          <span>Đóng</span>
        </span>
      </div>
    </CommandDialog>
  );
}

// Hook to use the search dialog
export function useQuickAccessSearch() {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);
  const openSearch = useCallback(() => setOpen(true), []);
  const closeSearch = useCallback(() => setOpen(false), []);

  return {
    open,
    setOpen,
    toggle,
    openSearch,
    closeSearch,
  };
}
