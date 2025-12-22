import { useEffect, useCallback, useState } from "react";
import { toast } from "sonner";

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: ShortcutConfig[];
  enabled?: boolean;
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      const isInputField = 
        target.tagName === "INPUT" || 
        target.tagName === "TEXTAREA" || 
        target.isContentEditable;

      // Allow Escape and Ctrl+/ even in input fields
      const isEscapeOrHelp = 
        event.key === "Escape" || 
        (event.ctrlKey && event.key === "/");

      if (isInputField && !isEscapeOrHelp) return;

      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue;

        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const toggleHelp = useCallback(() => {
    setShowHelp((prev) => !prev);
  }, []);

  return { showHelp, setShowHelp, toggleHelp };
}

// Predefined common shortcuts
export function createCommonShortcuts(options: {
  onSave?: () => void;
  onSubmit?: () => void;
  onClose?: () => void;
  onNew?: () => void;
  onSearch?: () => void;
  onRefresh?: () => void;
  onHelp?: () => void;
}): ShortcutConfig[] {
  const shortcuts: ShortcutConfig[] = [];

  if (options.onSave) {
    shortcuts.push({
      key: "s",
      ctrl: true,
      action: options.onSave,
      description: "Lưu (Ctrl+S)",
    });
  }

  if (options.onSubmit) {
    shortcuts.push({
      key: "Enter",
      ctrl: true,
      action: options.onSubmit,
      description: "Chạy/Submit (Ctrl+Enter)",
    });
  }

  if (options.onClose) {
    shortcuts.push({
      key: "Escape",
      action: options.onClose,
      description: "Đóng (Esc)",
    });
  }

  if (options.onNew) {
    shortcuts.push({
      key: "n",
      ctrl: true,
      action: options.onNew,
      description: "Tạo mới (Ctrl+N)",
    });
  }

  if (options.onSearch) {
    shortcuts.push({
      key: "k",
      ctrl: true,
      action: options.onSearch,
      description: "Tìm kiếm (Ctrl+K)",
    });
  }

  if (options.onRefresh) {
    shortcuts.push({
      key: "r",
      ctrl: true,
      action: options.onRefresh,
      description: "Làm mới (Ctrl+R)",
    });
  }

  if (options.onHelp) {
    shortcuts.push({
      key: "/",
      ctrl: true,
      action: options.onHelp,
      description: "Hiển thị phím tắt (Ctrl+/)",
    });
  }

  return shortcuts;
}

// Keyboard shortcuts help dialog content
export const GLOBAL_SHORTCUTS = [
  { keys: "Ctrl + S", description: "Lưu form hiện tại", descriptionEn: "Save current form" },
  { keys: "Ctrl + Enter", description: "Chạy phân tích / Submit", descriptionEn: "Run analysis / Submit" },
  { keys: "Esc", description: "Đóng dialog / Hủy", descriptionEn: "Close dialog / Cancel" },
  { keys: "Ctrl + N", description: "Tạo mới", descriptionEn: "Create new" },
  { keys: "Ctrl + K", description: "Tìm kiếm", descriptionEn: "Search" },
  { keys: "Ctrl + /", description: "Hiển thị phím tắt", descriptionEn: "Show shortcuts" },
];

// Navigation shortcuts
export const NAVIGATION_SHORTCUTS = [
  { keys: "Ctrl + D", description: "Đi đến Dashboard", descriptionEn: "Go to Dashboard", path: "/dashboard" },
  { keys: "Ctrl + A", description: "Đi đến Phân tích", descriptionEn: "Go to Analysis", path: "/analyze" },
  { keys: "Ctrl + H", description: "Đi đến Lịch sử", descriptionEn: "Go to History", path: "/history" },
  { keys: "Ctrl + M", description: "Đi đến Tổng quan Máy", descriptionEn: "Go to Machine Overview", path: "/machine-overview" },
  { keys: "Ctrl + O", description: "Đi đến Dashboard OEE", descriptionEn: "Go to OEE Dashboard", path: "/oee-dashboard" },
  { keys: "Ctrl + E", description: "Đi đến Xuất Báo cáo", descriptionEn: "Go to Export Reports", path: "/export-reports" },
  { keys: "Ctrl + Shift + R", description: "Đi đến Tạo Báo cáo", descriptionEn: "Go to Report Builder", path: "/custom-report-builder" },
];

// Quick Access shortcuts
export const QUICK_ACCESS_SHORTCUTS = [
  { keys: "Ctrl + 1", description: "Quick Access #1", descriptionEn: "Quick Access #1" },
  { keys: "Ctrl + 2", description: "Quick Access #2", descriptionEn: "Quick Access #2" },
  { keys: "Ctrl + 3", description: "Quick Access #3", descriptionEn: "Quick Access #3" },
  { keys: "Ctrl + 4", description: "Quick Access #4", descriptionEn: "Quick Access #4" },
  { keys: "Ctrl + 5", description: "Quick Access #5", descriptionEn: "Quick Access #5" },
  { keys: "Ctrl + 6", description: "Quick Access #6", descriptionEn: "Quick Access #6" },
  { keys: "Ctrl + 7", description: "Quick Access #7", descriptionEn: "Quick Access #7" },
  { keys: "Ctrl + 8", description: "Quick Access #8", descriptionEn: "Quick Access #8" },
  { keys: "Ctrl + 9", description: "Quick Access #9", descriptionEn: "Quick Access #9" },
  { keys: "Ctrl + 0", description: "Quản lý Quick Access", descriptionEn: "Manage Quick Access" },
];

// Create Quick Access shortcuts config
export function createQuickAccessShortcuts(
  navigate: (path: string) => void,
  quickAccessItems: Array<{ menuPath: string; menuLabel: string }>
): ShortcutConfig[] {
  const shortcuts: ShortcutConfig[] = [];
  
  // Ctrl+1 to Ctrl+9 for Quick Access items
  for (let i = 0; i < 9; i++) {
    const item = quickAccessItems[i];
    shortcuts.push({
      key: String(i + 1),
      ctrl: true,
      action: () => {
        if (item) {
          navigate(item.menuPath);
          toast.info(`Đi đến: ${item.menuLabel}`, { duration: 1500 });
        } else {
          toast.warning(`Quick Access #${i + 1} chưa được thiết lập`, { duration: 1500 });
        }
      },
      description: item ? `Đi đến ${item.menuLabel}` : `Quick Access #${i + 1}`,
    });
  }
  
  // Ctrl+0 for Quick Access management
  shortcuts.push({
    key: "0",
    ctrl: true,
    action: () => {
      navigate("/quick-access");
      toast.info("Mở Quản lý Quick Access", { duration: 1500 });
    },
    description: "Quản lý Quick Access",
  });
  
  return shortcuts;
}

// Create navigation shortcuts config
export function createNavigationShortcuts(navigate: (path: string) => void): ShortcutConfig[] {
  return [
    { key: "d", ctrl: true, action: () => navigate("/dashboard"), description: "Đi đến Dashboard" },
    { key: "a", ctrl: true, action: () => navigate("/analyze"), description: "Đi đến Phân tích" },
    { key: "h", ctrl: true, action: () => navigate("/history"), description: "Đi đến Lịch sử" },
    { key: "m", ctrl: true, action: () => navigate("/machine-overview"), description: "Đi đến Tổng quan Máy" },
    { key: "o", ctrl: true, action: () => navigate("/oee-dashboard"), description: "Đi đến Dashboard OEE" },
    { key: "e", ctrl: true, action: () => navigate("/export-reports"), description: "Đi đến Xuất Báo cáo" },
    { key: "r", ctrl: true, shift: true, action: () => navigate("/custom-report-builder"), description: "Đi đến Tạo Báo cáo" },
  ];
}
