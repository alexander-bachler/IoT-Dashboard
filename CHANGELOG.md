# Changelog

All notable changes to the IoT Time-Series Analytics Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-12-25

### Added

#### Core Features
- **Navigation Header**: Global navigation with active state indicators
- **Error Boundary**: Comprehensive error handling with user-friendly error pages
- **Data Export**: Export time-series data to CSV and JSON formats
- **Statistics Export**: Export aggregated statistics summary
- **Alert System**: Complete threshold-based alert system with:
  - Alert rules with configurable conditions
  - Alert events tracking
  - Multiple severity levels (info, warning, critical)
  - Alert history and acknowledgment

#### UI Components
- **Checkbox**: Radix UI checkbox component
- **Textarea**: Text area input component
- **Popover**: Popover component for dropdowns
- **Skeleton**: Loading skeleton components
- **Alert**: Alert notification component
- **Calendar**: Custom calendar picker
- **DatePicker**: Date selection component
- **DateTimePicker**: Combined date and time picker
- **DropdownMenu**: Advanced dropdown menu component
- **Loading Skeletons**: Pre-built skeleton loaders for:
  - Charts
  - Stat cards
  - Tables
  - Forms
  - Full dashboards

#### Utilities
- **Validation**: Environment variable and data validation utilities
- **Export**: Data export utilities with CSV/JSON support
- **Statistics**: Automatic statistics calculation

#### Docker Support
- **docker-compose.yml**: Production-ready Docker Compose configuration
- **docker-compose.dev.yml**: Development Docker Compose setup
- **Dockerfile**: Multi-stage build for optimized production images
- **.dockerignore**: Docker ignore patterns
- **DOCKER.md**: Comprehensive Docker setup and troubleshooting guide

#### Documentation
- **DOCKER.md**: Complete Docker setup guide
- **CHANGELOG.md**: Project changelog
- Enhanced README with more examples

### Changed
- **Explorer Page**: Added export button to visualization header
- **package.json**: Added Docker npm scripts
- **Layout**: Integrated navigation header globally

### Enhanced
- **Error Handling**: Improved error messages and user feedback
- **Type Safety**: Added comprehensive TypeScript types
- **Code Organization**: Better file structure and modularity

## [1.0.0] - 2024-12-25

### Added

#### Core Infrastructure
- **Next.js 15**: App Router with TypeScript
- **Shadcn/UI**: Component library with dark mode
- **TimescaleDB**: PostgreSQL with time-series extensions
- **Drizzle ORM**: Type-safe database access
- **Zustand**: State management
- **Apache ECharts**: Professional charting library

#### Database Schema
- `data_sources`: External API connections
- `devices`: IoT devices
- `metrics`: Measurable values
- `measurements`: Time-series data (Hypertable)
- `dashboards`: User dashboards
- `dashboard_widgets`: Dashboard widgets
- TimescaleDB continuous aggregates (hourly, daily)
- Optimized indexes for time-series queries

#### Data Sources
- **LineMetrics Adapter**: Full API integration
- **Data Sync Service**: Metadata and measurement synchronization
- **Batch Import**: Efficient bulk data import
- Connection testing

#### Data Explorer
- Device and metric selection
- Time range picker (Last Hour, 24h, 7d, 30d)
- Multiple chart types (Line, Bar, Area, Scatter)
- Auto-aggregation with configurable intervals
- Real-time statistics (Latest, Average, Min/Max)
- Automatic data refresh

#### Dashboard Builder
- Drag-and-drop grid layout (react-grid-layout)
- Configurable widgets
- Edit/View mode toggle
- Auto-refresh capability
- Persistent state
- Widget configuration modal

#### API Routes
- `GET /api/devices`: List all devices
- `GET /api/devices/{id}/metrics`: Get device metrics
- `POST /api/measurements/query`: Query time-series data
- `GET /POST /api/data-sources`: Manage data sources
- `POST /api/sync/metadata`: Sync external metadata

#### UI Components
- Button, Card, Dialog, Input, Label, Select, Tabs
- TimeSeriesChart (ECharts wrapper)
- ExplorerControls (Sidebar)
- DashboardGrid, DashboardWidget, AddWidgetDialog

#### Documentation
- **README.md**: Comprehensive setup guide
- **IMPLEMENTATION.md**: Technical details and architecture
- **.env.example**: Environment configuration template
- **Migration Scripts**: TimescaleDB setup

### Features

- Dark mode by default
- Responsive design (Desktop & Tablet)
- Type-safe throughout
- Production-ready architecture
- Modular service adapters
- Continuous aggregates for performance
- Professional charting with zoom and tooltips

---

## Roadmap

### v1.2.0 (Planned)
- [ ] User authentication (NextAuth.js)
- [ ] Multi-tenancy support
- [ ] Email notifications for alerts
- [ ] Webhook integrations
- [ ] Advanced filtering and search
- [ ] Saved views and bookmarks
- [ ] Mobile responsive improvements

### v1.3.0 (Planned)
- [ ] Real-time WebSocket support
- [ ] Machine learning anomaly detection
- [ ] Custom calculated metrics
- [ ] Advanced dashboard templates
- [ ] Public dashboard sharing
- [ ] Embeddable widgets
- [ ] Dark/Light mode toggle

### v2.0.0 (Future)
- [ ] Multi-language support (i18n)
- [ ] Advanced RBAC
- [ ] Audit logs
- [ ] API rate limiting
- [ ] GraphQL API
- [ ] Mobile apps (React Native)
- [ ] Advanced ML forecasting

---

For detailed technical implementation, see [IMPLEMENTATION.md](./IMPLEMENTATION.md).
