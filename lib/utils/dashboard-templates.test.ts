import { describe, it, expect } from 'vitest';
import { dashboardTemplates, getDashboardTemplate } from './dashboard-templates';

describe('Dashboard Templates', () => {
  describe('dashboardTemplates', () => {
    it('should have at least 5 templates', () => {
      expect(dashboardTemplates.length).toBeGreaterThanOrEqual(5);
    });

    it('should have Industrial Overview template', () => {
      const industrial = dashboardTemplates.find((t) => t.id === 'industrial-overview');

      expect(industrial).toBeDefined();
      expect(industrial?.name).toBe('Industrial Overview');
      expect(industrial?.category).toBe('industrial');
      expect(industrial?.widgets.length).toBeGreaterThan(0);
    });

    it('should have Energy Monitoring template', () => {
      const energy = dashboardTemplates.find((t) => t.id === 'energy-monitoring');

      expect(energy).toBeDefined();
      expect(energy?.name).toBe('Energy Monitoring');
      expect(energy?.category).toBe('energy');
    });

    it('should have Environmental Sensors template', () => {
      const environmental = dashboardTemplates.find((t) => t.id === 'environmental-sensors');

      expect(environmental).toBeDefined();
      expect(environmental?.name).toBe('Environmental Sensors');
      expect(environmental?.category).toBe('environmental');
    });

    it('should have Smart Building template', () => {
      const building = dashboardTemplates.find((t) => t.id === 'smart-building');

      expect(building).toBeDefined();
      expect(building?.name).toBe('Smart Building');
      expect(building?.category).toBe('building');
    });

    it('should have Basic Monitoring template', () => {
      const basic = dashboardTemplates.find((t) => t.id === 'basic-monitoring');

      expect(basic).toBeDefined();
      expect(basic?.name).toBe('Basic Monitoring');
      expect(basic?.category).toBe('general');
    });

    it('should have valid widget layouts', () => {
      dashboardTemplates.forEach((template) => {
        template.widgets.forEach((widget) => {
          expect(widget.layout.x).toBeGreaterThanOrEqual(0);
          expect(widget.layout.y).toBeGreaterThanOrEqual(0);
          expect(widget.layout.w).toBeGreaterThan(0);
          expect(widget.layout.h).toBeGreaterThan(0);
          expect(widget.layout.w).toBeLessThanOrEqual(12); // Standard grid width
        });
      });
    });

    it('should have valid chart types', () => {
      const validChartTypes = [
        'line',
        'bar',
        'scatter',
        'pie',
        'gauge',
        'heatmap',
        'radar',
        'funnel',
        'treemap',
        'boxplot',
        'sankey',
        'sunburst',
        'candlestick',
        'area',
      ];

      dashboardTemplates.forEach((template) => {
        template.widgets.forEach((widget) => {
          expect(validChartTypes).toContain(widget.chartType);
        });
      });
    });

    it('should have at least 4 widgets per template', () => {
      dashboardTemplates.forEach((template) => {
        expect(template.widgets.length).toBeGreaterThanOrEqual(4);
      });
    });

    it('should have unique widget IDs within each template', () => {
      dashboardTemplates.forEach((template) => {
        const widgetIds = template.widgets.map((w) => w.id);
        const uniqueIds = new Set(widgetIds);

        expect(uniqueIds.size).toBe(widgetIds.length);
      });
    });

    it('should have tags for each template', () => {
      dashboardTemplates.forEach((template) => {
        expect(Array.isArray(template.tags)).toBe(true);
        expect(template.tags.length).toBeGreaterThan(0);
      });
    });

    it('should have icons for each template', () => {
      dashboardTemplates.forEach((template) => {
        expect(template.icon).toBeDefined();
        expect(typeof template.icon).toBe('string');
        expect(template.icon.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getDashboardTemplate', () => {
    it('should return template by ID', () => {
      const template = getDashboardTemplate('industrial-overview');

      expect(template).toBeDefined();
      expect(template?.id).toBe('industrial-overview');
    });

    it('should return undefined for non-existent template', () => {
      const template = getDashboardTemplate('non-existent-template');

      expect(template).toBeUndefined();
    });

    it('should return correct template data', () => {
      const template = getDashboardTemplate('energy-monitoring');

      expect(template?.name).toBe('Energy Monitoring');
      expect(template?.category).toBe('energy');
      expect(template?.widgets).toBeDefined();
    });
  });

  describe('Template Structure', () => {
    it('should have consistent structure across all templates', () => {
      const requiredFields = ['id', 'name', 'description', 'category', 'icon', 'tags', 'widgets'];

      dashboardTemplates.forEach((template) => {
        requiredFields.forEach((field) => {
          expect(template).toHaveProperty(field);
        });
      });
    });

    it('should have valid widget structure', () => {
      const requiredWidgetFields = ['id', 'title', 'chartType', 'layout'];

      dashboardTemplates.forEach((template) => {
        template.widgets.forEach((widget) => {
          requiredWidgetFields.forEach((field) => {
            expect(widget).toHaveProperty(field);
          });
        });
      });
    });

    it('should have valid layout structure', () => {
      const requiredLayoutFields = ['x', 'y', 'w', 'h'];

      dashboardTemplates.forEach((template) => {
        template.widgets.forEach((widget) => {
          requiredLayoutFields.forEach((field) => {
            expect(widget.layout).toHaveProperty(field);
          });
        });
      });
    });
  });

  describe('Categories', () => {
    it('should have multiple categories', () => {
      const categories = new Set(dashboardTemplates.map((t) => t.category));

      expect(categories.size).toBeGreaterThanOrEqual(4);
    });

    it('should have templates in each major category', () => {
      const categories = dashboardTemplates.map((t) => t.category);

      expect(categories).toContain('industrial');
      expect(categories).toContain('energy');
      expect(categories).toContain('environmental');
      expect(categories).toContain('general');
    });
  });
});
