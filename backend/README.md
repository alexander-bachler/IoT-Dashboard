# IoT Analytics Platform - Backend API

FastAPI-based RESTful API server for the IoT Analytics Platform.

## Features

- **FastAPI** - Modern, fast web framework
- **SQLAlchemy 2.0** - Async ORM with TimescaleDB support
- **JWT Authentication** - Secure token-based authentication
- **PostgreSQL + TimescaleDB** - Time-series optimized database
- **Redis** - Caching and real-time messaging
- **WebSocket** - Real-time data streaming
- **OpenAPI/Swagger** - Auto-generated API documentation

## Tech Stack

- Python 3.11+
- FastAPI 0.109+
- SQLAlchemy 2.0 (async)
- PostgreSQL 14+ with TimescaleDB extension
- Redis 7+
- Pydantic 2.0+ for validation

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── api.py           # Main API router
│   │       └── endpoints/        # API endpoints
│   ├── core/
│   │   ├── config.py            # Configuration
│   │   └── security.py          # Auth & security
│   ├── db/
│   │   └── database.py          # Database session
│   ├── models/                  # SQLAlchemy models
│   ├── schemas/                 # Pydantic schemas
│   ├── services/                # Business logic
│   └── main.py                  # Application entry point
├── tests/                       # Test suite
├── requirements.txt             # Python dependencies
├── Dockerfile                   # Docker configuration
└── .env.example                 # Environment variables template
```

## Quick Start

### 1. Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
```

### 2. Install Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Run with Docker Compose

```bash
# From project root
docker-compose up -d

# Check logs
docker-compose logs -f backend
```

The API will be available at:
- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

### 4. Run Locally (Development)

```bash
# Start database and redis
docker-compose up timescaledb redis -d

# Run FastAPI with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get tokens
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/refresh` - Refresh access token

### Dashboards
- `GET /api/v1/dashboards` - List dashboards
- `POST /api/v1/dashboards` - Create dashboard
- `GET /api/v1/dashboards/{id}` - Get dashboard
- `PUT /api/v1/dashboards/{id}` - Update dashboard
- `DELETE /api/v1/dashboards/{id}` - Delete dashboard

### Devices
- `GET /api/v1/devices` - List devices
- `POST /api/v1/devices` - Create device
- (More endpoints coming soon...)

### Metrics
- `GET /api/v1/metrics` - List metrics
- (More endpoints coming soon...)

### Measurements
- `GET /api/v1/measurements` - Query time-series data
- (More endpoints coming soon...)

### Anomalies
- `GET /api/v1/anomalies` - List anomalies
- (More endpoints coming soon...)

## Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://...` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `SECRET_KEY` | JWT secret key | Change in production! |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration | `30` |

## Development

### Code Style

```bash
# Format code
black app/

# Lint
flake8 app/

# Type checking
mypy app/
```

### Adding New Endpoints

1. Create model in `app/models/`
2. Create schemas in `app/schemas/`
3. Create endpoint in `app/api/v1/endpoints/`
4. Register router in `app/api/v1/api.py`

## Deployment

### Production Checklist

- [ ] Change `SECRET_KEY` to a secure random value
- [ ] Set up proper database credentials
- [ ] Configure CORS origins
- [ ] Enable HTTPS
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure logging
- [ ] Set up database backups
- [ ] Configure rate limiting

## License

MIT
