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

  return shortcuts;
}

// Keyboard shortcuts help dialog content
export const GLOBAL_SHORTCUTS = [
  { keys: "Ctrl + S", description: "Lưu form hiện tại" },
  { keys: "Ctrl + Enter", description: "Chạy phân tích / Submit" },
  { keys: "Esc", description: "Đóng dialog / Hủy" },
  { keys: "Ctrl + N", description: "Tạo mới" },
  { keys: "Ctrl + K", description: "Tìm kiếm" },
  { keys: "Ctrl + /", description: "Hiển thị phím tắt" },
];
