# Implementation Guide

This document provides technical details about the implementation.

## Project Structure

```
IoT-Dashboard/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── devices/              # Device endpoints
│   │   ├── data-sources/         # Data source CRUD
│   │   ├── measurements/         # Time-series queries
│   │   └── sync/                 # Data synchronization
│   ├── explorer/                 # Data Explorer page
│   ├── dashboards/               # Dashboard Builder
│   ├── data-sources/             # Data source management
│   ├── layout.tsx                # Root layout (dark mode)
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Global styles
│
├── components/                   # React components
│   ├── ui/                       # Shadcn/UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   └── tabs.tsx
│   ├── explorer/                 # Explorer-specific
│   │   ├── explorer-controls.tsx
│   │   └── time-series-chart.tsx
│   └── dashboard/                # Dashboard-specific
│       ├── dashboard-grid.tsx
│       ├── dashboard-widget.tsx
│       └── add-widget-dialog.tsx
│
├── lib/                          # Utilities and services
│   ├── services/                 # Business logic
│   │   ├── linemetrics.ts        # LineMetrics adapter
│   │   └── data-sync.ts          # Sync service
│   ├── stores/                   # Zustand stores
│   │   ├── explorer-store.ts
│   │   └── dashboard-store.ts
│   └── utils.ts                  # cn() helper
│
├── db/                           # Database
│   ├── schema.ts                 # Drizzle schema
│   ├── index.ts                  # DB connection
│   └── migrations/               # Migration files
│       └── 0000_setup_timescaledb.sql
│
└── Configuration files
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── drizzle.config.ts
    ├── next.config.ts
    └── .env.example
```

## Key Implementation Details

### 1. Drizzle Schema with TimescaleDB

**File**: `db/schema.ts`

The schema is designed for time-series data:

- **Measurements table**: Configured as TimescaleDB Hypertable
- **Indexes**: Optimized for time-based queries
- **Relations**: Proper foreign keys between tables

**TimescaleDB Setup** (`db/migrations/0000_setup_timescaledb.sql`):
- Creates hypertable on `measurements`
- Sets up continuous aggregates (hourly, daily)
- Configures automatic refresh policies

### 2. LineMetrics Service Adapter

**File**: `lib/services/linemetrics.ts`

Abstraction layer for LineMetrics API:

```typescript
class LineMetricsService {
  async getDevices(): Promise<LineMetricsDevice[]>
  async getMetrics(deviceId: string): Promise<LineMetricsMetric[]>
  async getMeasurements(metricId: string, timeRange: TimeRange): Promise<...>
}
```

**Design Pattern**: Adapter pattern allows easy addition of other IoT platforms.

### 3. Data Sync Service

**File**: `lib/services/data-sync.ts`

Handles metadata and data synchronization:

- `syncLineMetricsMetadata()`: Imports devices and metrics
- `syncLineMetricsMeasurements()`: Imports historical data
- Batch insertion for performance (1000 records at a time)

### 4. Zustand State Management

**Explorer Store** (`lib/stores/explorer-store.ts`):
- Manages device/metric selection
- Time range configuration
- Chart type and aggregation settings
- Persisted to localStorage

**Dashboard Store** (`lib/stores/dashboard-store.ts`):
- Widget configurations
- Grid layout state
- Edit mode toggle

### 5. API Routes

**Measurements Query** (`app/api/measurements/query/route.ts`):

```typescript
POST /api/measurements/query
{
  "metricIds": ["uuid-1", "uuid-2"],
  "startTime": "2024-01-01T00:00:00Z",
  "endTime": "2024-01-02T00:00:00Z",
  "aggregation": "15 minutes"  // Optional
}
```

Uses TimescaleDB's `time_bucket()` function for aggregation.

### 6. Time-Series Chart Component

**File**: `components/explorer/time-series-chart.tsx`

ECharts configuration:
- Dark mode theme
- Responsive design
- Data zoom controls
- Multi-series support
- Tooltip with axis pointer

### 7. Dashboard Grid

**File**: `components/dashboard/dashboard-grid.tsx`

Uses `react-grid-layout` for drag-and-drop:
- Responsive breakpoints
- Edit mode / View mode
- Persistent layout via Zustand

## Database Queries

### Raw Data Query

```sql
SELECT
  m.time, m.value, me.name as metric_name
FROM measurements m
JOIN metrics me ON m.metric_id = me.id
WHERE m.metric_id = $1
  AND m.time >= $2
  AND m.time <= $3
ORDER BY m.time ASC
```

### Aggregated Query (TimescaleDB)

```sql
SELECT
  time_bucket('15 minutes', time) as bucket,
  metric_id,
  AVG(value) as avg_value,
  MIN(value) as min_value,
  MAX(value) as max_value
FROM measurements
WHERE metric_id = ANY($1)
  AND time >= $2
  AND time <= $3
GROUP BY bucket, metric_id
ORDER BY bucket ASC
```

### Using Continuous Aggregates

For long time ranges, query pre-aggregated data:

```sql
SELECT
  bucket,
  metric_id,
  avg_value
FROM measurements_hourly
WHERE metric_id = $1
  AND bucket >= $2
  AND bucket <= $3
```

## Performance Considerations

### 1. Auto-Aggregation Logic

The frontend automatically enables aggregation based on time range:

- < 6 hours: Raw data
- 6-24 hours: 5-minute intervals
- 1-7 days: 15-minute intervals
- 7-30 days: 1-hour intervals
- > 30 days: 6-hour or daily intervals

### 2. Data Point Limits

To prevent browser overload:
- Limit raw queries to ~5,000 points
- Use continuous aggregates for longer ranges
- Consider pagination for very large datasets

### 3. Index Strategy

```sql
-- Time-based queries (most common)
CREATE INDEX ON measurements (time DESC);

-- Metric-specific queries
CREATE INDEX ON measurements (metric_id, time DESC);

-- Device-specific queries
CREATE INDEX ON measurements (device_id, time DESC);
```

TimescaleDB automatically creates additional indexes on the time column.

## Extending the Platform

### Adding a New Data Source Type

1. **Create Adapter** (`lib/services/your-adapter.ts`):
```typescript
export class YourAdapter {
  async getDevices(): Promise<Device[]> { }
  async getMetrics(deviceId: string): Promise<Metric[]> { }
  async getMeasurements(...): Promise<Measurement[]> { }
}
```

2. **Update Sync Service** (`lib/services/data-sync.ts`):
```typescript
async syncYourAdapterMetadata(dataSourceId: string) {
  // Implementation
}
```

3. **Add API Route** (`app/api/sync/your-adapter/route.ts`)

### Adding Custom Metrics

For calculated/derived metrics:

```typescript
// lib/services/calculated-metrics.ts
export function calculateMetric(
  rawData: Measurement[],
  formula: string
): Measurement[] {
  // Implement formula evaluation
}
```

### Real-Time Updates

For WebSocket support:

1. Add WebSocket server in API route
2. Update dashboard widgets to subscribe
3. Use TimescaleDB's `LISTEN/NOTIFY` for DB changes

```typescript
// Example
const ws = new WebSocket('ws://localhost:3000/api/realtime');
ws.onmessage = (event) => {
  const newData = JSON.parse(event.data);
  updateChart(newData);
};
```

## Security Best Practices

### 1. API Token Storage

Never commit tokens to git:
```typescript
// ✅ Good
const token = process.env.LINEMETRICS_TOKEN;

// ❌ Bad
const token = "hardcoded-token";
```

### 2. SQL Injection Prevention

Drizzle ORM automatically prevents SQL injection:
```typescript
// ✅ Safe (parameterized)
await db.select().from(metrics).where(eq(metrics.id, userInput));

// ❌ Unsafe (raw SQL with concatenation)
await db.execute(sql`SELECT * FROM metrics WHERE id = '${userInput}'`);
```

### 3. Rate Limiting

Consider adding rate limiting to API routes:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

## Testing

### Unit Tests (Example)

```typescript
// __tests__/services/linemetrics.test.ts
import { LineMetricsService } from '@/lib/services/linemetrics';

describe('LineMetricsService', () => {
  it('should fetch devices', async () => {
    const service = new LineMetricsService({...});
    const devices = await service.getDevices();
    expect(devices).toBeInstanceOf(Array);
  });
});
```

### Integration Tests

Test API routes:
```typescript
// __tests__/api/measurements.test.ts
import { POST } from '@/app/api/measurements/query/route';

describe('Measurements API', () => {
  it('should return aggregated data', async () => {
    const req = new Request('http://localhost/api/measurements/query', {
      method: 'POST',
      body: JSON.stringify({...}),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
```

## Troubleshooting

### Common Issues

**1. Hypertable not created**

Check if TimescaleDB extension is enabled:
```sql
SELECT * FROM pg_extension WHERE extname = 'timescaledb';
```

**2. Slow queries**

Analyze query plan:
```sql
EXPLAIN ANALYZE
SELECT * FROM measurements WHERE ...;
```

**3. Widget not updating**

Check browser console for API errors. Verify:
- Correct metric IDs
- Valid time range
- Database connection

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [TimescaleDB Best Practices](https://docs.timescale.com/timescaledb/latest/best-practices/)
- [ECharts Documentation](https://echarts.apache.org/en/index.html)
- [Zustand Guide](https://github.com/pmndrs/zustand)

---

For questions or issues, please open a GitHub issue.
