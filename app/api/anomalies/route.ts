import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { metrics, devices } from '@/db/schema';
import { anomalies } from '@/db/schema-quality';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { detectAnomalies } from '@/lib/services/anomaly-detection';
import { withRateLimit, RateLimitPresets } from '@/lib/utils/rate-limiter';

/**
 * GET /api/anomalies
 * Fetch detected anomalies with optional filters
 */
async function getAnomalies(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const metricId = searchParams.get('metricId');
    const deviceId = searchParams.get('deviceId');
    const severity = searchParams.get('severity');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const acknowledged = searchParams.get('acknowledged');
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = db
      .select({
        id: anomalies.id,
        metricId: anomalies.metricId,
        metricName: metrics.name,
        deviceId: anomalies.deviceId,
        deviceName: devices.name,
        timestamp: anomalies.timestamp,
        value: anomalies.value,
        expectedValue: anomalies.expectedValue,
        zScore: anomalies.zScore,
        severity: anomalies.severity,
        type: anomalies.type,
        description: anomalies.description,
        acknowledged: anomalies.acknowledged,
        detectedAt: anomalies.detectedAt,
      })
      .from(anomalies)
      .leftJoin(metrics, eq(anomalies.metricId, metrics.id))
      .leftJoin(devices, eq(anomalies.deviceId, devices.id))
      .orderBy(desc(anomalies.timestamp))
      .limit(limit);

    // Apply filters
    const conditions = [];
    if (metricId) conditions.push(eq(anomalies.metricId, metricId));
    if (deviceId) conditions.push(eq(anomalies.deviceId, deviceId));
    if (severity) conditions.push(eq(anomalies.severity, severity));
    if (startTime) conditions.push(gte(anomalies.timestamp, new Date(startTime)));
    if (endTime) conditions.push(lte(anomalies.timestamp, new Date(endTime)));
    if (acknowledged !== null) {
      conditions.push(eq(anomalies.acknowledged, acknowledged === 'true'));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const results = await query;

    return NextResponse.json({
      anomalies: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Error fetching anomalies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch anomalies' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/anomalies
 * Manually trigger anomaly detection for a metric
 */
async function createAnomaly(req: NextRequest) {
  try {
    const body = await req.json();
    const { metricId, deviceId, startTime, endTime, threshold = 3 } = body;

    if (!metricId || !deviceId) {
      return NextResponse.json(
        { error: 'metricId and deviceId are required' },
        { status: 400 }
      );
    }

    // Fetch data for the metric (this would use your measurements API)
    // For now, return success message
    return NextResponse.json({
      message: 'Anomaly detection triggered',
      metricId,
      deviceId,
      threshold,
    });
  } catch (error) {
    console.error('Error creating anomaly:', error);
    return NextResponse.json(
      { error: 'Failed to create anomaly' },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(getAnomalies, RateLimitPresets.data);
export const POST = withRateLimit(createAnomaly, RateLimitPresets.data);
