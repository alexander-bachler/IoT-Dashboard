/**
 * Database Schema for Custom Calculations
 * Derived metrics and computed values
 */

import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './schema-users';
import { metrics } from './schema';

export const customCalculations = pgTable('custom_calculations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  formula: text('formula').notNull(), // e.g., "SUM(metric_a, metric_b)", "AVG(metric_c) * 1.5"
  sourceMetricIds: jsonb('source_metric_ids').$type<string[]>().notNull(),
  unit: text('unit'),
  aggregationType: text('aggregation_type').default('none'), // none, sum, avg, min, max
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const derivedMetrics = pgTable('derived_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  calculationId: uuid('calculation_id').notNull().references(() => customCalculations.id, { onDelete: 'cascade' }),
  time: timestamp('time', { withTimezone: true }).notNull(),
  value: text('value').notNull(), // Using text to support large numbers
  metadata: jsonb('metadata'),
}, (table) => ({
  calcTimeIdx: index('derived_metrics_calc_time_idx').on(table.calculationId, table.time.desc()),
}));

export type CustomCalculation = typeof customCalculations.$inferSelect;
export type NewCustomCalculation = typeof customCalculations.$inferInsert;
export type DerivedMetric = typeof derivedMetrics.$inferSelect;
export type NewDerivedMetric = typeof derivedMetrics.$inferInsert;
