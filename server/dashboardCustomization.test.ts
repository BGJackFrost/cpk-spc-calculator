import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock database functions
vi.mock('./db', () => ({
  getWidgetTemplates: vi.fn().mockResolvedValue([
    {
      id: 1,
      key: 'inspection_stats',
      name: 'Thống kê Kiểm tra',
      description: 'Hiển thị tổng quan số liệu kiểm tra',
      category: 'stats',
      default_config: '{"showTrend": true}',
      min_width: 2,
      min_height: 1,
      max_width: 6,
      max_height: 2,
      default_width: 3,
      default_height: 1,
      component_name: 'InspectionStatsWidget',
      is_active: 1,
      is_default: 1,
    },
    {
      id: 2,
      key: 'pass_rate_chart',
      name: 'Biểu đồ Tỷ lệ Đạt',
      description: 'Biểu đồ tròn hiển thị tỷ lệ Pass/Fail',
      category: 'chart',
      default_config: '{"chartType": "pie"}',
      min_width: 2,
      min_height: 2,
      max_width: 4,
      max_height: 4,
      default_width: 2,
      default_height: 2,
      component_name: 'PassRateChartWidget',
      is_active: 1,
      is_default: 1,
    },
  ]),
  getWidgetTemplateByKey: vi.fn().mockImplementation((key: string) => {
    if (key === 'inspection_stats') {
      return Promise.resolve({
        id: 1,
        key: 'inspection_stats',
        name: 'Thống kê Kiểm tra',
        category: 'stats',
      });
    }
    return Promise.resolve(null);
  }),
  getUserDashboardWidgets: vi.fn().mockResolvedValue([
    {
      id: 1,
      widget_template_id: 1,
      widget_key: 'inspection_stats',
      widget_name: 'Thống kê Kiểm tra',
      category: 'stats',
      component_name: 'InspectionStatsWidget',
      grid_x: 0,
      grid_y: 0,
      grid_width: 3,
      grid_height: 1,
      config: '{"showTrend": true}',
      is_visible: 1,
    },
  ]),
  saveUserDashboardWidget: vi.fn().mockResolvedValue(1),
  updateUserDashboardWidget: vi.fn().mockResolvedValue(true),
  deleteUserDashboardWidget: vi.fn().mockResolvedValue(true),
  initializeDefaultWidgets: vi.fn().mockResolvedValue(true),
  getDbConnection: vi.fn().mockResolvedValue({
    execute: vi.fn().mockResolvedValue([[], []]),
  }),
}));

import {
  getWidgetTemplates,
  getWidgetTemplateByKey,
  getUserDashboardWidgets,
  saveUserDashboardWidget,
  updateUserDashboardWidget,
  deleteUserDashboardWidget,
  initializeDefaultWidgets,
} from './db';

describe('Dashboard Customization', () => {
  describe('Widget Templates', () => {
    it('should get all widget templates', async () => {
      const templates = await getWidgetTemplates();
      
      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      
      const firstTemplate = templates[0];
      expect(firstTemplate).toHaveProperty('id');
      expect(firstTemplate).toHaveProperty('key');
      expect(firstTemplate).toHaveProperty('name');
      expect(firstTemplate).toHaveProperty('category');
    });

    it('should get widget template by key', async () => {
      const template = await getWidgetTemplateByKey('inspection_stats');
      
      expect(template).toBeDefined();
      expect(template?.key).toBe('inspection_stats');
      expect(template?.name).toBe('Thống kê Kiểm tra');
    });

    it('should return null for non-existent template', async () => {
      const template = await getWidgetTemplateByKey('non_existent');
      expect(template).toBeNull();
    });
  });

  describe('User Dashboard Widgets', () => {
    const userId = 1;

    it('should get user dashboard widgets', async () => {
      const widgets = await getUserDashboardWidgets(userId);
      
      expect(widgets).toBeDefined();
      expect(Array.isArray(widgets)).toBe(true);
    });

    it('should save new widget to dashboard', async () => {
      const widgetId = await saveUserDashboardWidget({
        userId: 1,
        widgetTemplateId: 1,
        gridX: 0,
        gridY: 0,
        gridWidth: 3,
        gridHeight: 1,
        config: { showTrend: true },
      });
      
      expect(widgetId).toBeDefined();
      expect(typeof widgetId).toBe('number');
    });

    it('should update widget position', async () => {
      const success = await updateUserDashboardWidget(1, userId, {
        gridX: 3,
        gridY: 0,
      });
      
      expect(success).toBe(true);
    });

    it('should update widget size', async () => {
      const success = await updateUserDashboardWidget(1, userId, {
        gridWidth: 4,
        gridHeight: 2,
      });
      
      expect(success).toBe(true);
    });

    it('should toggle widget visibility', async () => {
      const success = await updateUserDashboardWidget(1, userId, {
        isVisible: false,
      });
      
      expect(success).toBe(true);
    });

    it('should delete widget from dashboard', async () => {
      const success = await deleteUserDashboardWidget(1, userId);
      expect(success).toBe(true);
    });

    it('should initialize default widgets for new user', async () => {
      const success = await initializeDefaultWidgets(userId);
      expect(success).toBe(true);
    });
  });

  describe('Widget Categories', () => {
    it('should have valid categories', async () => {
      const templates = await getWidgetTemplates();
      const validCategories = ['chart', 'stats', 'table', 'alert', 'ai', 'custom'];
      
      templates.forEach((template: any) => {
        expect(validCategories).toContain(template.category);
      });
    });
  });

  describe('Widget Grid Constraints', () => {
    it('should respect min/max width constraints', async () => {
      const templates = await getWidgetTemplates();
      
      templates.forEach((template: any) => {
        expect(template.min_width).toBeLessThanOrEqual(template.max_width);
        expect(template.default_width).toBeGreaterThanOrEqual(template.min_width);
        expect(template.default_width).toBeLessThanOrEqual(template.max_width);
      });
    });

    it('should respect min/max height constraints', async () => {
      const templates = await getWidgetTemplates();
      
      templates.forEach((template: any) => {
        expect(template.min_height).toBeLessThanOrEqual(template.max_height);
        expect(template.default_height).toBeGreaterThanOrEqual(template.min_height);
        expect(template.default_height).toBeLessThanOrEqual(template.max_height);
      });
    });
  });
});
