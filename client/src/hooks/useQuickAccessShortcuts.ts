import { useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuickAccess } from "./useQuickAccess";
import { toast } from "sonner";

/**
 * Hook để xử lý keyboard shortcuts cho Quick Access
 * Ctrl+1 đến Ctrl+9 để truy cập nhanh 9 items đầu tiên
 * Ctrl+0 để mở trang quản lý Quick Access
 */
export function useQuickAccessShortcuts() {
  const [, setLocation] = useLocation();
  const { quickAccessItems } = useQuickAccess();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Chỉ xử lý khi nhấn Ctrl (hoặc Cmd trên Mac)
    if (!event.ctrlKey && !event.metaKey) return;
    
    // Bỏ qua nếu đang focus vào input/textarea
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    // Ctrl+0: Mở trang quản lý Quick Access
    if (event.key === '0') {
      event.preventDefault();
      setLocation('/quick-access');
      toast.info('Mở Quản lý Quick Access', { duration: 1500 });
      return;
    }

    // Ctrl+1 đến Ctrl+9: Truy cập Quick Access items
    const keyNum = parseInt(event.key);
    if (keyNum >= 1 && keyNum <= 9) {
      event.preventDefault();
      
      const itemIndex = keyNum - 1;
      if (itemIndex < quickAccessItems.length) {
        const item = quickAccessItems[itemIndex];
        setLocation(item.menuPath);
        toast.info(`Đi đến: ${item.menuLabel}`, { duration: 1500 });
      } else {
        toast.warning(`Quick Access #${keyNum} chưa được thiết lập`, { duration: 1500 });
      }
    }
  }, [quickAccessItems, setLocation]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Return shortcut info for display
  return {
    shortcuts: quickAccessItems.slice(0, 9).map((item, index) => ({
      key: `Ctrl+${index + 1}`,
      label: item.menuLabel,
      path: item.menuPath,
    })),
    managementShortcut: 'Ctrl+0',
  };
}

/**
 * Component để hiển thị shortcut hint
 */
export function getShortcutHint(index: number): string | null {
  if (index >= 0 && index < 9) {
    return `Ctrl+${index + 1}`;
  }
  return null;
}
