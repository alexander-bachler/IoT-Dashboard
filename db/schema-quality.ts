/**
 * Database Schema for Data Quality Monitoring & Anomaly Detection
 * Track data quality metrics and detect anomalies
 */

import { pgTable, uuid, text, timestamp, doublePrecision, jsonb, index, boolean } from 'drizzle-orm/pg-core';
import { metrics, devices } from './schema';

export const dataQualityMetrics = pgTable('data_quality_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  metricId: uuid('metric_id').references(() => metrics.id, { onDelete: 'cascade' }),
  deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'cascade' }),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  expectedCount: doublePrecision('expected_count'), // Expected number of data points
  actualCount: doublePrecision('actual_count'), // Actual number of data points
  missingCount: doublePrecision('missing_count'), // Missing data points
  completeness: doublePrecision('completeness'), // Percentage (0-100)
  latency: doublePrecision('latency'), // Average latency in ms
  outOfOrderCount: doublePrecision('out_of_order_count'), // Out-of-order data points
  duplicateCount: doublePrecision('duplicate_count'), // Duplicate data points
  metadata: jsonb('metadata'),
}, (table) => ({
  metricTimeIdx: index('data_quality_metric_time_idx').on(table.metricId, table.timestamp.desc()),
  deviceTimeIdx: index('data_quality_device_time_idx').on(table.deviceId, table.timestamp.desc()),
}));

export const anomalies = pgTable('anomalies', {
  id: uuid('id').defaultRandom().primaryKey(),
  metricId: uuid('metric_id').notNull().references(() => metrics.id, { onDelete: 'cascade' }),
  deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  value: doublePrecision('value').notNull(),
  expectedValue: doublePrecision('expected_value'),
  zScore: doublePrecision('z_score'), // Statistical z-score
  severity: text('severity').notNull().default('low'), // low, medium, high, critical
  type: text('type').notNull().default('statistical'), // statistical, threshold, pattern, ml
  description: text('description'),
  acknowledged: boolean('acknowledged').notNull().default(false),
  acknowledgedBy: uuid('acknowledged_by'),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
  detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  metricTimeIdx: index('anomalies_metric_time_idx').on(table.metricId, table.timestamp.desc()),
  deviceTimeIdx: index('anomalies_device_time_idx').on(table.deviceId, table.timestamp.desc()),
  severityIdx: index('anomalies_severity_idx').on(table.severity),
  acknowledgedIdx: index('anomalies_acknowledged_idx').on(table.acknowledged),
}));

export const anomalyModels = pgTable('anomaly_models', {
  id: uuid('id').defaultRandom().primaryKey(),
  metricId: uuid('metric_id').notNull().references(() => metrics.id, { onDelete: 'cascade' }),
  algorithm: text('algorithm').notNull().default('z-score'), // z-score, isolation-forest, prophet
  parameters: jsonb('parameters').notNull(), // Model-specific parameters
  trainingData: jsonb('training_data'), // Training dataset metadata
  mean: doublePrecision('mean'),
  stdDev: doublePrecision('std_dev'),
  threshold: doublePrecision('threshold').default(3.0), // Z-score threshold
  lastTrained: timestamp('last_trained', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  metricIdx: index('anomaly_models_metric_idx').on(table.metricId),
}));

export type DataQualityMetric = typeof dataQualityMetrics.$inferSelect;
export type NewDataQualityMetric = typeof dataQualityMetrics.$inferInsert;
export type Anomaly = typeof anomalies.$inferSelect;
export type NewAnomaly = typeof anomalies.$inferInsert;
export type AnomalyModel = typeof anomalyModels.$inferSelect;
export type NewAnomalyModel = typeof anomalyModels.$inferInsert;
