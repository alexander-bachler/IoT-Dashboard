/**
 * Data Sync Service
 * Handles synchronization of metadata and measurements from external sources to our database
 */

import { db } from '@/db';
import { dataSources, devices, metrics, measurements } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { LineMetricsService, TimeRange } from './linemetrics';

export class DataSyncService {
  /**
   * Sync metadata (devices and metrics) from a LineMetrics data source
   */
  async syncLineMetricsMetadata(dataSourceId: string): Promise<{
    devicesAdded: number;
    metricsAdded: number;
  }> {
    // Get data source configuration
    const [dataSource] = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.id, dataSourceId));

    if (!dataSource) {
      throw new Error(`Data source ${dataSourceId} not found`);
    }

    if (dataSource.type !== 'linemetrics') {
      throw new Error(`Data source must be of type 'linemetrics'`);
    }

    // Create LineMetrics service
    const service = new LineMetricsService({
      apiUrl: dataSource.apiUrl,
      apiToken: dataSource.apiToken,
      clientId: dataSource.clientId || undefined,
    });

    let devicesAdded = 0;
    let metricsAdded = 0;

    // Fetch and sync devices
    const externalDevices = await service.getDevices();

    for (const externalDevice of externalDevices) {
      // Check if device already exists
      const existing = await db
        .select()
        .from(devices)
        .where(eq(devices.externalId, externalDevice.id));

      if (existing.length === 0) {
        // Insert new device
        const [newDevice] = await db
          .insert(devices)
          .values({
            externalId: externalDevice.id,
            name: externalDevice.name,
            description: externalDevice.description,
            location: externalDevice.location,
            dataSourceId,
            metadata: externalDevice.metadata as any,
          })
          .returning();

        devicesAdded++;

        // Fetch and sync metrics for this device
        const externalMetrics = await service.getMetrics(externalDevice.id);

        for (const externalMetric of externalMetrics) {
          await db.insert(metrics).values({
            externalId: externalMetric.id,
            name: externalMetric.name,
            unit: externalMetric.unit,
            description: externalMetric.description,
            deviceId: newDevice.id,
            metricType: externalMetric.metricType,
          });

          metricsAdded++;
        }
      }
    }

    // Update last sync timestamp
    await db
      .update(dataSources)
      .set({ lastSync: new Date() })
      .where(eq(dataSources.id, dataSourceId));

    return { devicesAdded, metricsAdded };
  }

  /**
   * Sync historical measurements for a specific metric
   */
  async syncLineMetricsMeasurements(
    metricId: string,
    timeRange: TimeRange,
    options?: {
      aggregation?: 'raw' | '1min' | '5min' | '15min' | '1hour' | '1day';
    }
  ): Promise<number> {
    // Get metric and its device
    const [metric] = await db
      .select()
      .from(metrics)
      .where(eq(metrics.id, metricId));

    if (!metric) {
      throw new Error(`Metric ${metricId} not found`);
    }

    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, metric.deviceId));

    if (!device) {
      throw new Error(`Device for metric ${metricId} not found`);
    }

    const [dataSource] = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.id, device.dataSourceId));

    if (!dataSource) {
      throw new Error(`Data source not found`);
    }

    // Create LineMetrics service
    const service = new LineMetricsService({
      apiUrl: dataSource.apiUrl,
      apiToken: dataSource.apiToken,
      clientId: dataSource.clientId || undefined,
    });

    // Fetch measurements
    const externalMeasurements = await service.getMeasurements(
      metric.externalId,
      timeRange,
      options
    );

    // Insert measurements in batches
    const batchSize = 1000;
    let inserted = 0;

    for (let i = 0; i < externalMeasurements.length; i += batchSize) {
      const batch = externalMeasurements.slice(i, i + batchSize);

      await db.insert(measurements).values(
        batch.map((m) => ({
          time: new Date(m.timestamp),
          value: m.value,
          metricId: metric.id,
          deviceId: device.id,
          quality: m.quality,
        }))
      );

      inserted += batch.length;
    }

    return inserted;
  }

  /**
   * Sync measurements for all metrics of a device
   */
  async syncDeviceMeasurements(
    deviceId: string,
    timeRange: TimeRange,
    options?: {
      aggregation?: 'raw' | '1min' | '5min' | '15min' | '1hour' | '1day';
    }
  ): Promise<number> {
    // Get all metrics for the device
    const deviceMetrics = await db
      .select()
      .from(metrics)
      .where(eq(metrics.deviceId, deviceId));

    let totalInserted = 0;

    for (const metric of deviceMetrics) {
      const inserted = await this.syncLineMetricsMeasurements(
        metric.id,
        timeRange,
        options
      );
      totalInserted += inserted;
    }

    return totalInserted;
  }
}

export const dataSyncService = new DataSyncService();
