import { NextRequest, NextResponse } from 'next/server';
import { calculateDataQuality } from '@/lib/services/anomaly-detection';
import { withRateLimit, RateLimitPresets } from '@/lib/utils/rate-limiter';

/**
 * POST /api/quality
 * Calculate data quality metrics for a given dataset
 */
async function calculateQuality(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, expectedInterval = 60000 } = body;

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Data array is required' },
        { status: 400 }
      );
    }

    const quality = calculateDataQuality(data, expectedInterval);

    return NextResponse.json({
      quality,
      dataPoints: data.length,
      timeSpan:
        data.length > 1
          ? new Date(data[data.length - 1].time).getTime() -
            new Date(data[0].time).getTime()
          : 0,
    });
  } catch (error) {
    console.error('Error calculating quality:', error);
    return NextResponse.json(
      { error: 'Failed to calculate quality' },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(calculateQuality, RateLimitPresets.data);
