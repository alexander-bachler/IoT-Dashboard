import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { measurements, metrics } from '@/db/schema';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { withRateLimit, RateLimitPresets } from '@/lib/utils/rate-limiter';

interface MeasurementQueryParams {
  metricIds: string[];
  startTime: string;
  endTime: string;
  aggregation?: string; // e.g., '15 minutes', '1 hour'
}

async function handlePost(request: NextRequest) {
  try {
    const body: MeasurementQueryParams = await request.json();
    const { metricIds, startTime, endTime, aggregation } = body;

    if (!metricIds || metricIds.length === 0) {
      return NextResponse.json(
        { error: 'metricIds is required' },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    // If aggregation is requested, use TimescaleDB time_bucket
    if (aggregation) {
      const result = await db
        .select({
          metricId: measurements.metricId,
          metricName: metrics.name,
          metricUnit: metrics.unit,
          bucket: sql<string>`time_bucket(${aggregation}::interval, ${measurements.time})`.as('bucket'),
          avgValue: sql<number>`AVG(${measurements.value})`.as('avg_value'),
          minValue: sql<number>`MIN(${measurements.value})`.as('min_value'),
          maxValue: sql<number>`MAX(${measurements.value})`.as('max_value'),
          count: sql<number>`COUNT(*)`.as('count'),
        })
        .from(measurements)
        .leftJoin(metrics, eq(measurements.metricId, metrics.id))
        .where(
          and(
            inArray(measurements.metricId, metricIds),
            gte(measurements.time, start),
            lte(measurements.time, end)
          )
        )
        .groupBy(measurements.metricId, metrics.name, metrics.unit, sql`bucket`)
        .orderBy(sql`bucket ASC`);

      // Transform to series format
      const seriesMap = new Map<string, any>();

      result.forEach((row) => {
        if (!seriesMap.has(row.metricId)) {
          seriesMap.set(row.metricId, {
            metricId: row.metricId,
            metricName: row.metricName,
            metricUnit: row.metricUnit,
            data: [],
          });
        }

        seriesMap.get(row.metricId).data.push({
          time: row.bucket,
          value: row.avgValue,
          min: row.minValue,
          max: row.maxValue,
          count: row.count,
        });
      });

      return NextResponse.json({
        series: Array.from(seriesMap.values()),
        aggregated: true,
      });
    }

    // Raw data query (no aggregation)
    const result = await db
      .select({
        metricId: measurements.metricId,
        metricName: metrics.name,
        metricUnit: metrics.unit,
        time: measurements.time,
        value: measurements.value,
      })
      .from(measurements)
      .leftJoin(metrics, eq(measurements.metricId, metrics.id))
      .where(
        and(
          inArray(measurements.metricId, metricIds),
          gte(measurements.time, start),
          lte(measurements.time, end)
        )
      )
      .orderBy(measurements.time);

    // Transform to series format
    const seriesMap = new Map<string, any>();

    result.forEach((row) => {
      if (!seriesMap.has(row.metricId)) {
        seriesMap.set(row.metricId, {
          metricId: row.metricId,
          metricName: row.metricName,
          metricUnit: row.metricUnit,
          data: [],
        });
      }

      seriesMap.get(row.metricId).data.push({
        time: row.time,
        value: row.value,
      });
    });

    return NextResponse.json({
      series: Array.from(seriesMap.values()),
      aggregated: false,
    });
  } catch (error) {
    console.error('Error querying measurements:', error);
    return NextResponse.json(
      { error: 'Failed to query measurements' },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handlePost, RateLimitPresets.data);
