# API Integration Guide

This document explains how to use the API integration layer that has been set up for the IoT Analytics Platform.

## Overview

The platform now includes a complete API integration layer using:
- **TanStack Query (React Query)** - For data fetching, caching, and state management
- **Axios** - For HTTP requests with interceptors
- **TypeScript** - For type-safe API calls

## Architecture

```
lib/
├── api/
│   ├── client.ts           # Axios instance with interceptors
│   ├── types.ts            # TypeScript interfaces for all API data
│   └── services/
│       ├── data-sources.ts # Data source API functions
│       ├── measurements.ts # Measurements API functions
│       └── anomalies.ts    # Anomalies API functions
└── hooks/
    ├── use-data-sources.ts # React Query hooks for data sources
    ├── use-measurements.ts # React Query hooks for measurements
    └── use-anomalies.ts    # React Query hooks for anomalies
```

## Configuration

### Environment Variables

Create a `.env.local` file in the project root:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Optional: Authentication
NEXT_PUBLIC_AUTH_TOKEN=your_token_here
```

### API Base URL

The API client is configured to use `/api` by default, which works with Next.js API routes. You can change this in `lib/api/client.ts`:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
```

## Usage Examples

### 1. Fetching Data Sources

```typescript
'use client';

import { useDataSources } from '@/lib/hooks/use-data-sources';
import { Skeleton } from '@/components/ui/skeleton-loader';
import { ErrorState } from '@/components/ui/empty-state';

export function DataSourcesList() {
  const { data, isLoading, error, refetch } = useDataSources({
    page: 1,
    page_size: 10,
  });

  if (isLoading) {
    return <Skeleton className="h-32" />;
  }

  if (error) {
    return <ErrorState onRetry={refetch} />;
  }

  return (
    <div>
      {data?.data.map((source) => (
        <div key={source.id}>{source.name}</div>
      ))}
    </div>
  );
}
```

### 2. Fetching Time-Series Data

```typescript
'use client';

import { useTimeSeriesMeasurements } from '@/lib/hooks/use-measurements';
import { LineChart } from '@/components/charts/line-chart';

export function MetricChart({ metricId }: { metricId: string }) {
  const { data, isLoading } = useTimeSeriesMeasurements({
    metric_ids: [metricId],
    start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date().toISOString(),
    interval: '1h',
    aggregation: 'avg',
  });

  if (isLoading) return <div>Loading...</div>;

  return <LineChart series={data || []} />;
}
```

### 3. Creating a Data Source

```typescript
'use client';

import { useCreateDataSource } from '@/lib/hooks/use-data-sources';
import { Button } from '@/components/ui/button';

export function CreateDataSourceButton() {
  const { mutate: createDataSource, isPending } = useCreateDataSource();

  const handleCreate = () => {
    createDataSource({
      name: 'New API Source',
      type: 'api',
      api_url: 'https://api.example.com',
      description: 'Example data source',
    });
  };

  return (
    <Button onClick={handleCreate} disabled={isPending}>
      {isPending ? 'Creating...' : 'Create Data Source'}
    </Button>
  );
}
```

### 4. Updating Anomalies

```typescript
'use client';

import { useUpdateAnomaly } from '@/lib/hooks/use-anomalies';

export function AcknowledgeAnomalyButton({ anomalyId }: { anomalyId: string }) {
  const { mutate: updateAnomaly } = useUpdateAnomaly();

  const handleAcknowledge = () => {
    updateAnomaly({
      id: anomalyId,
      data: {
        status: 'acknowledged',
        acknowledged_by: 'current_user',
      },
    });
  };

  return <Button onClick={handleAcknowledge}>Acknowledge</Button>;
}
```

## Available Hooks

### Data Sources

- `useDataSources(params?)` - Fetch all data sources with pagination
- `useDataSource(id)` - Fetch single data source
- `useDataSourceStats(id)` - Fetch data source statistics
- `useCreateDataSource()` - Create new data source
- `useUpdateDataSource()` - Update existing data source
- `useDeleteDataSource()` - Delete data source
- `useTestConnection()` - Test data source connection
- `useSyncDataSource()` - Trigger data sync

### Measurements

- `useTimeSeriesMeasurements(params)` - Fetch time-series data
- `useLatestMeasurements(metricIds)` - Fetch latest measurements
- `useMeasurementStatistics(metricId, startTime, endTime)` - Fetch statistics
- `useDownsampledMeasurements(params)` - Fetch downsampled data for charts
- `useInsertMeasurements()` - Insert measurements in batch
- `useDeleteMeasurementRange()` - Delete measurements

### Anomalies

- `useAnomalies(params?)` - Fetch all anomalies with filtering
- `useAnomaly(id)` - Fetch single anomaly
- `useAnomalyStatistics(params?)` - Fetch anomaly statistics
- `useRecentAnomalies(limit)` - Fetch recent anomalies
- `useUpdateAnomaly()` - Update anomaly status
- `useBulkUpdateAnomalies()` - Bulk update anomalies
- `useDeleteAnomaly()` - Delete anomaly
- `useTriggerAnomalyDetection()` - Trigger anomaly detection

## Query Features

### Auto-refetch

Queries automatically refetch on:
- Window focus (configurable)
- Network reconnection
- At specified intervals (for real-time data)

```typescript
const { data } = useLatestMeasurements(metricIds);
// Auto-refetches every 30 seconds
```

### Manual Refetch

```typescript
const { data, refetch } = useDataSources();

<Button onClick={() => refetch()}>Refresh</Button>
```

### Optimistic Updates

```typescript
const { mutate } = useUpdateAnomaly();

mutate(
  { id: '123', data: { status: 'acknowledged' } },
  {
    onMutate: async (variables) => {
      // Optimistically update the UI
      await queryClient.cancelQueries({ queryKey: anomalyKeys.detail(variables.id) });
      const previousData = queryClient.getQueryData(anomalyKeys.detail(variables.id));

      queryClient.setQueryData(anomalyKeys.detail(variables.id), {
        ...previousData,
        status: 'acknowledged',
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(anomalyKeys.detail(variables.id), context?.previousData);
    },
  }
);
```

### Loading States

```typescript
const { data, isLoading, isFetching, isError, error } = useDataSources();

if (isLoading) return <Skeleton />;
if (isError) return <ErrorState error={error} />;

return <DataView data={data} isRefreshing={isFetching} />;
```

## Error Handling

### Global Error Handling

Errors are handled globally in the Axios interceptor (`lib/api/client.ts`):
- Automatic toast notifications for errors
- 401 errors trigger auth flow
- Network errors show connection message

### Custom Error Handling

```typescript
const { mutate } = useCreateDataSource();

mutate(data, {
  onError: (error) => {
    if (error.response?.status === 409) {
      toast.error('Data source already exists');
    }
  },
});
```

### Error Boundaries

Wrap components in ErrorBoundary for React error handling:

```typescript
import { ErrorBoundary } from '@/components/ui/error-boundary';

<ErrorBoundary>
  <DataSourcesList />
</ErrorBoundary>
```

## Caching Strategy

React Query caches data with these defaults:
- **staleTime**: 30 seconds - Data is considered fresh for 30s
- **gcTime**: 5 minutes - Unused data is garbage collected after 5min
- **refetchOnWindowFocus**: true - Refetch when window regains focus
- **refetchOnReconnect**: true - Refetch when network reconnects

### Custom Cache Time

```typescript
const { data } = useDataSources(params, {
  staleTime: 60 * 1000, // 1 minute
  gcTime: 10 * 60 * 1000, // 10 minutes
});
```

## Development Tools

React Query Devtools are enabled in development mode:
- Access via bottom-right icon
- View all queries and mutations
- Inspect cache data
- Trigger manual refetches

## Next Steps

### Connect to Real Backend

1. **Update API Routes** in `app/api/` to connect to TimescaleDB using Drizzle ORM
2. **Test Endpoints** using the React Query Devtools
3. **Handle Authentication** by updating the request interceptor in `lib/api/client.ts`
4. **Add More Services** as needed (devices, dashboards, ETL pipelines)

### Example: Connecting to Database

```typescript
// app/api/data-sources/route.ts
import { db } from '@/lib/db';
import { dataSourcesTable } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  const dataSources = await db.select().from(dataSourcesTable);

  return NextResponse.json({
    data: dataSources,
    total: dataSources.length,
  });
}
```

## Best Practices

1. **Always use hooks** instead of calling API functions directly
2. **Handle loading and error states** in every component
3. **Use query keys consistently** for cache invalidation
4. **Implement optimistic updates** for better UX
5. **Set appropriate staleTime** based on data freshness requirements
6. **Use ErrorBoundary** for critical sections
7. **Test with React Query Devtools** in development

## Troubleshooting

### Query not refetching
- Check `staleTime` and `gcTime` settings
- Ensure `refetchOnWindowFocus` is enabled
- Verify query key dependencies

### Mutations not updating UI
- Call `queryClient.invalidateQueries()` in `onSuccess`
- Check query key structure matches

### Network errors
- Verify API_BASE_URL is correct
- Check CORS settings for external APIs
- Inspect network tab in browser devtools

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [Axios Docs](https://axios-http.com/docs/intro)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
