/**
 * MobileNavigation - Navigation component tối ưu cho mobile
 * Phase 3.3 - Mobile Optimization
 */

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Menu, X, Home, BarChart3, Settings, Users, Database, FileText,
  Activity, Bell, ChevronDown, ChevronRight, Gauge, Factory,
  Wrench, Shield, Brain, Wifi, AlertTriangle, TrendingUp
} from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  badge?: string;
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  {
    title: 'Tổng quan',
    icon: Home,
    children: [
      { title: 'Dashboard', href: '/dashboard', icon: Gauge },
      { title: 'Unified Dashboard', href: '/unified-dashboard', icon: Activity },
      { title: 'CEO Dashboard', href: '/ceo-dashboard', icon: TrendingUp },
    ]
  },
  {
    title: 'SPC/CPK',
    icon: BarChart3,
    children: [
      { title: 'Phân tích SPC', href: '/analyze', icon: BarChart3 },
      { title: 'Lịch sử phân tích', href: '/history', icon: FileText },
      { title: 'Kế hoạch SPC', href: '/spc-plans', icon: FileText },
      { title: 'Báo cáo SPC', href: '/spc-report', icon: FileText },
      { title: 'So sánh CPK', href: '/cpk-comparison', icon: TrendingUp },
    ]
  },
  {
    title: 'Sản xuất',
    icon: Factory,
    children: [
      { title: 'Dây chuyền', href: '/production-lines', icon: Factory },
      { title: 'Realtime Line', href: '/realtime-line', icon: Activity },
      { title: 'OEE Dashboard', href: '/oee-dashboard', icon: Gauge },
      { title: 'Machine Overview', href: '/machine-overview', icon: Wrench },
    ]
  },
  {
    title: 'Bảo trì',
    icon: Wrench,
    children: [
      { title: 'Bảo trì dự đoán', href: '/predictive-maintenance', icon: Brain },
      { title: 'Lịch bảo trì', href: '/maintenance-schedule', icon: FileText },
      { title: 'Phụ tùng', href: '/spare-parts', icon: Wrench },
    ]
  },
  {
    title: 'Monitoring',
    icon: Activity,
    children: [
      { title: 'System Health', href: '/system-health', icon: Activity },
      { title: 'Security', href: '/security-dashboard', icon: Shield },
      { title: 'IoT Dashboard', href: '/iot-dashboard', icon: Wifi },
      { title: 'AI/ML Dashboard', href: '/ai-ml-dashboard', icon: Brain },
      { title: 'Advanced Analytics', href: '/advanced-analytics-dashboard', icon: TrendingUp },
    ]
  },
  {
    title: 'Cảnh báo',
    icon: Bell,
    badge: '3',
    children: [
      { title: 'Notification Center', href: '/notification-center', icon: Bell },
      { title: 'Alert Config', href: '/alert-config', icon: AlertTriangle },
      { title: 'Anomaly Detection', href: '/anomaly-detection', icon: AlertTriangle },
    ]
  },
  {
    title: 'Quản lý',
    icon: Database,
    children: [
      { title: 'Sản phẩm', href: '/products', icon: Database },
      { title: 'Công trạm', href: '/workstations', icon: Factory },
      { title: 'Máy móc', href: '/machines', icon: Wrench },
      { title: 'Mappings', href: '/mappings', icon: Database },
    ]
  },
  {
    title: 'Cài đặt',
    icon: Settings,
    children: [
      { title: 'Cài đặt chung', href: '/settings', icon: Settings },
      { title: 'Người dùng', href: '/users', icon: Users },
      { title: 'Phân quyền', href: '/module-permissions', icon: Shield },
      { title: 'Thông tin', href: '/about', icon: FileText },
    ]
  },
];

interface MobileNavigationProps {
  className?: string;
}

export function MobileNavigation({ className }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [location] = useLocation();
  const { user } = useAuth();

  // Close sheet when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    return location === href || location.startsWith(href + '/');
  };

  const hasActiveChild = (item: NavItem) => {
    if (item.href && isActive(item.href)) return true;
    if (item.children) {
      return item.children.some(child => isActive(child.href));
    }
    return false;
  };

  return (
    <div className={`md:hidden ${className}`}>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <span>CPK/SPC System</span>
            </SheetTitle>
          </SheetHeader>

          {/* User Info */}
          {user && (
            <div className="p-4 border-b bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {user.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.role}</p>
                </div>
              </div>
            </div>
          )}

          <ScrollArea className="h-[calc(100vh-140px)]">
            <nav className="p-2">
              {navigationItems.map((item) => (
                <div key={item.title} className="mb-1">
                  {item.children ? (
                    <Collapsible
                      open={expandedItems.has(item.title) || hasActiveChild(item)}
                      onOpenChange={() => toggleExpanded(item.title)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className={`w-full justify-between h-12 px-3 ${
                            hasActiveChild(item) ? 'bg-primary/10 text-primary' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className="h-5 w-5" />
                            <span className="font-medium">{item.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.badge && (
                              <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                                {item.badge}
                              </Badge>
                            )}
                            {expandedItems.has(item.title) || hasActiveChild(item) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-4">
                        {item.children.map((child) => (
                          <Link key={child.href} href={child.href || '#'}>
                            <Button
                              variant="ghost"
                              className={`w-full justify-start h-10 px-3 ${
                                isActive(child.href) ? 'bg-primary/10 text-primary font-medium' : ''
                              }`}
                            >
                              <child.icon className="h-4 w-4 mr-3" />
                              <span className="text-sm">{child.title}</span>
                            </Button>
                          </Link>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <Link href={item.href || '#'}>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start h-12 px-3 ${
                          isActive(item.href) ? 'bg-primary/10 text-primary font-medium' : ''
                        }`}
                      >
                        <item.icon className="h-5 w-5 mr-3" />
                        <span className="font-medium">{item.title}</span>
                        {item.badge && (
                          <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/**
 * Bottom Navigation Bar cho mobile
 */
export function MobileBottomNav() {
  const [location] = useLocation();

  const bottomNavItems = [
    { title: 'Home', href: '/dashboard', icon: Home },
    { title: 'SPC', href: '/analyze', icon: BarChart3 },
    { title: 'Realtime', href: '/realtime-line', icon: Activity },
    { title: 'Alerts', href: '/notification-center', icon: Bell },
    { title: 'Settings', href: '/settings', icon: Settings },
  ];

  const isActive = (href: string) => {
    return location === href || location.startsWith(href + '/');
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {bottomNavItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant="ghost"
              className={`flex flex-col items-center gap-1 h-14 px-4 rounded-none ${
                isActive(item.href) ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive(item.href) ? 'text-primary' : ''}`} />
              <span className="text-xs">{item.title}</span>
            </Button>
          </Link>
        ))}
      </div>
    </nav>
  );
}

/**
 * Quick Action FAB cho mobile
 */
export function MobileQuickActions() {
  const [isOpen, setIsOpen] = useState(false);

  const quickActions = [
    { title: 'Phân tích mới', href: '/analyze', icon: BarChart3, color: 'bg-blue-500' },
    { title: 'Tạo kế hoạch', href: '/quick-spc-plan', icon: FileText, color: 'bg-green-500' },
    { title: 'Xem cảnh báo', href: '/notification-center', icon: Bell, color: 'bg-orange-500' },
  ];

  return (
    <div className="md:hidden fixed bottom-20 right-4 z-40">
      {/* Quick Action Buttons */}
      <div className={`flex flex-col gap-2 mb-2 transition-all duration-200 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Button
              size="sm"
              className={`${action.color} text-white shadow-lg`}
              onClick={() => setIsOpen(false)}
            >
              <action.icon className="h-4 w-4 mr-2" />
              {action.title}
            </Button>
          </Link>
        ))}
      </div>

      {/* FAB Button */}
      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Activity className="h-6 w-6" />}
      </Button>
    </div>
  );
}

export default MobileNavigation;
