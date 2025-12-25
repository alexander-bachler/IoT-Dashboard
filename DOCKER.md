# Docker Setup Guide

This document explains how to run the IoT Time-Series Analytics Platform using Docker.

## Quick Start

### Development Mode

```bash
# Start all services (database + pgAdmin)
npm run docker:dev

# The application will be available at:
# - Database: localhost:5432
# - pgAdmin: http://localhost:5050
```

Then run the Next.js app locally:

```bash
# Install dependencies
npm install

# Run migrations
npm run db:push

# Start development server
npm run dev
```

### Production Mode

```bash
# Build and start all services (database + app + pgAdmin)
npm run docker:prod:build

# The application will be available at:
# - App: http://localhost:3000
# - Database: localhost:5432
# - pgAdmin: http://localhost:5050
```

## Docker Compose Files

### `docker-compose.dev.yml` (Development)

Development-focused setup with:
- TimescaleDB database
- pgAdmin for database management
- Hot-reload support
- Debug-friendly configuration

**Services:**
- `timescaledb`: PostgreSQL with TimescaleDB extension
- `pgadmin`: Web-based database management tool

### `docker-compose.yml` (Production)

Production-ready setup with:
- Optimized Next.js build
- TimescaleDB database
- pgAdmin (optional)
- Health checks
- Auto-restart policies

**Services:**
- `app`: Next.js application
- `timescaledb`: PostgreSQL with TimescaleDB extension
- `pgadmin`: Web-based database management tool (optional)

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DB_PASSWORD=your_secure_password

# pgAdmin (optional)
PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=admin_password

# Application
DATABASE_URL=postgresql://postgres:your_secure_password@localhost:5432/iot_dashboard
```

## Accessing Services

### Application
- URL: `http://localhost:3000`
- Default credentials: None (add authentication as needed)

### Database
- Host: `localhost`
- Port: `5432`
- Database: `iot_dashboard`
- User: `postgres`
- Password: As set in `.env`

### pgAdmin
- URL: `http://localhost:5050`
- Email: As set in `.env` (default: `admin@example.com`)
- Password: As set in `.env` (default: `admin`)

#### Connecting to Database in pgAdmin

1. Open pgAdmin at `http://localhost:5050`
2. Add New Server:
   - Name: `IoT Dashboard`
   - Host: `timescaledb` (use service name when running in Docker)
   - Port: `5432`
   - Username: `postgres`
   - Password: Your database password

## Docker Commands

### Start Services

```bash
# Development mode
docker-compose -f docker-compose.dev.yml up

# Production mode
docker-compose up

# Build and start
docker-compose up --build

# Detached mode (background)
docker-compose up -d
```

### Stop Services

```bash
# Development
docker-compose -f docker-compose.dev.yml down

# Production
docker-compose down

# Remove volumes (deletes data)
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f timescaledb
docker-compose logs -f app
```

### Execute Commands in Containers

```bash
# PostgreSQL shell
docker exec -it iot-dashboard-db psql -U postgres -d iot_dashboard

# Application shell
docker exec -it iot-dashboard-app sh
```

## Database Management

### Manual Migration

If you need to run migrations manually:

```bash
# Access database container
docker exec -it iot-dashboard-db psql -U postgres -d iot_dashboard

# Run SQL file
docker exec -i iot-dashboard-db psql -U postgres -d iot_dashboard < db/migrations/0000_setup_timescaledb.sql
```

### Backup Database

```bash
# Create backup
docker exec iot-dashboard-db pg_dump -U postgres iot_dashboard > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker exec -i iot-dashboard-db psql -U postgres -d iot_dashboard < backup_20240101_120000.sql
```

### Reset Database

```bash
# Stop services
docker-compose down

# Remove volumes
docker volume rm iot-dashboard_timescaledb_data

# Start fresh
docker-compose up
```

## Production Deployment

### Build Production Image

```bash
# Build the Docker image
docker build -t iot-dashboard:latest .

# Tag for registry
docker tag iot-dashboard:latest your-registry/iot-dashboard:latest

# Push to registry
docker push your-registry/iot-dashboard:latest
```

### Deploy with Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml iot-dashboard

# Check services
docker service ls

# Scale application
docker service scale iot-dashboard_app=3
```

### Deploy with Kubernetes

Convert docker-compose to Kubernetes manifests:

```bash
# Install kompose
curl -L https://github.com/kubernetes/kompose/releases/download/v1.31.0/kompose-linux-amd64 -o kompose
chmod +x kompose

# Convert
./kompose convert -f docker-compose.yml

# Deploy
kubectl apply -f .
```

## Troubleshooting

### Database Connection Issues

**Problem**: Cannot connect to database

**Solution**:
```bash
# Check if database is running
docker ps | grep timescaledb

# Check logs
docker-compose logs timescaledb

# Verify connection
docker exec -it iot-dashboard-db psql -U postgres -d iot_dashboard -c "SELECT version();"
```

### TimescaleDB Extension Not Loaded

**Problem**: TimescaleDB functions not available

**Solution**:
```bash
# Connect to database
docker exec -it iot-dashboard-db psql -U postgres -d iot_dashboard

# Enable extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

# Verify
\dx
```

### Port Already in Use

**Problem**: Port 5432 or 3000 already in use

**Solution**:
```bash
# Find process using port
lsof -i :5432
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "5433:5432"  # Use different host port
```

### Application Cannot Connect to Database

**Problem**: `ECONNREFUSED` error

**Solution**:
1. Ensure database is healthy: `docker-compose ps`
2. Wait for database initialization (may take 30s on first run)
3. Check DATABASE_URL is correct
4. If using host network, use `localhost` instead of service name

### Out of Memory

**Problem**: Container crashes due to memory

**Solution**:

Add memory limits to `docker-compose.yml`:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

## Performance Optimization

### Database Tuning

Edit postgresql.conf in container:

```bash
docker exec -it iot-dashboard-db bash

# Edit config
vi /var/lib/postgresql/data/postgresql.conf

# Key settings:
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB
```

### Application Tuning

Set Next.js environment variables:

```env
# In .env
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_MAX_METRICS=20
```

## Monitoring

### Health Checks

```bash
# Check all services health
docker-compose ps

# Check specific service
curl http://localhost:3000/api/health
```

### Resource Usage

```bash
# Monitor resource usage
docker stats

# Container-specific
docker stats iot-dashboard-app
```

## Security Best Practices

1. **Change default passwords** in `.env`
2. **Use secrets management** for production
3. **Enable SSL** for database connections
4. **Limit exposed ports** to only necessary ones
5. **Regular updates** of base images
6. **Use non-root users** in containers (already implemented)

## Additional Resources

- [TimescaleDB Docker Docs](https://docs.timescale.com/install/latest/installation-docker/)
- [Next.js Docker Docs](https://nextjs.org/docs/deployment#docker-image)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)

---

For issues or questions, please open a GitHub issue.
