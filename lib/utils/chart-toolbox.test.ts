import { describe, it, expect } from 'vitest';
import { getChartToolbox, getDataZoom } from './chart-toolbox';

describe('Chart Toolbox Utils', () => {
  describe('getChartToolbox', () => {
    it('should return toolbox config with default chart name', () => {
      const toolbox = getChartToolbox();

      expect(toolbox).toBeDefined();
      expect(toolbox?.feature).toBeDefined();
      expect(toolbox?.feature?.saveAsImage).toBeDefined();
    });

    it('should use custom chart name when provided', () => {
      const customName = 'temperature-chart';
      const toolbox = getChartToolbox(customName);

      expect(toolbox?.feature?.saveAsImage?.name).toBe(customName);
    });

    it('should include saveAsImage feature', () => {
      const toolbox = getChartToolbox();

      expect(toolbox?.feature?.saveAsImage).toBeDefined();
      expect(toolbox?.feature?.saveAsImage?.title).toBe('Download as PNG');
      expect(toolbox?.feature?.saveAsImage?.pixelRatio).toBe(2);
      expect(toolbox?.feature?.saveAsImage?.backgroundColor).toBe('#030712');
    });

    it('should include dataZoom feature', () => {
      const toolbox = getChartToolbox();

      expect(toolbox?.feature?.dataZoom).toBeDefined();
      expect(toolbox?.feature?.dataZoom?.title).toEqual({
        zoom: 'Zoom',
        back: 'Reset Zoom',
      });
      expect(toolbox?.feature?.dataZoom?.yAxisIndex).toBe(false);
    });

    it('should include restore feature', () => {
      const toolbox = getChartToolbox();

      expect(toolbox?.feature?.restore).toBeDefined();
      expect(toolbox?.feature?.restore?.title).toBe('Restore');
    });

    it('should have proper positioning', () => {
      const toolbox = getChartToolbox();

      expect(toolbox?.top).toBe(10);
      expect(toolbox?.right).toBe(20);
    });

    it('should have icon styling', () => {
      const toolbox = getChartToolbox();

      expect(toolbox?.iconStyle?.borderColor).toBe('#9ca3af');
      expect(toolbox?.emphasis?.iconStyle?.borderColor).toBe('#e5e7eb');
    });

    it('should generate date-based default name', () => {
      const toolbox = getChartToolbox();
      const todayStr = new Date().toISOString().split('T')[0];

      expect(toolbox?.feature?.saveAsImage?.name).toContain('iot-chart-');
      expect(toolbox?.feature?.saveAsImage?.name).toContain(todayStr);
    });
  });

  describe('getDataZoom', () => {
    it('should return array of dataZoom configs', () => {
      const dataZoom = getDataZoom();

      expect(Array.isArray(dataZoom)).toBe(true);
      expect(dataZoom).toHaveLength(2);
    });

    it('should include inside zoom type', () => {
      const dataZoom = getDataZoom();
      const insideZoom = dataZoom[0];

      expect(insideZoom.type).toBe('inside');
      expect(insideZoom.start).toBe(0);
      expect(insideZoom.end).toBe(100);
    });

    it('should include slider zoom type', () => {
      const dataZoom = getDataZoom();
      const sliderZoom = dataZoom[1];

      expect(sliderZoom.type).toBe('slider');
      expect(sliderZoom.start).toBe(0);
      expect(sliderZoom.end).toBe(100);
    });

    it('should have proper slider styling', () => {
      const dataZoom = getDataZoom();
      const sliderZoom = dataZoom[1];

      expect(sliderZoom.backgroundColor).toBe('#1f2937');
      expect(sliderZoom.fillerColor).toBe('rgba(59, 130, 246, 0.2)');
      expect(sliderZoom.borderColor).toBe('#374151');
      expect(sliderZoom.textStyle?.color).toBe('#9ca3af');
    });

    it('should maintain dark theme consistency', () => {
      const dataZoom = getDataZoom();
      const sliderZoom = dataZoom[1];

      // All colors should be dark theme compatible
      expect(sliderZoom.backgroundColor).toMatch(/^#/);
      expect(sliderZoom.borderColor).toMatch(/^#/);
    });
  });
});
