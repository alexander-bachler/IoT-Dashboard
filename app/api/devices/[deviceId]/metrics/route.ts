import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { metrics } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;

    const deviceMetrics = await db
      .select()
      .from(metrics)
      .where(eq(metrics.deviceId, deviceId));

    return NextResponse.json({ metrics: deviceMetrics });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
