import { pgTable, uuid, text, timestamp, doublePrecision, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Data Sources - Stores API credentials and connection information
 */
export const dataSources = pgTable('data_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(), // e.g., "linemetrics", "rest-api"
  apiUrl: text('api_url').notNull(),
  apiToken: text('api_token').notNull(),
  clientId: text('client_id'),
  config: jsonb('config'), // Additional configuration as JSON
  isActive: boolean('is_active').default(true).notNull(),
  lastSync: timestamp('last_sync', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Devices - Represents physical IoT devices
 */
export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  externalId: text('external_id').notNull(), // ID from external system
  name: text('name').notNull(),
  description: text('description'),
  location: text('location'),
  dataSourceId: uuid('data_source_id').notNull().references(() => dataSources.id, { onDelete: 'cascade' }),
  metadata: jsonb('metadata'), // Additional device metadata
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  dataSourceIdx: index('devices_data_source_idx').on(table.dataSourceId),
  externalIdIdx: index('devices_external_id_idx').on(table.externalId),
}));

/**
 * Metrics - Represents measurable values (e.g., temperature, power)
 */
export const metrics = pgTable('metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  externalId: text('external_id').notNull(), // ID from external system
  name: text('name').notNull(),
  unit: text('unit'), // e.g., "°C", "kW", "m³/h"
  description: text('description'),
  deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  metricType: text('metric_type'), // e.g., "gauge", "counter", "histogram"
  metadata: jsonb('metadata'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  deviceIdx: index('metrics_device_idx').on(table.deviceId),
  externalIdIdx: index('metrics_external_id_idx').on(table.externalId),
}));

/**
 * Measurements - Time-series data (TimescaleDB Hypertable)
 * This will be converted to a hypertable after migration
 */
export const measurements = pgTable('measurements', {
  time: timestamp('time', { withTimezone: true }).notNull(),
  value: doublePrecision('value').notNull(),
  metricId: uuid('metric_id').notNull().references(() => metrics.id, { onDelete: 'cascade' }),
  deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  quality: text('quality'), // Data quality indicator
  metadata: jsonb('metadata'), // Additional measurement metadata
}, (table) => ({
  timeIdx: index('measurements_time_idx').on(table.time.desc()),
  metricTimeIdx: index('measurements_metric_time_idx').on(table.metricId, table.time.desc()),
  deviceTimeIdx: index('measurements_device_time_idx').on(table.deviceId, table.time.desc()),
}));

/**
 * Dashboards - User-created dashboards
 */
export const dashboards = pgTable('dashboards', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  layout: jsonb('layout').notNull(), // Grid layout configuration
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Dashboard Widgets - Individual widgets on a dashboard
 */
export const dashboardWidgets = pgTable('dashboard_widgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  dashboardId: uuid('dashboard_id').notNull().references(() => dashboards.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  chartType: text('chart_type').notNull(), // "line", "bar", "area", "scatter"
  config: jsonb('config').notNull(), // Widget configuration (metrics, devices, time range, etc.)
  position: jsonb('position').notNull(), // Grid position
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  dashboardIdx: index('widgets_dashboard_idx').on(table.dashboardId),
}));

// Relations
export const dataSourcesRelations = relations(dataSources, ({ many }) => ({
  devices: many(devices),
}));

export const devicesRelations = relations(devices, ({ one, many }) => ({
  dataSource: one(dataSources, {
    fields: [devices.dataSourceId],
    references: [dataSources.id],
  }),
  metrics: many(metrics),
  measurements: many(measurements),
}));

export const metricsRelations = relations(metrics, ({ one, many }) => ({
  device: one(devices, {
    fields: [metrics.deviceId],
    references: [devices.id],
  }),
  measurements: many(measurements),
}));

export const measurementsRelations = relations(measurements, ({ one }) => ({
  metric: one(metrics, {
    fields: [measurements.metricId],
    references: [metrics.id],
  }),
  device: one(devices, {
    fields: [measurements.deviceId],
    references: [devices.id],
  }),
}));

export const dashboardsRelations = relations(dashboards, ({ many }) => ({
  widgets: many(dashboardWidgets),
}));

export const dashboardWidgetsRelations = relations(dashboardWidgets, ({ one }) => ({
  dashboard: one(dashboards, {
    fields: [dashboardWidgets.dashboardId],
    references: [dashboards.id],
  }),
}));
