# IoT Time-Series Analytics Platform

A professional, modern IoT data visualization platform built with Next.js, TimescaleDB, and Apache ECharts. Similar to Power BI but specifically designed for time-series data from IoT devices.

## 🚀 Features

- **Data Source Management**: Connect to LineMetrics and other IoT platforms
- **Data Explorer**: Ad-hoc analysis with interactive charts
- **Dashboard Builder**: Create custom dashboards with drag-and-drop widgets
- **Time-Series Optimization**: Powered by TimescaleDB for high-performance queries
- **Auto-Aggregation**: Intelligent data aggregation for large time ranges
- **Real-time Updates**: Configurable auto-refresh for widgets
- **Modern UI**: Dark mode, professional design with Shadcn/UI

## 📦 Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, React 19
- **UI Library**: Shadcn/UI (Tailwind CSS + Radix UI)
- **Charts**: Apache ECharts
- **State Management**: Zustand
- **Database**: PostgreSQL + TimescaleDB
- **ORM**: Drizzle ORM
- **Grid Layout**: react-grid-layout

## 🏗️ Architecture

```
┌─────────────────┐
│  Next.js App    │
│  (Frontend)     │
└────────┬────────┘
         │
         ├─► API Routes
         │   ├─► /api/devices
         │   ├─► /api/measurements/query
         │   └─► /api/sync/metadata
         │
         ▼
┌─────────────────┐
│  TimescaleDB    │
│  (PostgreSQL)   │
│                 │
│  - Hypertables  │
│  - Aggregates   │
└─────────────────┘
         ▲
         │
┌────────┴────────┐
│ Ingestion Layer │
│ (LineMetrics)   │
└─────────────────┘
```

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ with TimescaleDB extension
- (Optional) Docker for easy database setup

## 🛠️ Setup Instructions

### 1. Database Setup

#### Option A: Using Docker (Recommended)

```bash
docker run -d --name timescaledb \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=iot_dashboard \
  timescale/timescaledb:latest-pg14
```

#### Option B: Local PostgreSQL

Install TimescaleDB extension:

```bash
# Ubuntu/Debian
sudo add-apt-repository ppa:timescale/timescaledb-ppa
sudo apt install timescaledb-postgresql-14

# macOS (Homebrew)
brew install timescaledb

# Then create database
createdb iot_dashboard
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/iot_dashboard"
```

### 4. Database Migration

Generate and run migrations:

```bash
# Generate migration files
npm run db:generate

# Push schema to database
npm run db:push
```

After the schema is created, manually run the TimescaleDB setup:

```bash
psql -d iot_dashboard -f db/migrations/0000_setup_timescaledb.sql
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📖 Usage Guide

### 1. Add a Data Source

1. Navigate to **Data Sources**
2. Click **Add Data Source**
3. Enter your LineMetrics credentials:
   - Name: Friendly name for the source
   - API URL: `https://api.linemetrics.com/v1`
   - API Token: Your LineMetrics API token
   - Client ID: (Optional) Your client ID
4. Click **Add Source**

### 2. Sync Metadata

1. On the data source card, click **Sync Metadata**
2. This will import:
   - All devices from your LineMetrics account
   - All metrics for each device
3. Wait for the sync to complete

### 3. Explore Data

1. Navigate to **Data Explorer**
2. Select a device from the dropdown
3. Choose one or more metrics
4. Select a time range
5. Configure chart type and aggregation
6. Data will load automatically

### 4. Create Dashboards

1. Navigate to **Dashboards**
2. Click **Add Widget**
3. Configure the widget:
   - Title
   - Device and metrics
   - Chart type
   - Time range
   - Aggregation interval
   - Refresh interval
4. Click **Add Widget**
5. Use **Edit Mode** to drag and resize widgets

## 🔧 Database Schema

### Tables

- **data_sources**: API credentials and connection info
- **devices**: IoT devices
- **metrics**: Measurable values (temperature, power, etc.)
- **measurements**: Time-series data (Hypertable)
- **dashboards**: User-created dashboards
- **dashboard_widgets**: Individual widgets

### TimescaleDB Features

- **Hypertable**: `measurements` table for efficient time-series storage
- **Continuous Aggregates**:
  - `measurements_hourly`: 1-hour averages
  - `measurements_daily`: 1-day averages
- **Automatic Refresh**: Aggregates update hourly/daily

## 🔌 API Endpoints

### Devices
- `GET /api/devices` - List all devices
- `GET /api/devices/{id}/metrics` - Get metrics for a device

### Measurements
- `POST /api/measurements/query` - Query time-series data
  ```json
  {
    "metricIds": ["uuid-1", "uuid-2"],
    "startTime": "2024-01-01T00:00:00Z",
    "endTime": "2024-01-02T00:00:00Z",
    "aggregation": "15 minutes"
  }
  ```

### Data Sources
- `GET /api/data-sources` - List all sources
- `POST /api/data-sources` - Create new source

### Sync
- `POST /api/sync/metadata` - Sync devices and metrics

## 🎨 Customization

### Add New Data Source Adapter

1. Create adapter in `lib/services/your-adapter.ts`
2. Implement the interface:
   - `getDevices()`
   - `getMetrics()`
   - `getMeasurements()`
3. Update `data-sync.ts` to support the new type

### Custom Chart Types

ECharts supports many chart types. Extend `ChartType` in stores:

```typescript
export type ChartType = 'line' | 'bar' | 'area' | 'scatter' | 'heatmap' | 'gauge';
```

## 📊 Performance Optimization

### Query Optimization

- Use aggregation for large time ranges
- TimescaleDB continuous aggregates handle pre-computation
- Indexes on `time`, `metric_id`, and `device_id`

### Best Practices

- Enable auto-aggregation for ranges > 24 hours
- Use 15-minute intervals for week views
- Use hourly/daily for month/year views
- Limit raw data queries to < 10,000 points

## 🚀 Production Deployment

### Environment Variables

```env
DATABASE_URL="postgresql://user:pass@host:5432/iot_dashboard?sslmode=require"
NODE_ENV="production"
```

### Build

```bash
npm run build
npm start
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔒 Security Considerations

- Store API tokens securely (use environment variables)
- Enable PostgreSQL SSL in production
- Implement user authentication (NextAuth.js recommended)
- Use row-level security in PostgreSQL for multi-tenancy

## 📝 License

MIT License - feel free to use this project for commercial or personal use.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📧 Support

For issues and questions:
- Create an issue on GitHub
- Check existing issues for solutions
- Review the TimescaleDB documentation

## 🎯 Roadmap

- [ ] User authentication and multi-tenancy
- [ ] Alert system for threshold violations
- [ ] Export data to CSV/Excel
- [ ] Mobile-responsive improvements
- [ ] WebSocket support for real-time streaming
- [ ] Machine learning anomaly detection
- [ ] Custom formula/calculated metrics
- [ ] Dashboard sharing and embedding

---

Built with ❤️ using Next.js and TimescaleDB
