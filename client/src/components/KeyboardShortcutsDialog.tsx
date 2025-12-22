import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GLOBAL_SHORTCUTS, NAVIGATION_SHORTCUTS, QUICK_ACCESS_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";
import { useQuickAccess } from "@/hooks/useQuickAccess";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const { language } = useLanguage();
  const { quickAccessItems } = useQuickAccess();

  // Generate dynamic Quick Access shortcuts with actual labels
  const dynamicQuickAccessShortcuts = QUICK_ACCESS_SHORTCUTS.map((shortcut, index) => {
    if (index < 9 && quickAccessItems[index]) {
      return {
        ...shortcut,
        description: quickAccessItems[index].menuLabel,
        descriptionEn: quickAccessItems[index].menuLabel,
      };
    }
    return shortcut;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            {language === "vi" ? "Phím tắt" : "Keyboard Shortcuts"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Global Shortcuts */}
          <div>
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
              {language === "vi" ? "Phím tắt chung" : "Global Shortcuts"}
            </h3>
            <div className="grid gap-2">
              {GLOBAL_SHORTCUTS.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                >
                  <span className="text-sm">
                    {language === "vi" ? shortcut.description : shortcut.descriptionEn}
                  </span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {shortcut.keys}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Access Shortcuts */}
          <div>
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Star className="h-4 w-4" />
              {language === "vi" ? "Truy cập nhanh" : "Quick Access"}
            </h3>
            <div className="grid gap-2">
              {dynamicQuickAccessShortcuts.map((shortcut, index) => {
                const isConfigured = index < 9 && quickAccessItems[index];
                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                      isConfigured ? "bg-primary/10" : "bg-muted/50 opacity-60"
                    }`}
                  >
                    <span className="text-sm flex items-center gap-2">
                      {isConfigured && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />}
                      {language === "vi" ? shortcut.description : shortcut.descriptionEn}
                    </span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {shortcut.keys}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation Shortcuts */}
          <div>
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
              {language === "vi" ? "Điều hướng" : "Navigation"}
            </h3>
            <div className="grid gap-2">
              {NAVIGATION_SHORTCUTS.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                >
                  <span className="text-sm">
                    {language === "vi" ? shortcut.description : shortcut.descriptionEn}
                  </span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {shortcut.keys}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="text-xs text-muted-foreground border-t pt-4">
            <p>
              {language === "vi" 
                ? "💡 Nhấn Ctrl + / để mở dialog này bất cứ lúc nào"
                : "💡 Press Ctrl + / to open this dialog anytime"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
