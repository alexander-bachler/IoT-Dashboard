import { NextRequest, NextResponse } from 'next/server';
import { dataSyncService } from '@/lib/services/data-sync';

export async function POST(request: NextRequest) {
  try {
    const { dataSourceId } = await request.json();

    if (!dataSourceId) {
      return NextResponse.json(
        { error: 'dataSourceId is required' },
        { status: 400 }
      );
    }

    const result = await dataSyncService.syncLineMetricsMetadata(dataSourceId);

    return NextResponse.json({
      success: true,
      devicesAdded: result.devicesAdded,
      metricsAdded: result.metricsAdded,
    });
  } catch (error) {
    console.error('Error syncing metadata:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync metadata' },
      { status: 500 }
    );
  }
}
