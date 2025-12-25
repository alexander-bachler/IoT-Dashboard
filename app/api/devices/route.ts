import { NextResponse } from 'next/server';
import { db } from '@/db';
import { devices, dataSources } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allDevices = await db
      .select({
        id: devices.id,
        externalId: devices.externalId,
        name: devices.name,
        description: devices.description,
        location: devices.location,
        dataSourceId: devices.dataSourceId,
        dataSourceName: dataSources.name,
        isActive: devices.isActive,
      })
      .from(devices)
      .leftJoin(dataSources, eq(devices.dataSourceId, dataSources.id))
      .where(eq(devices.isActive, true));

    return NextResponse.json({ devices: allDevices });
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}
