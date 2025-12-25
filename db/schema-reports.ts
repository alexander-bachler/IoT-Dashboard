/**
 * Database Schema for Scheduled Reports
 * Automated report generation and delivery
 */

import { pgTable, uuid, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './schema-users';

export const scheduledReports = pgTable('scheduled_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  schedule: text('schedule').notNull(), // Cron expression
  type: text('type').notNull().default('dashboard'), // dashboard, metrics, alerts
  format: text('format').notNull().default('pdf'), // pdf, excel, json
  recipients: jsonb('recipients').$type<string[]>().notNull(), // Email addresses
  configuration: jsonb('configuration').notNull(), // Dashboard ID, metrics, time range, etc.
  isActive: boolean('is_active').notNull().default(true),
  lastRun: timestamp('last_run', { withTimezone: true }),
  nextRun: timestamp('next_run', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  nextRunIdx: index('scheduled_reports_next_run_idx').on(table.nextRun),
  activeIdx: index('scheduled_reports_active_idx').on(table.isActive),
}));

export const reportHistory = pgTable('report_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  reportId: uuid('report_id').notNull().references(() => scheduledReports.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'), // pending, running, completed, failed
  filePath: text('file_path'),
  fileSize: text('file_size'),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  reportIdIdx: index('report_history_report_id_idx').on(table.reportId),
}));

export type ScheduledReport = typeof scheduledReports.$inferSelect;
export type NewScheduledReport = typeof scheduledReports.$inferInsert;
export type ReportHistory = typeof reportHistory.$inferSelect;
export type NewReportHistory = typeof reportHistory.$inferInsert;
