import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Database connection
const connectionString = process.env.DATABASE_URL!;

// Disable prefetch as it's not supported for "Transaction" pool mode
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });

// Type exports
export type DataSource = typeof schema.dataSources.$inferSelect;
export type NewDataSource = typeof schema.dataSources.$inferInsert;

export type Device = typeof schema.devices.$inferSelect;
export type NewDevice = typeof schema.devices.$inferInsert;

export type Metric = typeof schema.metrics.$inferSelect;
export type NewMetric = typeof schema.metrics.$inferInsert;

export type Measurement = typeof schema.measurements.$inferSelect;
export type NewMeasurement = typeof schema.measurements.$inferInsert;

export type Dashboard = typeof schema.dashboards.$inferSelect;
export type NewDashboard = typeof schema.dashboards.$inferInsert;

export type DashboardWidget = typeof schema.dashboardWidgets.$inferSelect;
export type NewDashboardWidget = typeof schema.dashboardWidgets.$inferInsert;
