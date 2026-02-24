import { useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Star, StarOff, ExternalLink, Copy, Pin, PinOff } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useQuickAccess } from "@/hooks/useQuickAccess";

interface MenuItemContextMenuProps {
  children: React.ReactNode;
  menuId: string;
  menuPath: string;
  menuLabel: string;
  menuIcon?: string;
  systemId?: string;
  onNavigate?: () => void;
}

export function MenuItemContextMenu({
  children,
  menuId,
  menuPath,
  menuLabel,
  menuIcon = "Star",
  systemId = "",
  onNavigate,
}: MenuItemContextMenuProps) {
  const { quickAccessItems, refetch } = useQuickAccess();
  const [isOpen, setIsOpen] = useState(false);

  // Check if item is in quick access
  const quickAccessItem = quickAccessItems.find(item => item.menuId === menuId);
  const isInQuickAccess = !!quickAccessItem;

  // Add mutation
  const addMutation = trpc.quickAccess.add.useMutation({
    onSuccess: () => {
      toast.success("Đã thêm vào Quick Access", {
        description: menuLabel,
        duration: 2000,
      });
      refetch();
    },
    onError: (error) => {
      toast.error("Không thể thêm vào Quick Access", {
        description: error.message,
      });
    },
  });

  // Remove mutation
  const removeMutation = trpc.quickAccess.remove.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa khỏi Quick Access", {
        description: menuLabel,
        duration: 2000,
      });
      refetch();
    },
    onError: (error) => {
      toast.error("Không thể xóa khỏi Quick Access", {
        description: error.message,
      });
    },
  });

  // Toggle pin mutation
  const togglePinMutation = trpc.quickAccess.togglePin.useMutation({
    onSuccess: (data) => {
      toast.success(data.isPinned ? "Đã ghim menu" : "Đã bỏ ghim menu", {
        description: menuLabel,
        duration: 2000,
        icon: data.isPinned ? <Pin className="h-4 w-4 text-amber-500 animate-bounce" /> : <PinOff className="h-4 w-4 text-muted-foreground" />,
      });
      refetch();
    },
    onError: (error) => {
      toast.error("Không thể thay đổi trạng thái ghim", {
        description: error.message,
      });
    },
  });

  const handleToggleQuickAccess = () => {
    if (isInQuickAccess && quickAccessItem) {
      removeMutation.mutate({ id: quickAccessItem.id });
    } else {
      addMutation.mutate({
        menuId,
        menuPath,
        menuLabel,
        menuIcon,
        systemId,
      });
    }
    setIsOpen(false);
  };

  const handleTogglePin = () => {
    if (quickAccessItem) {
      togglePinMutation.mutate({ id: quickAccessItem.id });
    }
    setIsOpen(false);
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(menuPath);
    toast.success("Đã copy đường dẫn", { duration: 1500 });
    setIsOpen(false);
  };

  const handleOpenNewTab = () => {
    window.open(menuPath, "_blank");
    setIsOpen(false);
  };

  return (
    <ContextMenu  >
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem
          onClick={handleToggleQuickAccess}
          className="flex items-center gap-2"
        >
          {isInQuickAccess ? (
            <>
              <StarOff className="h-4 w-4" />
              <span>Xóa khỏi Quick Access</span>
            </>
          ) : (
            <>
              <Star className="h-4 w-4" />
              <span>Thêm vào Quick Access</span>
            </>
          )}
        </ContextMenuItem>
        
        {isInQuickAccess && quickAccessItem && (
          <ContextMenuItem
            onClick={handleTogglePin}
            className="flex items-center gap-2"
          >
            {quickAccessItem.isPinned ? (
              <>
                <PinOff className="h-4 w-4" />
                <span>Bỏ ghim</span>
              </>
            ) : (
              <>
                <Pin className="h-4 w-4" />
                <span>Ghim lên đầu</span>
              </>
            )}
          </ContextMenuItem>
        )}
        
        <ContextMenuSeparator />
        
        <ContextMenuItem
          onClick={handleOpenNewTab}
          className="flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          <span>Mở trong tab mới</span>
        </ContextMenuItem>
        
        <ContextMenuItem
          onClick={handleCopyPath}
          className="flex items-center gap-2"
        >
          <Copy className="h-4 w-4" />
          <span>Copy đường dẫn</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
