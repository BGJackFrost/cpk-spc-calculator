import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { GLOBAL_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  additionalShortcuts?: { keys: string; description: string }[];
}

export function KeyboardShortcutsHelp({ 
  open, 
  onOpenChange, 
  additionalShortcuts = [] 
}: KeyboardShortcutsHelpProps) {
  const allShortcuts = [...GLOBAL_SHORTCUTS, ...additionalShortcuts];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ⌨️ Phím tắt
          </DialogTitle>
          <DialogDescription>
            Sử dụng các phím tắt để thao tác nhanh hơn
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {allShortcuts.map((shortcut, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1">
                {shortcut.keys.split(" + ").map((key, keyIndex) => (
                  <span key={keyIndex} className="flex items-center gap-1">
                    {keyIndex > 0 && <span className="text-muted-foreground">+</span>}
                    <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border">
                      {key}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-xs text-muted-foreground text-center">
          Nhấn <kbd className="px-1 py-0.5 bg-muted rounded border text-xs">Esc</kbd> để đóng
        </div>
      </DialogContent>
    </Dialog>
  );
}
