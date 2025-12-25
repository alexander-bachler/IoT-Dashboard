# IoT Analytics Platform v3.0.0 - Setup Guide

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+ (for backend)
- **PostgreSQL** 14+ with TimescaleDB extension
- **Redis** 7+ (for caching and real-time features)
- **Docker** and Docker Compose (optional, recommended)

---

## 📦 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd IoT-Dashboard
```

### 2. Frontend Setup

#### Install Dependencies

```bash
npm install
```

#### Configure Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Backend API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws

# NextAuth Configuration
# Generate a secret with: openssl rand -base64 32
NEXTAUTH_SECRET=your-super-secret-key-change-this-in-production-min-32-chars
NEXTAUTH_URL=http://localhost:3000

# Database (if using local Drizzle ORM)
DATABASE_URL="postgresql://user:password@localhost:5432/iot_dashboard?sslmode=disable"
```

#### Generate NextAuth Secret

```bash
openssl rand -base64 32
```

Copy the output and paste it into `NEXTAUTH_SECRET` in your `.env.local` file.

### 3. Backend Setup

#### Navigate to Backend Directory

```bash
cd backend
```

#### Create Python Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

#### Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### Configure Backend Environment

```bash
cp .env.example .env
```

Edit `backend/.env`:

```env
# Application Settings
PROJECT_NAME="IoT Analytics Platform"
VERSION="3.0.0"
ENVIRONMENT=development

# Security
SECRET_KEY=your-secret-key-for-jwt-tokens-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/iot_dashboard

# Redis
REDIS_URL=redis://localhost:6379/0

# CORS (Frontend URL)
CORS_ORIGINS=["http://localhost:3000"]

# API Settings
API_V1_PREFIX=/api/v1
```

#### Generate Backend Secret Key

```bash
openssl rand -hex 32
```

### 4. Database Setup

#### Option A: Using Docker Compose (Recommended)

```bash
# From project root
docker-compose -f docker-compose.dev.yml up -d postgres redis
```

This starts:
- PostgreSQL 15 with TimescaleDB on port 5432
- Redis 7 on port 6379

#### Option B: Manual Setup

1. **Install PostgreSQL with TimescaleDB**

```bash
# Ubuntu/Debian
sudo apt-get install postgresql-14 postgresql-14-timescaledb

# macOS with Homebrew
brew install timescaledb
```

2. **Create Database**

```sql
CREATE DATABASE iot_dashboard;
\c iot_dashboard
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

3. **Install and Start Redis**

```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# macOS
brew install redis
brew services start redis
```

#### Run Database Migrations

```bash
# From backend directory
cd backend
python -m alembic upgrade head
```

---

## 🎯 Running the Application

### Development Mode

#### 1. Start Backend Server

```bash
# From backend directory
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at:
- API: http://localhost:8000
- Interactive API Docs: http://localhost:8000/api/docs
- Alternative Docs: http://localhost:8000/api/redoc

#### 2. Start Frontend Development Server

```bash
# From project root
npm run dev
```

Frontend will be available at: http://localhost:3000

### Using Docker Compose

#### Development Environment

```bash
docker-compose -f docker-compose.dev.yml up
```

This starts all services:
- Frontend (Next.js) on port 3000
- Backend (FastAPI) on port 8000
- PostgreSQL on port 5432
- Redis on port 6379

#### Production Environment

```bash
docker-compose up --build
```

---

## 👤 Creating Your First User

### Option 1: Using the Sign-Up Page

1. Navigate to http://localhost:3000/auth/signup
2. Fill in the registration form
3. Click "Create Account"

### Option 2: Using the API Directly

```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "full_name": "Admin User"
  }'
```

### Option 3: Using Database Seed Script

```bash
cd backend
python scripts/seed_users.py
```

This creates a default admin user:
- Username: `admin`
- Password: `admin123`
- Email: `admin@example.com`

**⚠️ Important:** Change the default password immediately in production!

---

## 🔐 Authentication Flow

### How It Works

1. **Registration/Sign-Up**
   - User submits credentials to `/api/v1/auth/register`
   - Backend creates user with hashed password (bcrypt)
   - Returns success message

2. **Login/Sign-In**
   - User submits credentials to NextAuth
   - NextAuth calls backend `/api/v1/auth/login` (OAuth2 password flow)
   - Backend validates credentials and returns JWT tokens
   - NextAuth stores tokens in encrypted session cookie

3. **Authenticated Requests**
   - Frontend automatically includes JWT token in API requests
   - Backend validates token and returns user data
   - WebSocket connections also use token for authentication

4. **Token Refresh**
   - Access tokens expire after 30 minutes (configurable)
   - Refresh tokens are used to get new access tokens
   - Automatic token refresh on API 401 errors

---

## 📊 Features Overview

### v3.0.0 Features

✅ **Authentication System**
- User registration and login
- JWT-based authentication
- Protected routes with middleware
- Session management with NextAuth.js
- Automatic token refresh

✅ **Dashboard Management**
- Save dashboards to backend
- Load saved dashboards
- Create multiple dashboards
- Delete dashboards
- Dashboard templates

✅ **Real-Time Features**
- WebSocket authentication
- Live measurement updates
- Anomaly notifications
- Real-time status monitoring

✅ **Backend API**
- FastAPI server with async support
- RESTful endpoints for all entities
- TimescaleDB for time-series data
- Redis caching
- Comprehensive API documentation

✅ **Frontend Features**
- Next.js 15 with App Router
- React Query for data fetching
- Zustand for state management
- TailwindCSS with custom design system
- Dark mode support
- Responsive design

---

## 🧪 Testing

### Frontend Tests

```bash
# Run unit tests
npm test

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Backend Tests

```bash
cd backend
pytest
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "Failed to fetch font" Error During Build

This is a network issue with Google Fonts. The app works fine in development mode.

**Solution:** Use a local network or build with `--no-fonts` flag if available.

#### 2. "Connection refused" to Backend

**Check:**
- Backend server is running on port 8000
- `NEXT_PUBLIC_API_URL` is correctly set in `.env.local`
- CORS is configured in backend to allow `http://localhost:3000`

**Fix:**
```bash
# Check if backend is running
curl http://localhost:8000/api/v1/auth/me

# If not, start backend
cd backend && uvicorn app.main:app --reload
```

#### 3. "NextAuth secret missing" Error

**Fix:**
```bash
# Generate a new secret
openssl rand -base64 32

# Add to .env.local
NEXTAUTH_SECRET=<your-generated-secret>
```

#### 4. Database Connection Error

**Check:**
- PostgreSQL is running
- Database exists and user has permissions
- `DATABASE_URL` is correct in both frontend and backend `.env` files

**Fix:**
```bash
# Test PostgreSQL connection
psql -U user -d iot_dashboard -h localhost

# If database doesn't exist
createdb iot_dashboard
```

#### 5. WebSocket Connection Failed

**Check:**
- Backend WebSocket endpoint is available
- `NEXT_PUBLIC_WS_URL` is correctly set
- Authentication token is being sent

**Debug:**
```javascript
// In browser console
const ws = new WebSocket('ws://localhost:8000/ws?token=<your-token>');
ws.onopen = () => console.log('Connected');
ws.onerror = (e) => console.error('Error:', e);
```

---

## 📁 Project Structure

```
IoT-Dashboard/
├── app/                      # Next.js App Router pages
│   ├── auth/                # Authentication pages
│   │   ├── signin/         # Sign-in page
│   │   └── signup/         # Sign-up page
│   ├── dashboards/         # Dashboard builder
│   ├── explorer/           # Data explorer
│   └── ...
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Core configuration
│   │   ├── db/             # Database setup
│   │   ├── models/         # SQLAlchemy models
│   │   └── schemas/        # Pydantic schemas
│   ├── tests/              # Backend tests
│   └── requirements.txt    # Python dependencies
├── components/              # React components
│   ├── dashboard/          # Dashboard components
│   ├── layout/             # Layout components
│   ├── providers/          # Context providers
│   └── ui/                 # UI components
├── lib/                     # Utilities and hooks
│   ├── api/                # API client
│   ├── hooks/              # React hooks
│   ├── stores/             # Zustand stores
│   └── websocket/          # WebSocket client
├── .env.local              # Environment variables (create from example)
├── auth.ts                 # NextAuth configuration
├── middleware.ts           # Next.js middleware
└── package.json            # NPM dependencies
```

---

## 🚢 Deployment

### Production Checklist

- [ ] Change all default passwords
- [ ] Generate strong `NEXTAUTH_SECRET` and backend `SECRET_KEY`
- [ ] Set `ENVIRONMENT=production` in backend `.env`
- [ ] Configure production database URL
- [ ] Set up SSL/TLS certificates
- [ ] Configure CORS for production domain
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy for database

### Docker Production Deployment

```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Environment-Specific Configuration

**Production `.env.local`:**
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com/ws
NEXTAUTH_SECRET=<strong-production-secret>
NEXTAUTH_URL=https://yourdomain.com
```

---

## 📝 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [React Query Documentation](https://tanstack.com/query)

---

## 🆘 Support

For issues and questions:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Review the backend API docs at http://localhost:8000/api/docs
3. Check browser console for frontend errors
4. Check backend logs for API errors

---

## 📄 License

[Your License Here]
