# Hyperliquid Notification System - Development Guide

A professional notification system built with Node.js backend and React frontend, integrated with Hyperliquid's Node Info API for real-time cryptocurrency market data and alert management.

## 🏗️ Architecture Overview

### Backend (Node.js + TypeScript)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL (Neon Cloud) with Prisma ORM
- **Authentication**: JWT-based auth system
- **Real-time**: Socket.io for WebSocket connections
- **API Integration**: Hyperliquid Node Info API
- **Port**: 5001 (changed from 5000 due to conflicts)

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI v7
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form with validation
- **Real-time**: Socket.io client for live updates
- **Port**: 3002 (changed from 3000)

### Database Schema
```prisma
// Key models in schema.prisma:
- User (id, email, password, name, walletAddress)
- Alert (id, userId, name, type, asset, condition, value, notifications)
- Notification (id, userId, alertId, message, channels, status)
- Portfolio (id, userId, walletAddress, positions)
- Position (id, portfolioId, asset, size, entryPrice, pnl)
```

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- npm or yarn
- PostgreSQL access (using Neon cloud database)

### 1. Start Backend
```bash
cd backend
npm install
npm run dev
# Backend runs on http://localhost:5001
```

### 2. Start Frontend
```bash
cd frontend
npm install
npm start
# Frontend runs on http://localhost:3002
```

### 3. Access Application
- Frontend: http://localhost:3002
- Backend API: http://localhost:5001/api

## 🔧 Configuration Files

### Backend Configuration

**`.env` file:**
```bash
PORT=5001
NODE_ENV=development
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3002
DATABASE_URL=postgresql://neondb_owner:npg_GzUxFbE80VgX@ep-shy-tooth-a1auhxpo-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Hyperliquid API
HYPERLIQUID_API_URL=https://api.hyperliquid.xyz
```

**Key Backend Files:**
- `src/server.ts` - Main server entry point
- `src/services/hyperliquid.service.ts` - Hyperliquid API integration
- `src/routes/` - API route handlers
- `src/controllers/` - Business logic controllers
- `prisma/schema.prisma` - Database schema

### Frontend Configuration

**Key Frontend Files:**
- `src/services/api.ts` - API service layer (ALL METHODS ARE ARROW FUNCTIONS)
- `src/services/websocket.ts` - WebSocket service
- `src/pages/MarketPage.tsx` - Market data display
- `src/pages/AlertsPage.tsx` - Alert management
- `src/pages/DashboardPage.tsx` - Main dashboard

## 🔥 Critical Fixes Applied

### 1. Port Conflicts Resolution
**Problem**: Port 5000 already in use by macOS AirPlay
**Solution**: 
- Backend: Changed PORT from 5000 to 5001 in `.env`
- Frontend: Updated API_BASE_URL to `http://localhost:5001/api`

### 2. CORS Policy Errors
**Problem**: Frontend blocked by CORS policy
**Solution**: Updated backend FRONTEND_URL to `http://localhost:3002` in `.env`

### 3. Material-UI v7 Grid Component Issues
**Problem**: `item` prop deprecated in MUI v7
**Solution**: Removed all `item` props from Grid components in frontend

### 4. API Service Method Binding Issues ⚠️ CRITICAL
**Problem**: `Cannot read properties of undefined (reading 'post')` errors
**Root Cause**: Methods losing `this` context when used as React Query callbacks
**Solution**: Converted ALL API service methods to arrow functions

**Before (broken):**
```typescript
async createAlert(data: CreateAlertRequest): Promise<Alert> {
  const response = await this.client.post<Alert>('/alerts', data);
  return response.data;
}
```

**After (fixed):**
```typescript
createAlert = async (data: CreateAlertRequest): Promise<Alert> => {
  const response = await this.client.post<Alert>('/alerts', data);
  return response.data;
}
```

### 5. Hyperliquid API Response Structure
**Problem**: API returning array format instead of expected object
**Solution**: Updated `hyperliquid.service.ts` to handle array response:
```typescript
// Response is array [universe, contexts]
const universe = response.data[0].universe;
const contexts = response.data[1];
```

## 🛠️ Common Issues & Solutions

### Backend Not Starting
```bash
# Check if port 5001 is available
lsof -i :5001
# Kill process if needed
kill -9 <PID>
# Restart backend
cd backend && npm run dev
```

### Frontend API Errors
1. Verify backend is running on port 5001
2. Check CORS settings in backend `.env`
3. Ensure all API methods in `api.ts` are arrow functions
4. Clear browser cache and localStorage

### Database Connection Issues
1. Verify DATABASE_URL in backend `.env`
2. Test connection: `npx prisma db pull`
3. Reset if needed: `npx prisma migrate reset`

### Market Data Showing $0.00
1. Check Hyperliquid service response handling
2. Verify API endpoint: GET `/api/market/assets`
3. Test backend API directly: `curl http://localhost:5001/api/market/assets`

### Alert Creation Not Working
1. Ensure API service methods are arrow functions
2. Check form validation in AlertsPage.tsx
3. Verify JWT token in localStorage
4. Check browser console for errors

## 📊 API Endpoints

### Authentication
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/auth/profile`

### Alerts
- GET `/api/alerts`
- POST `/api/alerts`
- PUT `/api/alerts/:id`
- DELETE `/api/alerts/:id`

### Market Data
- GET `/api/market/assets`
- GET `/api/market/assets/:coin`
- GET `/api/market/funding-rates`

### Notifications
- GET `/api/notifications`
- POST `/api/notifications/:id/read`

## 🧪 Testing Commands

### Backend Testing
```bash
cd backend
npm test
npm run lint
npm run build
```

### Frontend Testing  
```bash
cd frontend
npm test
npm run lint
npm run build
```

### API Testing (curl)
```bash
# Test auth
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test market data
curl http://localhost:5001/api/market/assets

# Test alert creation
curl -X POST http://localhost:5001/api/alerts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Alert","type":"PRICE_ABOVE","asset":"ETH","value":3000}'
```

## 🔐 Environment Variables

### Backend Required Variables
```bash
PORT=5001
NODE_ENV=development
JWT_SECRET=hyperliquid-notify-secret-2024
DATABASE_URL=postgresql://neondb_owner:npg_GzUxFbE80VgX@ep-shy-tooth-a1auhxpo-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
FRONTEND_URL=http://localhost:3002
HYPERLIQUID_API_URL=https://api.hyperliquid.xyz
```

### Frontend Environment (optional)
```bash
REACT_APP_API_URL=http://localhost:5001/api
REACT_APP_WS_URL=http://localhost:5001
```

## 🚨 Emergency Restart Procedure

If everything breaks after PC restart:

1. **Check both services are running:**
   ```bash
   # Terminal 1: Backend
   cd /Users/nickkz/Desktop/hyperliquid-notify/backend
   npm run dev
   
   # Terminal 2: Frontend  
   cd /Users/nickkz/Desktop/hyperliquid-notify/frontend
   npm start
   ```

2. **Verify ports:**
   - Backend: http://localhost:5001/api/health
   - Frontend: http://localhost:3002

3. **Clear browser data:**
   - Clear localStorage
   - Hard refresh (Cmd+Shift+R)
   - Clear cookies

4. **Database connection:**
   ```bash
   cd backend
   npx prisma generate
   npx prisma db push
   ```

## 📱 Features Implemented

### ✅ Working Features
- User registration and authentication
- JWT-based auth with automatic token refresh
- Real-time market data from Hyperliquid API
- Alert creation, editing, and deletion
- Multi-channel notifications (email, in-app, webhook)
- WebSocket integration for live price updates
- Responsive Material-UI design
- Form validation and error handling

### 🔄 Real-time Updates
- Price updates via WebSocket
- Alert status changes
- Portfolio value changes
- Notification delivery

### 📊 Market Data Features
- Live cryptocurrency prices
- 24-hour price changes
- Volume and open interest data
- Funding rates
- Asset performance charts

## 🔍 Debugging Tips

### Enable Debug Logging
```bash
# Backend
DEBUG=hyperliquid:* npm run dev

# Frontend console
localStorage.setItem('debug', 'api:*')
```

### Common Console Errors
1. `TypeError: Cannot read properties of undefined (reading 'post')` → Check arrow functions in api.ts
2. `Network Error` → Verify backend is running and CORS is configured
3. `401 Unauthorized` → Check JWT token in localStorage

## 🏆 Success Indicators

After restart, verify these work:
1. ✅ Backend starts without errors
2. ✅ Frontend loads without console errors  
3. ✅ Market data displays real prices (not $0.00)
4. ✅ Alert creation works and closes dialog
5. ✅ WebSocket connection established
6. ✅ Database queries successful

## 📁 Project Structure

```
hyperliquid-notify/
├── backend/
│   ├── src/
│   │   ├── controllers/      # API controllers
│   │   ├── routes/           # Express routes
│   │   ├── services/         # Business logic
│   │   ├── middleware/       # Auth middleware
│   │   ├── websocket/        # Socket.io handlers
│   │   └── index.ts          # Server entry
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   ├── .env                  # Environment config
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/            # React pages
│   │   ├── services/         # API & WebSocket services
│   │   ├── components/       # React components
│   │   ├── contexts/         # React contexts
│   │   └── types/            # TypeScript types
│   └── package.json
└── DEVELOPMENT_GUIDE.md      # This file
```

## 🔧 Key Code Files

### Backend Critical Files:
- `src/services/hyperliquid.service.ts:188` - Fixed API response handling
- `src/controllers/alerts.controller.ts` - Alert CRUD operations
- `src/routes/market.routes.ts` - Market data endpoints
- `.env` - PORT=5001, FRONTEND_URL=http://localhost:3002

### Frontend Critical Files:
- `src/services/api.ts` - ALL methods converted to arrow functions
- `src/pages/MarketPage.tsx:32-36` - Market data fetching
- `src/pages/AlertsPage.tsx:116-133` - Alert creation handling

## ⚠️ NEVER FORGET

1. **ALL API service methods MUST be arrow functions** - This prevents `this` binding issues
2. **Backend runs on port 5001** - Not 5000 (AirPlay conflict)
3. **Frontend runs on port 3002** - Not 3000
4. **Database URL is hardcoded** - PostgreSQL Neon cloud connection
5. **Hyperliquid API returns arrays** - Not objects, handle accordingly

---

**Last Updated**: August 24, 2025
**Status**: All major issues resolved, system fully functional
**Next Steps**: Monitor for any new issues, consider adding more alert types