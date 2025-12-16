import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useKeyboardShortcuts, createNavigationShortcuts, createCommonShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";

interface GlobalKeyboardShortcutsProps {
  children: React.ReactNode;
}

export function GlobalKeyboardShortcuts({ children }: GlobalKeyboardShortcutsProps) {
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [, navigate] = useLocation();

  // Create navigation shortcuts
  const navigationShortcuts = createNavigationShortcuts(navigate);

  // Create common shortcuts with help toggle
  const commonShortcuts = createCommonShortcuts({
    onHelp: () => setShowShortcutsDialog(true),
  });

  // Combine all shortcuts
  const allShortcuts = [...navigationShortcuts, ...commonShortcuts];

  // Use the keyboard shortcuts hook
  useKeyboardShortcuts({
    shortcuts: allShortcuts,
    enabled: true,
  });

  // Listen for custom event to show shortcuts dialog
  useEffect(() => {
    const handleShowShortcuts = () => setShowShortcutsDialog(true);
    document.addEventListener("show-shortcuts-dialog", handleShowShortcuts);
    return () => document.removeEventListener("show-shortcuts-dialog", handleShowShortcuts);
  }, []);

  return (
    <>
      {children}
      <KeyboardShortcutsDialog
        open={showShortcutsDialog}
        onOpenChange={setShowShortcutsDialog}
      />
    </>
  );
}
