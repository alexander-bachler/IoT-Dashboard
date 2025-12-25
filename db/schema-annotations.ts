/**
 * Database Schema for Chart Annotations
 * Allows users to mark events on charts
 */

import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from './schema-users';

export const chartAnnotations = pgTable('chart_annotations', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  endTimestamp: timestamp('end_timestamp', { withTimezone: true }), // For range annotations
  type: text('type').notNull().default('event'), // event, deployment, incident, maintenance
  severity: text('severity'), // info, warning, critical
  color: text('color').default('#3b82f6'),
  tags: jsonb('tags').$type<string[]>().default([]),
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ChartAnnotation = typeof chartAnnotations.$inferSelect;
export type NewChartAnnotation = typeof chartAnnotations.$inferInsert;
