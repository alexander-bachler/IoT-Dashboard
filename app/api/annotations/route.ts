import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit, RateLimitPresets } from '@/lib/utils/rate-limiter';

/**
 * GET /api/annotations
 * Fetch chart annotations within a time range
 */
async function getAnnotations(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const type = searchParams.get('type');

    // Mock data for now - replace with actual DB query
    const annotations = [
      {
        id: '1',
        title: 'System Deployment',
        description: 'Deployed new firmware v2.1.0',
        timestamp: new Date().toISOString(),
        type: 'deployment',
        severity: 'info',
        color: '#3b82f6',
        tags: ['deployment', 'firmware'],
      },
      {
        id: '2',
        title: 'Maintenance Window',
        description: 'Scheduled maintenance on sensors',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        endTimestamp: new Date(Date.now() - 82800000).toISOString(),
        type: 'maintenance',
        severity: 'warning',
        color: '#f59e0b',
        tags: ['maintenance', 'sensors'],
      },
    ];

    // Filter by time range
    let filtered = annotations;
    if (startTime) {
      filtered = filtered.filter(
        (a) => new Date(a.timestamp) >= new Date(startTime)
      );
    }
    if (endTime) {
      filtered = filtered.filter(
        (a) => new Date(a.timestamp) <= new Date(endTime)
      );
    }
    if (type) {
      filtered = filtered.filter((a) => a.type === type);
    }

    return NextResponse.json({
      annotations: filtered,
      count: filtered.length,
    });
  } catch (error) {
    console.error('Error fetching annotations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch annotations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/annotations
 * Create a new chart annotation
 */
async function createAnnotation(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      timestamp,
      endTimestamp,
      type = 'event',
      severity = 'info',
      color = '#3b82f6',
      tags = [],
    } = body;

    if (!title || !timestamp) {
      return NextResponse.json(
        { error: 'title and timestamp are required' },
        { status: 400 }
      );
    }

    // Mock response - replace with actual DB insert
    const annotation = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      description,
      timestamp,
      endTimestamp,
      type,
      severity,
      color,
      tags,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(annotation, { status: 201 });
  } catch (error) {
    console.error('Error creating annotation:', error);
    return NextResponse.json(
      { error: 'Failed to create annotation' },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(getAnnotations, RateLimitPresets.standard);
export const POST = withRateLimit(createAnnotation, RateLimitPresets.standard);
