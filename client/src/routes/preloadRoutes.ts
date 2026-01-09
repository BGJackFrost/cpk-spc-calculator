/**
 * Route Preloading Utilities
 * Preload các routes quan trọng để cải thiện UX
 */

// Định nghĩa các route modules cần preload
const routeModules = {
  dashboard: () => import('@/pages/Dashboard'),
  analyze: () => import('@/pages/Analyze'),
  home: () => import('@/pages/Home'),
  history: () => import('@/pages/History'),
  settings: () => import('@/pages/Settings'),
  productionLines: () => import('@/pages/ProductionLinesDashboard'),
  spcReport: () => import('@/pages/SpcReport'),
  oeeDashboard: () => import('@/pages/OEEDashboard'),
  maintenanceDashboard: () => import('@/pages/MaintenanceDashboard'),
  iotDashboard: () => import('@/pages/IoTDashboard'),
  aiDashboard: () => import('@/pages/ai/AiDashboard'),
  unifiedDashboard: () => import('@/pages/UnifiedDashboard'),
} as const;

type RouteKey = keyof typeof routeModules;

// Cache để track các routes đã preload
const preloadedRoutes = new Set<RouteKey>();

/**
 * Preload một route cụ thể
 */
export function preloadRoute(route: RouteKey): void {
  if (preloadedRoutes.has(route)) return;
  
  const loader = routeModules[route];
  if (loader) {
    preloadedRoutes.add(route);
    loader().catch((err) => {
      console.warn(`[Preload] Failed to preload ${route}:`, err);
      preloadedRoutes.delete(route);
    });
  }
}

/**
 * Preload nhiều routes cùng lúc
 */
export function preloadRoutes(routes: RouteKey[]): void {
  routes.forEach(preloadRoute);
}

/**
 * Preload các routes quan trọng nhất (gọi sau khi app mount)
 * Sử dụng requestIdleCallback để không block main thread
 */
export function preloadCriticalRoutes(): void {
  const criticalRoutes: RouteKey[] = ['dashboard', 'analyze', 'home'];
  
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      preloadRoutes(criticalRoutes);
    }, { timeout: 2000 });
  } else {
    // Fallback cho browsers không hỗ trợ requestIdleCallback
    setTimeout(() => {
      preloadRoutes(criticalRoutes);
    }, 1000);
  }
}

/**
 * Preload route khi hover vào link
 * Sử dụng với onMouseEnter event
 */
export function preloadOnHover(route: RouteKey): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return () => {
    // Delay nhỏ để tránh preload khi user chỉ lướt qua
    timeoutId = setTimeout(() => {
      preloadRoute(route);
    }, 100);
  };
}

/**
 * Cancel preload khi mouse leave
 */
export function cancelPreload(): () => void {
  return () => {
    // Không cần cancel vì đã có delay
  };
}

/**
 * Hook-like function để preload dựa trên current route
 * Gọi khi user navigate đến một route để preload các routes liên quan
 */
export function preloadRelatedRoutes(currentPath: string): void {
  const relatedRoutes: Record<string, RouteKey[]> = {
    '/dashboard': ['analyze', 'spcReport', 'history'],
    '/analyze': ['dashboard', 'spcReport', 'history'],
    '/production-lines': ['dashboard', 'oeeDashboard', 'maintenanceDashboard'],
    '/oee-dashboard': ['productionLines', 'maintenanceDashboard', 'iotDashboard'],
    '/iot-dashboard': ['oeeDashboard', 'aiDashboard', 'maintenanceDashboard'],
    '/ai-dashboard': ['iotDashboard', 'analyze', 'unifiedDashboard'],
  };
  
  const routes = relatedRoutes[currentPath];
  if (routes) {
    // Preload sau một delay nhỏ
    setTimeout(() => {
      preloadRoutes(routes);
    }, 500);
  }
}

// Export route keys để sử dụng trong components
export type { RouteKey };
export { routeModules };
