#!/bin/bash

# Hyperliquid Notify Startup Script
# This script starts both the backend and frontend services

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Hyperliquid Notify Services${NC}"
echo "=================================================="

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    if check_port $port; then
        echo -e "${YELLOW}⚠️  Port $port is in use. Killing existing process...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: Please run this script from the hyperliquid-notify root directory${NC}"
    exit 1
fi

# Clean up existing processes
echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
kill_port 5001  # Backend port
kill_port 3002  # Frontend port

# Kill any existing hyperliquid processes
pkill -f "hyperliquid-notify" 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true

sleep 2

# Check if dependencies are installed
echo -e "${BLUE}📦 Checking dependencies...${NC}"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing root dependencies...${NC}"
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

# Start services
echo -e "${BLUE}🔧 Starting services...${NC}"

# Start backend in background
echo -e "${GREEN}Starting Backend (Port 5001)...${NC}"
cd backend && npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to initialize
echo -e "${YELLOW}⏳ Waiting for backend to initialize...${NC}"
sleep 5

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Backend failed to start. Check backend.log for errors.${NC}"
    exit 1
fi

# Test backend health
echo -e "${BLUE}🔍 Testing backend health...${NC}"
for i in {1..10}; do
    if curl -f http://localhost:5001/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is healthy!${NC}"
        break
    else
        if [ $i -eq 10 ]; then
            echo -e "${RED}❌ Backend health check failed after 10 attempts${NC}"
            kill $BACKEND_PID 2>/dev/null || true
            exit 1
        fi
        echo -e "${YELLOW}⏳ Waiting for backend (attempt $i/10)...${NC}"
        sleep 2
    fi
done

# Start frontend in background
echo -e "${GREEN}Starting Frontend (Port 3002)...${NC}"
cd frontend && PORT=3002 npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to compile
echo -e "${YELLOW}⏳ Waiting for frontend to compile...${NC}"
sleep 10

# Check if frontend is running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Frontend failed to start. Check frontend.log for errors.${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Test frontend
echo -e "${BLUE}🔍 Testing frontend...${NC}"
for i in {1..10}; do
    if curl -f http://localhost:3002 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is serving!${NC}"
        break
    else
        if [ $i -eq 10 ]; then
            echo -e "${RED}❌ Frontend failed to respond after 10 attempts${NC}"
            kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
            exit 1
        fi
        echo -e "${YELLOW}⏳ Waiting for frontend (attempt $i/10)...${NC}"
        sleep 3
    fi
done

# Success message
echo ""
echo -e "${GREEN}🎉 SUCCESS! Both services are running!${NC}"
echo "=================================================="
echo -e "${BLUE}📱 Frontend:${NC} http://localhost:3002"
echo -e "${BLUE}🔧 Backend:${NC}  http://localhost:5001"
echo -e "${BLUE}❤️  Health:${NC}   http://localhost:5001/health"
echo -e "${BLUE}📊 Market:${NC}   http://localhost:5001/api/market/assets"
echo ""
echo -e "${YELLOW}📋 Process IDs:${NC}"
echo -e "   Backend PID: $BACKEND_PID"
echo -e "   Frontend PID: $FRONTEND_PID"
echo ""
echo -e "${YELLOW}📝 Logs:${NC}"
echo -e "   Backend:  tail -f backend.log"
echo -e "   Frontend: tail -f frontend.log"
echo ""
echo -e "${YELLOW}🛑 To stop services:${NC}"
echo -e "   kill $BACKEND_PID $FRONTEND_PID"
echo -e "   or use: ./stop.sh"
echo ""
echo -e "${GREEN}✨ Happy trading with Hyperliquid Notify!${NC}"

# Save PIDs for stop script
echo "$BACKEND_PID" > .backend_pid
echo "$FRONTEND_PID" > .frontend_pid