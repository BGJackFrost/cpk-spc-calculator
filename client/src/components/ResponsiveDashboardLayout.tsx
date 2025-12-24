/**
 * ResponsiveDashboardLayout - Layout tối ưu cho cả desktop và mobile
 * Phase 3.3 - Mobile Optimization
 */

import { ReactNode, useState, useEffect } from 'react';
import { MobileNavigation, MobileBottomNav, MobileQuickActions } from './MobileNavigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Menu, Bell, Search, User, ChevronLeft } from 'lucide-react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';

interface ResponsiveDashboardLayoutProps {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
  actions?: ReactNode;
  className?: string;
}

// Hook để detect mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// Hook để detect orientation
function useOrientation() {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return isLandscape;
}

export function ResponsiveDashboardLayout({
  children,
  title,
  showBackButton = false,
  actions,
  className
}: ResponsiveDashboardLayoutProps) {
  const isMobile = useIsMobile();
  const isLandscape = useOrientation();
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className={cn(
      'min-h-screen bg-background',
      isMobile && 'pb-16', // Space for bottom nav
      className
    )}>
      {/* Mobile Header */}
      {isMobile && (
        <header className="sticky top-0 z-40 bg-background border-b safe-area-top">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-2">
              {showBackButton ? (
                <Button variant="ghost" size="icon" onClick={handleBack}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              ) : (
                <MobileNavigation />
              )}
              {title && (
                <h1 className="text-lg font-semibold truncate max-w-[200px]">
                  {title}
                </h1>
              )}
            </div>
            <div className="flex items-center gap-1">
              {actions}
              <Button variant="ghost" size="icon">
                <Search className="h-5 w-5" />
              </Button>
              <Link href="/notification-center">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
                </Button>
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={cn(
        'flex-1',
        isMobile ? 'px-4 py-4' : 'p-6',
        isLandscape && isMobile && 'px-6'
      )}>
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileBottomNav />}

      {/* Mobile Quick Actions FAB */}
      {isMobile && <MobileQuickActions />}
    </div>
  );
}

/**
 * Responsive Grid component
 */
interface ResponsiveGridProps {
  children: ReactNode;
  cols?: {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}

export function ResponsiveGrid({
  children,
  cols = { default: 1, sm: 2, md: 3, lg: 4 },
  gap = 4,
  className
}: ResponsiveGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };

  return (
    <div className={cn(
      'grid',
      gridCols[cols.default as keyof typeof gridCols],
      cols.sm && `sm:${gridCols[cols.sm as keyof typeof gridCols]}`,
      cols.md && `md:${gridCols[cols.md as keyof typeof gridCols]}`,
      cols.lg && `lg:${gridCols[cols.lg as keyof typeof gridCols]}`,
      cols.xl && `xl:${gridCols[cols.xl as keyof typeof gridCols]}`,
      `gap-${gap}`,
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Responsive Card với touch-friendly padding
 */
interface ResponsiveCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ResponsiveCard({ children, className, onClick }: ResponsiveCardProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        'bg-card rounded-lg border shadow-sm',
        isMobile ? 'p-4' : 'p-6',
        onClick && 'cursor-pointer active:scale-[0.98] transition-transform',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

/**
 * Responsive Table wrapper
 */
interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className={cn('overflow-x-auto -mx-4 px-4', className)}>
        <div className="min-w-[600px]">
          {children}
        </div>
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}

/**
 * Responsive Chart wrapper
 */
interface ResponsiveChartProps {
  children: ReactNode;
  height?: number;
  mobileHeight?: number;
  className?: string;
}

export function ResponsiveChart({
  children,
  height = 400,
  mobileHeight = 250,
  className
}: ResponsiveChartProps) {
  const isMobile = useIsMobile();
  const isLandscape = useOrientation();

  const chartHeight = isMobile
    ? isLandscape
      ? height * 0.8
      : mobileHeight
    : height;

  return (
    <div className={cn('w-full', className)} style={{ height: chartHeight }}>
      {children}
    </div>
  );
}

/**
 * Pull to Refresh wrapper
 */
interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
}

export function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const isMobile = useIsMobile();

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || window.scrollY > 0) return;
    // Store initial touch position
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || window.scrollY > 0) return;
    // Calculate pull distance
  };

  const handleTouchEnd = async () => {
    if (!isMobile || pullDistance < 80) {
      setPullDistance(0);
      return;
    }

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  };

  return (
    <div
      className={cn('relative', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center bg-background z-10 transition-all"
          style={{ height: Math.min(pullDistance, 80) }}
        >
          <div className={cn(
            'h-6 w-6 border-2 border-primary border-t-transparent rounded-full',
            isRefreshing && 'animate-spin'
          )} />
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * Swipeable Tabs cho mobile
 */
interface SwipeableTabsProps {
  tabs: { id: string; label: string; content: ReactNode }[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

export function SwipeableTabs({
  tabs,
  defaultTab,
  onChange,
  className
}: SwipeableTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const isMobile = useIsMobile();

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  return (
    <div className={className}>
      {/* Tab Headers */}
      <div className={cn(
        'flex border-b overflow-x-auto',
        isMobile && 'scrollbar-hide -mx-4 px-4'
      )}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              'px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              'border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {tabs.find(t => t.id === activeTab)?.content}
      </div>
    </div>
  );
}

export { useIsMobile, useOrientation };
export default ResponsiveDashboardLayout;
