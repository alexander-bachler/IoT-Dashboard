# LineMetrics Integration Guide

Complete guide for integrating LineMetrics IoT platform with the IoT Analytics Platform.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Frontend Integration](#frontend-integration)
- [Backend Integration](#backend-integration)
- [API Endpoints](#api-endpoints)
- [Data Flow](#data-flow)
- [Troubleshooting](#troubleshooting)

---

## Overview

The LineMetrics integration allows you to:

- **Import devices** from your LineMetrics account
- **Sync data streams** (metrics) automatically
- **Query historical data** with various aggregation options
- **Real-time monitoring** of LineMetrics devices
- **Export data** in multiple formats (CSV, JSON, Excel)

### Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  LineMetrics    │  REST   │   IoT Analytics  │   DB    │   PostgreSQL    │
│   Platform      │ ◄─────► │     Backend      │ ◄─────► │  TimescaleDB    │
└─────────────────┘   API   └──────────────────┘         └─────────────────┘
                                      ▲
                                      │ REST API
                                      ▼
                            ┌──────────────────┐
                            │   Next.js        │
                            │   Frontend       │
                            └──────────────────┘
```

---

## Prerequisites

### Required Information

Before starting, you need one of the following:

**Option 1: API Key** (Recommended)
- LineMetrics API URL
- API Key (from LineMetrics portal)

**Option 2: Username & Password**
- LineMetrics API URL
- Username
- Password

### Getting Your API Credentials

1. Log in to [LineMetrics Portal](https://service.linemetrics.com/)
2. Navigate to **Settings** → **API Keys**
3. Generate a new API key
4. Copy the key (you won't be able to see it again!)

---

## Setup

### 1. Environment Configuration

Add LineMetrics configuration to your `.env.local`:

```env
# LineMetrics API Configuration
NEXT_PUBLIC_LINEMETRICS_API_URL=https://api.linemetrics.com/v2
NEXT_PUBLIC_LINEMETRICS_API_KEY=your-api-key-here

# Optional: For development/testing
LINEMETRICS_USERNAME=your-username
LINEMETRICS_PASSWORD=your-password
```

### 2. Backend Configuration

The backend automatically uses environment variables from your `.env` file:

```env
# In backend/.env
LINEMETRICS_API_URL=https://api.linemetrics.com/v2
LINEMETRICS_API_KEY=your-api-key-here
```

---

## Frontend Integration

### Using the Configuration Component

The easiest way to configure LineMetrics is through the UI:

```tsx
import { LineMetricsConfiguration } from '@/components/integrations/linemetrics-config';

function DataSourcesPage() {
  return (
    <div>
      <h1>Data Sources</h1>
      <LineMetricsConfiguration />
    </div>
  );
}
```

### Using React Hooks

For custom implementations:

```tsx
import {
  useLineMetricsDevices,
  useLineMetricsMeasurements,
  useLineMetricsSync,
} from '@/lib/hooks/use-linemetrics';

function MyComponent() {
  // Fetch devices
  const { data: devices, isLoading } = useLineMetricsDevices({
    apiUrl: 'https://api.linemetrics.com/v2',
    apiKey: 'your-api-key',
  });

  // Sync devices to backend
  const syncMutation = useLineMetricsSync();
  const handleSync = () => {
    syncMutation.mutate({
      apiUrl: 'https://api.linemetrics.com/v2',
      apiKey: 'your-api-key',
    });
  };

  // Query measurements
  const { data: measurements } = useLineMetricsMeasurements({
    streamIds: ['stream-1', 'stream-2'],
    from: '2024-01-01T00:00:00Z',
    to: '2024-01-02T00:00:00Z',
    aggregation: 'avg',
    interval: '1h',
  });

  return (
    <div>
      {devices?.map(device => (
        <div key={device.id}>{device.name}</div>
      ))}
    </div>
  );
}
```

### Direct API Client Usage

For more control:

```typescript
import { createLineMetricsClient } from '@/lib/integrations/linemetrics-client';

const client = createLineMetricsClient({
  apiUrl: 'https://api.linemetrics.com/v2',
  apiKey: 'your-api-key',
});

// Authenticate
await client.authenticate();

// Get devices
const devices = await client.getDevices();

// Get streams for a device
const streams = await client.getDeviceStreams('device-123');

// Query measurements
const timeSeries = await client.queryMeasurements({
  streamIds: ['stream-1', 'stream-2'],
  from: '2024-01-01T00:00:00Z',
  to: '2024-01-02T00:00:00Z',
  aggregation: 'avg',
  interval: '1h',
});

// Export data
const blob = await client.exportData(
  {
    streamIds: ['stream-1'],
    from: '2024-01-01T00:00:00Z',
    to: '2024-01-02T00:00:00Z',
  },
  'csv'
);
```

---

## Backend Integration

### API Endpoints

All LineMetrics endpoints are prefixed with `/api/v1/linemetrics`:

#### Test Connection

```bash
POST /api/v1/linemetrics/test
Content-Type: application/json
Authorization: Bearer <your-jwt-token>

{
  "api_url": "https://api.linemetrics.com/v2",
  "api_key": "your-api-key"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connection successful",
  "device_count": 5
}
```

#### Get Devices

```bash
POST /api/v1/linemetrics/devices
Content-Type: application/json
Authorization: Bearer <your-jwt-token>

{
  "api_url": "https://api.linemetrics.com/v2",
  "api_key": "your-api-key"
}
```

**Response:**
```json
[
  {
    "id": "device-123",
    "name": "Temperature Sensor 1",
    "location": "Building A, Floor 2",
    "description": "Main temperature sensor",
    "stream_count": 3
  }
]
```

#### Get Device Streams

```bash
POST /api/v1/linemetrics/devices/{device_id}/streams
Content-Type: application/json
Authorization: Bearer <your-jwt-token>

{
  "api_url": "https://api.linemetrics.com/v2",
  "api_key": "your-api-key"
}
```

**Response:**
```json
[
  {
    "id": "stream-123",
    "name": "Temperature",
    "unit": "°C",
    "data_type": "number",
    "description": "Room temperature"
  }
]
```

#### Sync Devices

Import all devices and their streams into the database:

```bash
POST /api/v1/linemetrics/sync
Content-Type: application/json
Authorization: Bearer <your-jwt-token>

{
  "config": {
    "api_url": "https://api.linemetrics.com/v2",
    "api_key": "your-api-key"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sync completed successfully",
  "devices_created": 5,
  "devices_updated": 0,
  "metrics_created": 15,
  "errors": []
}
```

#### Import Measurements

Import historical time-series data:

```bash
POST /api/v1/linemetrics/import
Content-Type: application/json
Authorization: Bearer <your-jwt-token>

{
  "config": {
    "api_url": "https://api.linemetrics.com/v2",
    "api_key": "your-api-key"
  },
  "stream_ids": ["stream-1", "stream-2"],
  "from_time": "2024-01-01T00:00:00Z",
  "to_time": "2024-01-02T00:00:00Z",
  "aggregation": "avg",
  "interval": "1h"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Imported 240 measurements",
  "measurements_imported": 240,
  "errors": []
}
```

---

## Data Flow

### 1. Initial Setup

```
User → Configure API Credentials → Test Connection → ✓ Success
```

### 2. Device Synchronization

```
Click "Sync" → Fetch from LineMetrics → Create DataSource
              ↓
         Create Devices
              ↓
         Create Metrics (Streams)
              ↓
         Save to Database
```

### 3. Data Import

```
Select Time Range → Query LineMetrics API → Transform Data
                    ↓
               Batch Insert → TimescaleDB
                    ↓
               Available for Analysis
```

### 4. Real-time Updates (Optional)

For real-time data, you can:
- Set up periodic imports (cron job)
- Use webhooks (if supported by LineMetrics)
- Poll for latest measurements

---

## Data Mapping

### LineMetrics → IoT Analytics Platform

| LineMetrics | Platform Entity | Database Table |
|-------------|----------------|----------------|
| Account | Data Source | `data_sources` |
| Device | Device | `devices` |
| Stream | Metric | `metrics` |
| Measurement | Measurement | `measurements` |

### Field Mapping

**Device:**
```
LineMetrics Device → Platform Device
├── id → external_id
├── name → name
├── location → location
└── description → description
```

**Stream (Metric):**
```
LineMetrics Stream → Platform Metric
├── id → external_id
├── name → name
├── unit → unit
├── dataType → data_type
└── description → description
```

**Measurement:**
```
LineMetrics Measurement → Platform Measurement
├── timestamp → time
├── value → value
└── quality → quality
```

---

## Aggregation Options

### Supported Aggregations

| Aggregation | Description | Example Use Case |
|-------------|-------------|------------------|
| `none` | Raw data points | Detailed analysis |
| `avg` | Average value | Temperature trends |
| `min` | Minimum value | Find lowest point |
| `max` | Maximum value | Find peak usage |
| `sum` | Sum of values | Total energy consumption |

### Interval Examples

| Interval | Description |
|----------|-------------|
| `1m` | 1 minute |
| `5m` | 5 minutes |
| `15m` | 15 minutes |
| `1h` | 1 hour |
| `1d` | 1 day |
| `1w` | 1 week |

### Example Query

```typescript
const measurements = await client.queryMeasurements({
  streamIds: ['energy-meter-1'],
  from: '2024-01-01T00:00:00Z',
  to: '2024-01-31T23:59:59Z',
  aggregation: 'sum',    // Total energy
  interval: '1d',        // Per day
});

// Result: Daily energy consumption for January
```

---

## Troubleshooting

### Common Issues

#### 1. Connection Failed

**Error:** `Connection failed: 401 Unauthorized`

**Solution:**
- Verify your API key is correct
- Check if the API key has expired
- Ensure you're using the correct API URL

#### 2. No Devices Found

**Error:** `No devices found`

**Solution:**
- Log in to LineMetrics portal and verify devices exist
- Check if your API key has access to the devices
- Verify the account has active devices

#### 3. Import Timeout

**Error:** `Request timeout`

**Solution:**
- Reduce the time range for import
- Use aggregation to reduce data volume
- Import in smaller batches

#### 4. Authentication Error

**Error:** `Failed to authenticate`

**Solution:**
- If using username/password, verify credentials
- Check if two-factor authentication is enabled
- Try using API key instead

### Debug Mode

Enable debug logging:

```typescript
// In browser console
localStorage.setItem('DEBUG', 'linemetrics:*');
```

Check backend logs:

```bash
# View FastAPI logs
tail -f logs/app.log

# Check for LineMetrics-related errors
grep "linemetrics" logs/app.log
```

---

## Best Practices

### 1. Initial Import

- Start with a small date range (1 day)
- Test with a single device first
- Use aggregation for large datasets

### 2. Regular Sync

Set up a scheduled sync:

```bash
# Cron job example (daily at 2 AM)
0 2 * * * curl -X POST http://localhost:8000/api/v1/linemetrics/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"config": {"api_key": "'"$LINEMETRICS_API_KEY"'"}}'
```

### 3. Data Retention

Configure data retention policies:
- Keep raw data for 30 days
- Keep 1-hour aggregates for 1 year
- Keep daily aggregates indefinitely

### 4. Error Handling

Always check the `errors` array in responses:

```typescript
const result = await syncMutation.mutateAsync(config);

if (result.errors.length > 0) {
  console.error('Sync errors:', result.errors);
  // Handle errors appropriately
}
```

---

## Security Considerations

### API Key Storage

- **Never** commit API keys to version control
- Use environment variables
- Rotate keys regularly
- Use different keys for dev/staging/production

### Rate Limiting

LineMetrics API may have rate limits:
- Implement exponential backoff
- Cache device/stream lists
- Batch measurement queries

### Data Privacy

- Ensure compliance with data protection regulations
- Implement access controls
- Encrypt data at rest and in transit

---

## Examples

### Complete Integration Flow

```typescript
// 1. Test connection
const connectionTest = await fetch('/api/v1/linemetrics/test', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    api_url: 'https://api.linemetrics.com/v2',
    api_key: 'your-api-key',
  }),
});

// 2. Sync devices
const syncResult = await fetch('/api/v1/linemetrics/sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    config: {
      api_url: 'https://api.linemetrics.com/v2',
      api_key: 'your-api-key',
    },
  }),
});

// 3. Import last 7 days of data
const importResult = await fetch('/api/v1/linemetrics/import', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    config: {
      api_url: 'https://api.linemetrics.com/v2',
      api_key: 'your-api-key',
    },
    stream_ids: ['stream-1', 'stream-2'],
    from_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    to_time: new Date().toISOString(),
    aggregation: 'avg',
    interval: '1h',
  }),
});
```

---

## Support

For issues and questions:

1. Check the [LineMetrics API Documentation](https://rest-api-doc.linemetrics.com/v2/)
2. Review this integration guide
3. Check application logs
4. Contact LineMetrics support for API-specific issues

---

## Changelog

### Version 1.0.0 (2024-01-01)

- Initial LineMetrics integration
- Device and stream synchronization
- Historical data import
- Frontend configuration UI
- Backend API endpoints

---

## License

This integration is part of the IoT Analytics Platform v3.0.0.
