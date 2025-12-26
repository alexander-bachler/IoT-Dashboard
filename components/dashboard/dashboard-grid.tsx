'use client';

import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { useDashboardStore } from '@/lib/stores/dashboard-store';
import { DashboardWidget } from './dashboard-widget';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

export function DashboardGrid() {
  const { layout, setLayout, widgets, removeWidget, isEditMode } = useDashboardStore();

  const handleLayoutChange = (newLayout: Layout[]) => {
    if (isEditMode) {
      setLayout(newLayout);
    }
  };

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={{ lg: layout }}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
      rowHeight={60}
      isDraggable={isEditMode}
      isResizable={isEditMode}
      onLayoutChange={handleLayoutChange}
      compactType="vertical"
      preventCollision={false}
    >
      {widgets.map((widget) => (
        <div key={widget.id} data-grid={layout.find((l) => l.i === widget.id)}>
          <DashboardWidget
            widget={widget}
            isEditMode={isEditMode}
            onRemove={() => removeWidget(widget.id)}
          />
        </div>
      ))}
    </ResponsiveGridLayout>
  );
}
