# IoT Time-Series Analytics Platform

A professional, enterprise-grade IoT data visualization and analytics platform built with Next.js, TimescaleDB, and Apache ECharts. Similar to Power BI but specifically designed for time-series data from IoT devices.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)

## ✨ Key Features

### 📊 Advanced Visualization
- **14 Chart Types**: Line, Area, Bar, Scatter, Heatmap, Gauge, Radar, Pie, Funnel, Treemap, Boxplot, Sankey, Sunburst, Candlestick
- **Interactive Charts**: Zoom, pan, download as PNG
- **Chart Gallery**: Browse and explore all available chart types
- **Annotations**: Mark important events and incidents on charts
- **Compare Mode**: Compare current data with previous periods

### 🔍 Data Analysis
- **Data Explorer**: Ad-hoc analysis with real-time interactive charts
- **Custom Calculations**: Build formulas with SUM, AVG, MIN, MAX, and operators
- **Anomaly Detection**: Statistical Z-score based anomaly detection
- **Data Quality Monitoring**: Track completeness, missing data, and duplicates
- **Time Range Picker**: Flexible absolute and relative time selection

### 📈 Dashboard Management
- **Drag-and-Drop Builder**: Create custom dashboards with ease
- **5 Pre-built Templates**: Industrial, Energy, Environmental, Smart Building, Basic
- **Auto-Refresh**: Configurable real-time data updates
- **Widget Customization**: Full control over chart types and display options

### 🔐 Enterprise Features
- **Authentication System**: Secure user login and session management
- **User Permissions**: Role-based access control (Admin, Editor, Viewer)
- **Scheduled Reports**: Automated report generation and email delivery
- **Rate Limiting**: API protection with configurable limits
- **Audit Logging**: Track user actions and system events

### 🎨 User Experience
- **Dark/Light/System Theme**: Full theme support with next-themes
- **Responsive Design**: Mobile-friendly interface
- **Modern UI**: Professional design with Shadcn/UI components
- **Performance Optimized**: Intelligent aggregation for large datasets

## 📦 Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, React 19
- **UI Library**: Shadcn/UI (Tailwind CSS + Radix UI)
- **Charts**: Apache ECharts (14 chart types)
- **State Management**: Zustand with localStorage persistence
- **Database**: PostgreSQL 14+ with TimescaleDB extension
- **ORM**: Drizzle ORM (Type-safe queries)
- **Grid Layout**: react-grid-layout (Drag-and-drop dashboards)
- **Theme**: next-themes (Dark/Light/System modes)
- **Testing**: Vitest + React Testing Library
- **Date/Time**: date-fns

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

## ⚡ Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd iot-dashboard

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Start database (using Docker)
npm run docker:dev

# Run migrations
npm run db:push
psql -d iot_dashboard -f db/migrations/0000_setup_timescaledb.sql
psql -d iot_dashboard -f db/migrations/0002_advanced_features.sql

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start exploring!

## 🛠️ Detailed Setup Instructions

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

#### Use Dashboard Templates

1. Click **Templates** in the dashboard view
2. Browse available templates:
   - **Industrial Overview**: Manufacturing and equipment monitoring
   - **Energy Monitoring**: Power consumption and solar production
   - **Environmental Sensors**: Temperature, humidity, air quality
   - **Smart Building**: HVAC, occupancy, lighting
   - **Basic Monitoring**: General-purpose starter template
3. Click **Apply Template** to load pre-configured widgets

### 5. Monitor Anomalies

1. Navigate to **Anomalies**
2. View detected anomalies with severity levels
3. Filter by:
   - Severity (Critical, High, Medium, Low)
   - Status (Acknowledged/Unacknowledged)
4. Acknowledge anomalies to mark them as reviewed
5. Each anomaly shows:
   - Actual value vs. expected value
   - Z-score (statistical deviation)
   - Timestamp and device information

### 6. Add Chart Annotations

1. Navigate to **Explorer** or **Dashboards**
2. Enable **Show Annotations** toggle
3. Annotations appear as:
   - **Vertical lines** for point events
   - **Shaded areas** for time ranges
4. Types of annotations:
   - Deployments
   - Incidents
   - Maintenance windows
   - Custom events

### 7. Create Custom Calculations

1. Navigate to **Calculations**
2. Click **Create Calculation**
3. Enter formula using supported functions:
   - `SUM(metric1, metric2, ...)` - Sum of multiple metrics
   - `AVG(metric1, metric2, ...)` - Average of metrics
   - `MIN(metric1, metric2, ...)` - Minimum value
   - `MAX(metric1, metric2, ...)` - Maximum value
   - Operators: `+`, `-`, `*`, `/`, `()`
4. Example formulas:
   - Total Power: `SUM(solar_power, grid_power)`
   - Energy Efficiency: `(output_power / input_power) * 100`
   - Average Temperature: `AVG(sensor1, sensor2, sensor3)`
5. Save and use in charts and dashboards

### 8. Schedule Reports

1. Navigate to **Reports**
2. Click **New Report**
3. Configure:
   - **Report Name**: Descriptive name
   - **Schedule**: Cron expression or use presets
     - Daily at 8 AM: `0 8 * * *`
     - Weekly Monday 9 AM: `0 9 * * 1`
     - Monthly 1st at 8 AM: `0 8 1 * *`
   - **Format**: PDF, Excel, or JSON
   - **Recipients**: Email addresses
   - **Content**: Dashboard or metrics to include
4. Reports run automatically on schedule
5. View execution history and status

## 🔧 Database Schema

### Core Tables

- **data_sources**: API credentials and connection info
- **devices**: IoT devices
- **metrics**: Measurable values (temperature, power, etc.)
- **measurements**: Time-series data (Hypertable)
- **dashboards**: User-created dashboards
- **dashboard_widgets**: Individual widgets

### Enterprise Tables (v2.0.0)

- **users**: User accounts and profiles
- **sessions**: User authentication sessions
- **user_permissions**: Role-based access control
- **anomalies**: Detected anomalies with severity
- **anomaly_models**: ML model parameters and thresholds
- **chart_annotations**: Event markers and time ranges
- **scheduled_reports**: Automated report configurations
- **report_executions**: Report run history
- **custom_calculations**: User-defined formulas
- **data_quality_logs**: Quality metrics history
- **audit_logs**: System and user action tracking

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
- `POST /api/measurements/query` - Query time-series data (Rate limited: 50/min)
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

### Anomalies
- `GET /api/anomalies` - Get detected anomalies
  - Query params: `metricId`, `severity`, `acknowledged`, `startTime`, `endTime`, `limit`
- `POST /api/anomalies` - Create anomaly record

### Annotations
- `GET /api/annotations` - Get chart annotations
  - Query params: `startTime`, `endTime`, `type`
- `POST /api/annotations` - Create annotation

### Data Quality
- `POST /api/quality` - Calculate data quality metrics
  ```json
  {
    "data": [{ "time": "2024-01-01T00:00:00Z", "value": 100 }],
    "expectedInterval": 60000
  }
  ```

### Rate Limiting
All API endpoints include rate limiting headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: When the limit resets
- Returns `429 Too Many Requests` when exceeded

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

## 🧪 Testing

The platform includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Test Files
- `lib/services/anomaly-detection.test.ts` - Anomaly detection algorithms
- `lib/utils/rate-limiter.test.ts` - Rate limiting logic
- `lib/utils/chart-toolbox.test.ts` - Chart utilities
- `lib/utils/dashboard-templates.test.ts` - Dashboard templates

### Coverage
- **Services**: Anomaly detection, data quality calculations
- **Utilities**: Rate limiting, chart configuration
- **Templates**: Dashboard templates validation
- **Components**: Critical UI components

## 🎯 Roadmap

### ✅ Completed (v2.0.0)
- [x] User authentication system
- [x] Machine learning anomaly detection (Z-score)
- [x] Custom formula/calculated metrics
- [x] Dark/Light theme support
- [x] Advanced chart types (14 total)
- [x] Scheduled reports
- [x] Data quality monitoring
- [x] Chart annotations
- [x] Compare mode

### 🚧 In Progress
- [ ] WebSocket support for real-time streaming
- [ ] Alert system with notifications
- [ ] Export dashboards to PDF

### 📋 Planned
- [ ] Multi-tenancy support
- [ ] Mobile app (React Native)
- [ ] Advanced ML models (LSTM, Prophet)
- [ ] Dashboard sharing and embedding
- [ ] Data export to CSV/Excel
- [ ] API versioning
- [ ] GraphQL API

## 📚 Version History

### v2.0.0 (2025-12-25) - Enterprise Release
Major enterprise features and advanced analytics capabilities:

**New Features:**
- 🎨 Extended visualization library (14 chart types)
- 🌓 Dark/Light/System theme support
- 📊 Chart annotations for events and incidents
- 🔍 Statistical anomaly detection (Z-score)
- 📈 Data quality monitoring and metrics
- 🧮 Custom calculation builder with formulas
- 📧 Scheduled reports with email delivery
- 🔐 User authentication and RBAC
- ⚖️ API rate limiting protection
- 🎯 5 pre-built dashboard templates
- 🔄 Compare mode for period comparison
- 📅 Advanced time range picker

**Technical Improvements:**
- Comprehensive test suite with Vitest
- 11 new database tables for enterprise features
- Rate limiting middleware for all API endpoints
- Enhanced error handling and logging
- Performance optimizations
- Type-safe API contracts

### v1.5.0 - Quick Wins
- Anomaly detection API and UI
- Data quality badge component
- Rate limiting for measurements API
- Annotation API endpoints

### v1.4.0 - Enterprise Foundations
- Complete database schemas for enterprise features
- Anomaly detection service
- Dashboard templates
- Rate limiting utilities

### v1.3.0 - UX Enhancements
- Theme toggle (Dark/Light/System)
- Custom time range picker
- Chart download (PNG export)
- Auto-refresh toggle
- Compare mode

### v1.2.0 - Visualization Expansion
- 10 new chart types
- Chart gallery page
- Chart metadata system
- Unified chart renderer

### v1.1.0 - Platform Optimizations
- Performance improvements
- Enhanced data loading
- UI refinements

### v1.0.0 - Initial Release
- Basic IoT dashboard platform
- TimescaleDB integration
- Data source management
- Explorer and dashboard builder

---

**Built with ❤️ using Next.js and TimescaleDB**

*For questions, issues, or feature requests, please visit our GitHub repository.*
