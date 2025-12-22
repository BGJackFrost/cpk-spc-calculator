import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useKeyboardShortcuts, createNavigationShortcuts, createCommonShortcuts, createQuickAccessShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { useQuickAccess } from "@/hooks/useQuickAccess";

interface GlobalKeyboardShortcutsProps {
  children: React.ReactNode;
}

export function GlobalKeyboardShortcuts({ children }: GlobalKeyboardShortcutsProps) {
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [, navigate] = useLocation();
  const { quickAccessItems } = useQuickAccess();

  // Create navigation shortcuts
  const navigationShortcuts = createNavigationShortcuts(navigate);

  // Create common shortcuts with help toggle
  const commonShortcuts = createCommonShortcuts({
    onHelp: () => setShowShortcutsDialog(true),
  });

  // Create Quick Access shortcuts
  const quickAccessShortcuts = useMemo(
    () => createQuickAccessShortcuts(navigate, quickAccessItems),
    [navigate, quickAccessItems]
  );

  // Combine all shortcuts
  const allShortcuts = [...navigationShortcuts, ...commonShortcuts, ...quickAccessShortcuts];

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
