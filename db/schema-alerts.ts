import { pgTable, uuid, text, timestamp, doublePrecision, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { metrics, devices } from './schema';

/**
 * Alert Rules - Define threshold-based alerts for metrics
 */
export const alertRules = pgTable('alert_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  metricId: uuid('metric_id').notNull().references(() => metrics.id, { onDelete: 'cascade' }),
  deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'cascade' }),

  // Threshold configuration
  condition: text('condition').notNull(), // 'greater_than', 'less_than', 'equal_to', 'not_equal_to'
  threshold: doublePrecision('threshold').notNull(),

  // Advanced options
  duration: text('duration'), // e.g., '5 minutes' - threshold must be breached for this duration
  severity: text('severity').notNull(), // 'info', 'warning', 'critical'

  // Notification settings
  notificationChannels: jsonb('notification_channels'), // ['email', 'webhook', 'sms']
  notificationConfig: jsonb('notification_config'), // Channel-specific config

  // Status
  isActive: boolean('is_active').default(true).notNull(),
  lastTriggered: timestamp('last_triggered', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  metricIdx: index('alert_rules_metric_idx').on(table.metricId),
  deviceIdx: index('alert_rules_device_idx').on(table.deviceId),
  activeIdx: index('alert_rules_active_idx').on(table.isActive),
}));

/**
 * Alert Events - Records of triggered alerts
 */
export const alertEvents = pgTable('alert_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  alertRuleId: uuid('alert_rule_id').notNull().references(() => alertRules.id, { onDelete: 'cascade' }),

  // Event details
  triggeredAt: timestamp('triggered_at', { withTimezone: true }).notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),

  // Measurement that triggered the alert
  measurementValue: doublePrecision('measurement_value').notNull(),
  measurementTime: timestamp('measurement_time', { withTimezone: true }).notNull(),

  // Status
  status: text('status').notNull(), // 'active', 'resolved', 'acknowledged'
  acknowledgedBy: text('acknowledged_by'),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),

  // Additional context
  metadata: jsonb('metadata'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  alertRuleIdx: index('alert_events_rule_idx').on(table.alertRuleId),
  triggeredAtIdx: index('alert_events_triggered_idx').on(table.triggeredAt.desc()),
  statusIdx: index('alert_events_status_idx').on(table.status),
}));

// Relations
export const alertRulesRelations = relations(alertRules, ({ one, many }) => ({
  metric: one(metrics, {
    fields: [alertRules.metricId],
    references: [metrics.id],
  }),
  device: one(devices, {
    fields: [alertRules.deviceId],
    references: [devices.id],
  }),
  events: many(alertEvents),
}));

export const alertEventsRelations = relations(alertEvents, ({ one }) => ({
  alertRule: one(alertRules, {
    fields: [alertEvents.alertRuleId],
    references: [alertRules.id],
  }),
}));
