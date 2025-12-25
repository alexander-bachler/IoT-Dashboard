import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dataSources } from '@/db/schema';

export async function GET() {
  try {
    const allDataSources = await db.select().from(dataSources);
    return NextResponse.json({ dataSources: allDataSources });
  } catch (error) {
    console.error('Error fetching data sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data sources' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, apiUrl, apiToken, clientId, config } = body;

    const [newDataSource] = await db
      .insert(dataSources)
      .values({
        name,
        type,
        apiUrl,
        apiToken,
        clientId,
        config: config || null,
      })
      .returning();

    return NextResponse.json({ dataSource: newDataSource });
  } catch (error) {
    console.error('Error creating data source:', error);
    return NextResponse.json(
      { error: 'Failed to create data source' },
      { status: 500 }
    );
  }
}
