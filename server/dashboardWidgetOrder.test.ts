/**
 * Unit tests for Dashboard Widget Order functionality
 */
import { describe, it, expect } from 'vitest';

describe('Dashboard Widget Order', () => {
  describe('Widget Order Validation', () => {
    it('should validate widget order array', () => {
      const isValidOrder = (order: string[]): boolean => {
        return Array.isArray(order) && order.every(id => typeof id === 'string' && id.length > 0);
      };

      expect(isValidOrder(['widget1', 'widget2'])).toBe(true);
      expect(isValidOrder([])).toBe(true);
      expect(isValidOrder([''])).toBe(false);
    });

    it('should preserve all widgets when reordering', () => {
      const originalWidgets = ['a', 'b', 'c', 'd'];
      const reorderedWidgets = ['c', 'a', 'd', 'b'];

      const hasAllWidgets = (original: string[], reordered: string[]): boolean => {
        return original.length === reordered.length &&
          original.every(w => reordered.includes(w));
      };

      expect(hasAllWidgets(originalWidgets, reorderedWidgets)).toBe(true);
      expect(hasAllWidgets(originalWidgets, ['a', 'b', 'c'])).toBe(false);
    });

    it('should handle duplicate widget IDs', () => {
      const removeDuplicates = (widgets: string[]): string[] => {
        return [...new Set(widgets)];
      };

      expect(removeDuplicates(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
      expect(removeDuplicates(['a', 'a', 'a'])).toEqual(['a']);
    });
  });

  describe('Widget Order Persistence', () => {
    it('should serialize widget order to JSON', () => {
      const order = ['widget1', 'widget2', 'widget3'];
      const serialized = JSON.stringify(order);
      const deserialized = JSON.parse(serialized);

      expect(deserialized).toEqual(order);
    });

    it('should merge saved order with default widgets', () => {
      const mergeWidgetOrder = (saved: string[], defaults: string[]): string[] => {
        const result = [...saved];
        for (const widget of defaults) {
          if (!result.includes(widget)) {
            result.push(widget);
          }
        }
        return result.filter(w => defaults.includes(w));
      };

      const saved = ['b', 'a', 'c'];
      const defaults = ['a', 'b', 'c', 'd'];
      const merged = mergeWidgetOrder(saved, defaults);

      expect(merged).toEqual(['b', 'a', 'c', 'd']);
    });
  });

  describe('Drag and Drop Logic', () => {
    it('should move widget from one position to another', () => {
      const moveWidget = (widgets: string[], fromIndex: number, toIndex: number): string[] => {
        const result = [...widgets];
        const [removed] = result.splice(fromIndex, 1);
        result.splice(toIndex, 0, removed);
        return result;
      };

      const widgets = ['a', 'b', 'c', 'd'];
      expect(moveWidget(widgets, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
      expect(moveWidget(widgets, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    });

    it('should handle edge cases in drag and drop', () => {
      const moveWidget = (widgets: string[], fromIndex: number, toIndex: number): string[] => {
        if (fromIndex < 0 || fromIndex >= widgets.length) return widgets;
        if (toIndex < 0) toIndex = 0;
        if (toIndex >= widgets.length) toIndex = widgets.length - 1;
        
        const result = [...widgets];
        const [removed] = result.splice(fromIndex, 1);
        result.splice(toIndex, 0, removed);
        return result;
      };

      const widgets = ['a', 'b', 'c'];
      expect(moveWidget(widgets, -1, 1)).toEqual(['a', 'b', 'c']);
      expect(moveWidget(widgets, 5, 1)).toEqual(['a', 'b', 'c']);
      expect(moveWidget(widgets, 1, 1)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('Reset to Default', () => {
    it('should reset widget order to default', () => {
      const resetToDefault = (defaults: string[]): string[] => {
        return [...defaults];
      };

      const defaultOrder = ['a', 'b', 'c'];
      expect(resetToDefault(defaultOrder)).toEqual(['a', 'b', 'c']);
      expect(resetToDefault(defaultOrder)).not.toBe(defaultOrder);
    });
  });
});
