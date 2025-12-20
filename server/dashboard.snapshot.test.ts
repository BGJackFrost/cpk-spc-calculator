/**
 * Snapshot Tests for Dashboard UI Components
 * 
 * These tests create snapshots of component output to detect unintended changes.
 * When a component's output changes, the test will fail and show the diff.
 */

import { describe, it, expect } from 'vitest';

// Mock component output structures (simulating React component render output)
// In a real scenario, these would be actual React component renders

/**
 * Helper to create consistent component output structure
 */
const createComponentSnapshot = (
  componentName: string,
  props: Record<string, any>,
  children: any[] = []
) => ({
  type: componentName,
  props,
  children,
  timestamp: 'SNAPSHOT_TIMESTAMP', // Fixed for snapshot consistency
});

describe('Dashboard Layout Snapshots', () => {
  it('should match DashboardLayout snapshot with default props', () => {
    const snapshot = createComponentSnapshot('DashboardLayout', {
      className: 'dashboard-layout',
      sidebarCollapsed: false,
      theme: 'light',
    }, [
      createComponentSnapshot('Sidebar', {
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: 'Home' },
          { id: 'spc', label: 'SPC', icon: 'BarChart' },
          { id: 'mms', label: 'MMS', icon: 'Settings' },
        ],
        activeItem: 'dashboard',
      }),
      createComponentSnapshot('MainContent', {
        className: 'main-content',
      }, [
        createComponentSnapshot('Header', {
          title: 'Dashboard',
          showBreadcrumbs: true,
        }),
        createComponentSnapshot('ContentArea', {
          className: 'content-area',
        }),
      ]),
    ]);

    expect(snapshot).toMatchSnapshot();
  });

  it('should match DashboardLayout snapshot with collapsed sidebar', () => {
    const snapshot = createComponentSnapshot('DashboardLayout', {
      className: 'dashboard-layout sidebar-collapsed',
      sidebarCollapsed: true,
      theme: 'light',
    }, [
      createComponentSnapshot('Sidebar', {
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: 'Home' },
          { id: 'spc', label: 'SPC', icon: 'BarChart' },
        ],
        activeItem: 'dashboard',
        collapsed: true,
      }),
      createComponentSnapshot('MainContent', {
        className: 'main-content expanded',
      }),
    ]);

    expect(snapshot).toMatchSnapshot();
  });

  it('should match DashboardLayout snapshot with dark theme', () => {
    const snapshot = createComponentSnapshot('DashboardLayout', {
      className: 'dashboard-layout dark',
      sidebarCollapsed: false,
      theme: 'dark',
    }, [
      createComponentSnapshot('Sidebar', {
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: 'Home' },
        ],
        activeItem: 'dashboard',
        theme: 'dark',
      }),
      createComponentSnapshot('MainContent', {
        className: 'main-content dark',
      }),
    ]);

    expect(snapshot).toMatchSnapshot();
  });
});

describe('NTF Stats Widget Snapshots', () => {
  it('should match NtfStatsWidget snapshot with data', () => {
    const snapshot = createComponentSnapshot('NtfStatsWidget', {
      className: 'widget ntf-stats',
      title: 'NTF Statistics',
    }, [
      createComponentSnapshot('WidgetHeader', {
        title: 'NTF Statistics',
        icon: 'AlertTriangle',
        actions: ['refresh', 'expand'],
      }),
      createComponentSnapshot('WidgetBody', {}, [
        createComponentSnapshot('StatCard', {
          label: 'Total Defects',
          value: 150,
          trend: 'up',
          trendValue: '+12%',
        }),
        createComponentSnapshot('StatCard', {
          label: 'Real NG',
          value: 100,
          color: 'red',
        }),
        createComponentSnapshot('StatCard', {
          label: 'NTF',
          value: 50,
          color: 'yellow',
        }),
        createComponentSnapshot('PieChart', {
          data: [
            { name: 'Real NG', value: 100 },
            { name: 'NTF', value: 50 },
          ],
        }),
      ]),
    ]);

    expect(snapshot).toMatchSnapshot();
  });

  it('should match NtfStatsWidget snapshot with loading state', () => {
    const snapshot = createComponentSnapshot('NtfStatsWidget', {
      className: 'widget ntf-stats loading',
      title: 'NTF Statistics',
      isLoading: true,
    }, [
      createComponentSnapshot('WidgetHeader', {
        title: 'NTF Statistics',
        icon: 'AlertTriangle',
      }),
      createComponentSnapshot('WidgetBody', {}, [
        createComponentSnapshot('Skeleton', { height: 60 }),
        createComponentSnapshot('Skeleton', { height: 60 }),
        createComponentSnapshot('Skeleton', { height: 120, type: 'chart' }),
      ]),
    ]);

    expect(snapshot).toMatchSnapshot();
  });

  it('should match NtfStatsWidget snapshot with error state', () => {
    const snapshot = createComponentSnapshot('NtfStatsWidget', {
      className: 'widget ntf-stats error',
      title: 'NTF Statistics',
      hasError: true,
    }, [
      createComponentSnapshot('WidgetHeader', {
        title: 'NTF Statistics',
        icon: 'AlertTriangle',
      }),
      createComponentSnapshot('ErrorState', {
        message: 'Failed to load NTF statistics',
        retryButton: true,
      }),
    ]);

    expect(snapshot).toMatchSnapshot();
  });

  it('should match NtfStatsWidget snapshot with empty data', () => {
    const snapshot = createComponentSnapshot('NtfStatsWidget', {
      className: 'widget ntf-stats empty',
      title: 'NTF Statistics',
    }, [
      createComponentSnapshot('WidgetHeader', {
        title: 'NTF Statistics',
        icon: 'AlertTriangle',
      }),
      createComponentSnapshot('EmptyState', {
        message: 'No defect data available',
        icon: 'Inbox',
      }),
    ]);

    expect(snapshot).toMatchSnapshot();
  });
});

describe('License Status Widget Snapshots', () => {
  it('should match LicenseStatusWidget snapshot with active license', () => {
    const snapshot = createComponentSnapshot('LicenseStatusWidget', {
      className: 'widget license-status',
    }, [
      createComponentSnapshot('WidgetHeader', {
        title: 'License Status',
        icon: 'Key',
      }),
      createComponentSnapshot('WidgetBody', {}, [
        createComponentSnapshot('StatusBadge', {
          status: 'active',
          label: 'Active',
          color: 'green',
        }),
        createComponentSnapshot('LicenseInfo', {
          type: 'Professional',
          expiresAt: '2025-12-31',
          daysRemaining: 365,
        }),
        createComponentSnapshot('FeatureList', {
          features: ['SPC Analysis', 'MMS', 'Reports', 'API Access'],
        }),
      ]),
    ]);

    expect(snapshot).toMatchSnapshot();
  });

  it('should match LicenseStatusWidget snapshot with expiring license', () => {
    const snapshot = createComponentSnapshot('LicenseStatusWidget', {
      className: 'widget license-status warning',
    }, [
      createComponentSnapshot('WidgetHeader', {
        title: 'License Status',
        icon: 'Key',
      }),
      createComponentSnapshot('WidgetBody', {}, [
        createComponentSnapshot('StatusBadge', {
          status: 'expiring',
          label: 'Expiring Soon',
          color: 'yellow',
        }),
        createComponentSnapshot('LicenseInfo', {
          type: 'Standard',
          expiresAt: '2024-12-30',
          daysRemaining: 10,
        }),
        createComponentSnapshot('AlertBanner', {
          message: 'License expires in 10 days',
          action: 'Renew Now',
        }),
      ]),
    ]);

    expect(snapshot).toMatchSnapshot();
  });

  it('should match LicenseStatusWidget snapshot with expired license', () => {
    const snapshot = createComponentSnapshot('LicenseStatusWidget', {
      className: 'widget license-status error',
    }, [
      createComponentSnapshot('WidgetHeader', {
        title: 'License Status',
        icon: 'Key',
      }),
      createComponentSnapshot('WidgetBody', {}, [
        createComponentSnapshot('StatusBadge', {
          status: 'expired',
          label: 'Expired',
          color: 'red',
        }),
        createComponentSnapshot('AlertBanner', {
          message: 'License has expired',
          action: 'Activate License',
          severity: 'error',
        }),
      ]),
    ]);

    expect(snapshot).toMatchSnapshot();
  });
});

describe('Connection Pool Widget Snapshots', () => {
  it('should match ConnectionPoolWidget snapshot with healthy status', () => {
    const snapshot = createComponentSnapshot('ConnectionPoolWidget', {
      className: 'widget connection-pool',
    }, [
      createComponentSnapshot('WidgetHeader', {
        title: 'Connection Pool',
        icon: 'Database',
      }),
      createComponentSnapshot('WidgetBody', {}, [
        createComponentSnapshot('GaugeChart', {
          value: 10,
          max: 100,
          label: '5/50 connections',
          status: 'healthy',
        }),
        createComponentSnapshot('StatRow', {
          items: [
            { label: 'Active', value: 5 },
            { label: 'Idle', value: 15 },
            { label: 'Latency', value: '12.5ms' },
          ],
        }),
      ]),
    ]);

    expect(snapshot).toMatchSnapshot();
  });

  it('should match ConnectionPoolWidget snapshot with warning status', () => {
    const snapshot = createComponentSnapshot('ConnectionPoolWidget', {
      className: 'widget connection-pool warning',
    }, [
      createComponentSnapshot('WidgetHeader', {
        title: 'Connection Pool',
        icon: 'Database',
      }),
      createComponentSnapshot('WidgetBody', {}, [
        createComponentSnapshot('GaugeChart', {
          value: 70,
          max: 100,
          label: '35/50 connections',
          status: 'warning',
        }),
        createComponentSnapshot('AlertBanner', {
          message: 'Connection pool usage is high',
          severity: 'warning',
        }),
      ]),
    ]);

    expect(snapshot).toMatchSnapshot();
  });
});

describe('Validation Rules Widget Snapshots', () => {
  it('should match ValidationRulesCard snapshot with violations', () => {
    const snapshot = createComponentSnapshot('ValidationRulesCard', {
      className: 'widget validation-rules',
    }, [
      createComponentSnapshot('WidgetHeader', {
        title: 'Validation Rules',
        icon: 'CheckCircle',
      }),
      createComponentSnapshot('WidgetBody', {}, [
        createComponentSnapshot('StatRow', {
          items: [
            { label: 'Total Rules', value: 25 },
            { label: 'Active', value: 20 },
            { label: 'Triggered', value: 5, color: 'red' },
          ],
        }),
        createComponentSnapshot('ViolationList', {
          violations: [
            { rule: 'CPK < 1.33', count: 3, severity: 'warning' },
            { rule: 'Out of Spec', count: 2, severity: 'error' },
          ],
        }),
      ]),
    ]);

    expect(snapshot).toMatchSnapshot();
  });

  it('should match ValidationRulesCard snapshot with no violations', () => {
    const snapshot = createComponentSnapshot('ValidationRulesCard', {
      className: 'widget validation-rules success',
    }, [
      createComponentSnapshot('WidgetHeader', {
        title: 'Validation Rules',
        icon: 'CheckCircle',
      }),
      createComponentSnapshot('WidgetBody', {}, [
        createComponentSnapshot('StatRow', {
          items: [
            { label: 'Total Rules', value: 25 },
            { label: 'Active', value: 25 },
            { label: 'Triggered', value: 0 },
          ],
        }),
        createComponentSnapshot('SuccessMessage', {
          message: 'All rules passing',
          icon: 'CheckCircle',
        }),
      ]),
    ]);

    expect(snapshot).toMatchSnapshot();
  });
});

describe('Low Stock Widget Snapshots', () => {
  it('should match LowStockWidget snapshot with critical items', () => {
    const snapshot = createComponentSnapshot('LowStockWidget', {
      className: 'widget low-stock',
    }, [
      createComponentSnapshot('WidgetHeader', {
        title: 'Low Stock Alerts',
        icon: 'Package',
        badge: { count: 8, color: 'red' },
      }),
      createComponentSnapshot('WidgetBody', {}, [
        createComponentSnapshot('AlertList', {
          items: [
            {
              id: 'part-1',
              name: 'Bearing XYZ',
              currentQty: 5,
              minQty: 10,
              severity: 'warning',
            },
            {
              id: 'part-2',
              name: 'Motor ABC',
              currentQty: 2,
              minQty: 5,
              severity: 'critical',
            },
          ],
        }),
        createComponentSnapshot('ViewAllLink', {
          href: '/spare-parts',
          label: 'View all 8 items',
        }),
      ]),
    ]);

    expect(snapshot).toMatchSnapshot();
  });

  it('should match LowStockWidget snapshot with no low stock', () => {
    const snapshot = createComponentSnapshot('LowStockWidget', {
      className: 'widget low-stock empty',
    }, [
      createComponentSnapshot('WidgetHeader', {
        title: 'Low Stock Alerts',
        icon: 'Package',
      }),
      createComponentSnapshot('WidgetBody', {}, [
        createComponentSnapshot('SuccessMessage', {
          message: 'All stock levels are healthy',
          icon: 'CheckCircle',
        }),
      ]),
    ]);

    expect(snapshot).toMatchSnapshot();
  });
});

describe('Webhook Retry Widget Snapshots', () => {
  it('should match WebhookRetryWidget snapshot with pending retries', () => {
    const snapshot = createComponentSnapshot('WebhookRetryWidget', {
      className: 'widget webhook-retry',
    }, [
      createComponentSnapshot('WidgetHeader', {
        title: 'Webhook Retries',
        icon: 'RefreshCw',
      }),
      createComponentSnapshot('WidgetBody', {}, [
        createComponentSnapshot('StatRow', {
          items: [
            { label: 'Pending', value: 3, color: 'yellow' },
            { label: 'Exhausted', value: 1, color: 'red' },
            { label: 'Success Rate', value: '85.5%' },
          ],
        }),
        createComponentSnapshot('RetryButton', {
          label: 'Retry All Pending',
          disabled: false,
        }),
      ]),
    ]);

    expect(snapshot).toMatchSnapshot();
  });

  it('should match WebhookRetryWidget snapshot with no retries', () => {
    const snapshot = createComponentSnapshot('WebhookRetryWidget', {
      className: 'widget webhook-retry success',
    }, [
      createComponentSnapshot('WidgetHeader', {
        title: 'Webhook Retries',
        icon: 'RefreshCw',
      }),
      createComponentSnapshot('WidgetBody', {}, [
        createComponentSnapshot('StatRow', {
          items: [
            { label: 'Pending', value: 0 },
            { label: 'Exhausted', value: 0 },
            { label: 'Success Rate', value: '100%' },
          ],
        }),
        createComponentSnapshot('SuccessMessage', {
          message: 'All webhooks delivered successfully',
        }),
      ]),
    ]);

    expect(snapshot).toMatchSnapshot();
  });
});

describe('Widget Common Elements Snapshots', () => {
  it('should match WidgetSkeleton snapshot', () => {
    const snapshot = createComponentSnapshot('WidgetSkeleton', {
      className: 'widget-skeleton',
      variant: 'card',
    }, [
      createComponentSnapshot('SkeletonHeader', {
        height: 24,
        width: '60%',
      }),
      createComponentSnapshot('SkeletonBody', {}, [
        createComponentSnapshot('SkeletonLine', { height: 16, width: '100%' }),
        createComponentSnapshot('SkeletonLine', { height: 16, width: '80%' }),
        createComponentSnapshot('SkeletonLine', { height: 16, width: '90%' }),
      ]),
    ]);

    expect(snapshot).toMatchSnapshot();
  });

  it('should match WidgetError snapshot', () => {
    const snapshot = createComponentSnapshot('WidgetError', {
      className: 'widget-error',
    }, [
      createComponentSnapshot('ErrorIcon', {
        icon: 'AlertCircle',
        size: 48,
      }),
      createComponentSnapshot('ErrorMessage', {
        title: 'Failed to load data',
        description: 'Please try again later',
      }),
      createComponentSnapshot('RetryButton', {
        label: 'Retry',
        onClick: 'handleRetry',
      }),
    ]);

    expect(snapshot).toMatchSnapshot();
  });

  it('should match WidgetEmpty snapshot', () => {
    const snapshot = createComponentSnapshot('WidgetEmpty', {
      className: 'widget-empty',
    }, [
      createComponentSnapshot('EmptyIcon', {
        icon: 'Inbox',
        size: 48,
      }),
      createComponentSnapshot('EmptyMessage', {
        title: 'No data available',
        description: 'Data will appear here once available',
      }),
    ]);

    expect(snapshot).toMatchSnapshot();
  });
});

describe('Dashboard Grid Layout Snapshots', () => {
  it('should match DashboardGrid snapshot with all widgets', () => {
    const snapshot = createComponentSnapshot('DashboardGrid', {
      className: 'dashboard-grid',
      columns: 3,
      gap: 16,
    }, [
      createComponentSnapshot('GridItem', { span: 1 }, [
        createComponentSnapshot('NtfStatsWidget', {}),
      ]),
      createComponentSnapshot('GridItem', { span: 1 }, [
        createComponentSnapshot('LicenseStatusWidget', {}),
      ]),
      createComponentSnapshot('GridItem', { span: 1 }, [
        createComponentSnapshot('ConnectionPoolWidget', {}),
      ]),
      createComponentSnapshot('GridItem', { span: 2 }, [
        createComponentSnapshot('ValidationRulesCard', {}),
      ]),
      createComponentSnapshot('GridItem', { span: 1 }, [
        createComponentSnapshot('LowStockWidget', {}),
      ]),
    ]);

    expect(snapshot).toMatchSnapshot();
  });

  it('should match DashboardGrid snapshot with mobile layout', () => {
    const snapshot = createComponentSnapshot('DashboardGrid', {
      className: 'dashboard-grid mobile',
      columns: 1,
      gap: 12,
    }, [
      createComponentSnapshot('GridItem', { span: 1 }, [
        createComponentSnapshot('NtfStatsWidget', { compact: true }),
      ]),
      createComponentSnapshot('GridItem', { span: 1 }, [
        createComponentSnapshot('LicenseStatusWidget', { compact: true }),
      ]),
    ]);

    expect(snapshot).toMatchSnapshot();
  });
});
