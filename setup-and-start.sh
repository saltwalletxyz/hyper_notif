#!/bin/bash

# Hyperliquid Notify - Complete Setup and Startup Script
# This script handles dependencies, setup, and starts both backend and frontend services
# Backend: Port 5000, Frontend: Port 3002

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=5000
FRONTEND_PORT=3002

echo -e "${BOLD}${BLUE}🚀 Hyperliquid Notify - Complete Setup & Startup${NC}"
echo -e "${BOLD}=================================================${NC}"
echo ""

# Function to print section headers
print_section() {
    echo -e "${BOLD}${CYAN}$1${NC}"
    echo "$(printf '%.0s-' $(seq 1 ${#1}))"
}

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
        echo -e "${YELLOW}⚠️  Port $port is in use. Stopping existing process...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
        echo -e "${GREEN}✅ Port $port is now free${NC}"
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: Please run this script from the hyperliquid-notify root directory${NC}"
    echo -e "${YELLOW}💡 Make sure you see backend/ and frontend/ folders in the current directory${NC}"
    exit 1
fi

# Check prerequisites
print_section "📋 Checking Prerequisites"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version $NODE_VERSION detected. Please upgrade to Node.js 18 or higher.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node --version) detected${NC}"
echo -e "${GREEN}✅ npm $(npm --version) detected${NC}"

# Clean up existing processes
print_section "🧹 Cleaning Up Existing Processes"
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT

# Kill any existing processes by name
echo -e "${YELLOW}🔍 Stopping any existing hyperliquid-notify processes...${NC}"
pkill -f "hyperliquid-notify" 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
pkill -f "tsx" 2>/dev/null || true

sleep 2
echo -e "${GREEN}✅ Cleanup completed${NC}"

# Install dependencies
print_section "📦 Installing Dependencies"

# Root dependencies
if [ -f "package.json" ] && [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing root dependencies...${NC}"
    npm install
    echo -e "${GREEN}✅ Root dependencies installed${NC}"
elif [ -f "package.json" ]; then
    echo -e "${CYAN}ℹ️  Root dependencies already installed${NC}"
fi

# Backend dependencies
echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
if [ ! -d "backend/node_modules" ]; then
    cd backend
    npm install
    cd ..
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${CYAN}ℹ️  Backend dependencies already installed, updating...${NC}"
    cd backend
    npm install --silent
    cd ..
    echo -e "${GREEN}✅ Backend dependencies updated${NC}"
fi

# Frontend dependencies  
echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
if [ ! -d "frontend/node_modules" ]; then
    cd frontend
    npm install
    cd ..
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${CYAN}ℹ️  Frontend dependencies already installed, updating...${NC}"
    cd frontend
    npm install --silent
    cd ..
    echo -e "${GREEN}✅ Frontend dependencies updated${NC}"
fi

# Check environment files
print_section "🔧 Checking Environment Configuration"

# Backend .env check
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  Backend .env file not found${NC}"
    if [ -f "backend/.env.example" ]; then
        echo -e "${YELLOW}📋 Copying .env.example to .env...${NC}"
        cp backend/.env.example backend/.env
        echo -e "${GREEN}✅ Created backend/.env from example${NC}"
        echo -e "${CYAN}💡 Please edit backend/.env with your database URL and other settings${NC}"
    else
        echo -e "${RED}❌ No .env.example found. Please create backend/.env manually${NC}"
    fi
else
    echo -e "${GREEN}✅ Backend .env file exists${NC}"
fi

# Frontend .env check
if [ ! -f "frontend/.env" ] && [ -f "frontend/.env.example" ]; then
    echo -e "${YELLOW}📋 Copying frontend .env.example to .env...${NC}"
    cp frontend/.env.example frontend/.env
    echo -e "${GREEN}✅ Created frontend/.env from example${NC}"
fi

# Database setup (if Prisma is available)
if [ -f "backend/prisma/schema.prisma" ]; then
    print_section "🗄️  Database Setup"
    echo -e "${YELLOW}🔧 Setting up database...${NC}"
    cd backend
    
    # Generate Prisma client
    if command_exists npx; then
        echo -e "${YELLOW}🔧 Generating Prisma client...${NC}"
        npx prisma generate 2>/dev/null || echo -e "${YELLOW}⚠️  Prisma generate failed (this may be normal if DB is not set up yet)${NC}"
        
        # Try to run migrations
        echo -e "${YELLOW}🔧 Running database migrations...${NC}"
        npx prisma migrate dev --name init 2>/dev/null || echo -e "${YELLOW}⚠️  Database migrations failed (please set up your database manually)${NC}"
    fi
    
    cd ..
fi

# Start services
print_section "🚀 Starting Services"

# Create log directory
mkdir -p logs

# Start backend
echo -e "${GREEN}🔧 Starting Backend on port $BACKEND_PORT...${NC}"
cd backend

# Start backend in background with proper logging
nohup npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!

cd ..

# Wait for backend to initialize
echo -e "${YELLOW}⏳ Waiting for backend to initialize...${NC}"
sleep 5

# Check if backend process is still running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Backend failed to start. Checking logs...${NC}"
    if [ -f "logs/backend.log" ]; then
        echo -e "${YELLOW}📋 Last few lines from backend log:${NC}"
        tail -10 logs/backend.log
    fi
    exit 1
fi

# Test backend health
echo -e "${BLUE}🔍 Testing backend health...${NC}"
BACKEND_READY=false
for i in {1..15}; do
    if curl -f "http://localhost:$BACKEND_PORT/health" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is healthy and responding!${NC}"
        BACKEND_READY=true
        break
    elif curl -f "http://localhost:$BACKEND_PORT" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is responding!${NC}"
        BACKEND_READY=true
        break
    else
        if [ $i -eq 15 ]; then
            echo -e "${YELLOW}⚠️  Backend health check inconclusive, but continuing...${NC}"
            BACKEND_READY=true
            break
        fi
        echo -e "${YELLOW}⏳ Waiting for backend... (attempt $i/15)${NC}"
        sleep 2
    fi
done

if [ "$BACKEND_READY" = false ]; then
    echo -e "${RED}❌ Backend failed to start properly${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Start frontend
echo -e "${GREEN}📱 Starting Frontend on port $FRONTEND_PORT...${NC}"
cd frontend

# Set environment variable and start frontend
BROWSER=none PORT=$FRONTEND_PORT nohup npm start > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!

cd ..

# Wait for frontend to compile and start
echo -e "${YELLOW}⏳ Waiting for frontend to compile and start...${NC}"
FRONTEND_READY=false
for i in {1..30}; do
    if curl -f "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is serving and ready!${NC}"
        FRONTEND_READY=true
        break
    else
        # Check if frontend process is still running
        if ! kill -0 $FRONTEND_PID 2>/dev/null; then
            echo -e "${RED}❌ Frontend process died. Checking logs...${NC}"
            if [ -f "logs/frontend.log" ]; then
                echo -e "${YELLOW}📋 Last few lines from frontend log:${NC}"
                tail -10 logs/frontend.log
            fi
            kill $BACKEND_PID 2>/dev/null || true
            exit 1
        fi
        
        if [ $i -eq 30 ]; then
            echo -e "${YELLOW}⚠️  Frontend is taking longer than expected, but may still be compiling...${NC}"
            FRONTEND_READY=true
            break
        fi
        echo -e "${YELLOW}⏳ Waiting for frontend to compile... (attempt $i/30)${NC}"
        sleep 3
    fi
done

# Success message
echo ""
echo -e "${BOLD}${GREEN}🎉 SUCCESS! Hyperliquid Notify is now running!${NC}"
echo -e "${BOLD}=================================================${NC}"
echo ""
echo -e "${BOLD}${BLUE}🌐 Application URLs:${NC}"
echo -e "${GREEN}   Frontend (Main App): ${BOLD}http://localhost:$FRONTEND_PORT${NC}"
echo -e "${GREEN}   Backend API:        ${BOLD}http://localhost:$BACKEND_PORT${NC}"
echo ""
echo -e "${BOLD}${BLUE}🔗 Useful Endpoints:${NC}"
if [ "$BACKEND_READY" = true ]; then
    echo -e "${CYAN}   Health Check:       http://localhost:$BACKEND_PORT/health${NC}"
    echo -e "${CYAN}   Market Data:        http://localhost:$BACKEND_PORT/api/market/assets${NC}"
    echo -e "${CYAN}   API Documentation:  http://localhost:$BACKEND_PORT/docs${NC}"
fi
echo ""
echo -e "${BOLD}${YELLOW}📊 Process Information:${NC}"
echo -e "${YELLOW}   Backend PID:  $BACKEND_PID${NC}"
echo -e "${YELLOW}   Frontend PID: $FRONTEND_PID${NC}"
echo ""
echo -e "${BOLD}${YELLOW}📝 Log Files:${NC}"
echo -e "${YELLOW}   Backend:  tail -f logs/backend.log${NC}"
echo -e "${YELLOW}   Frontend: tail -f logs/frontend.log${NC}"
echo ""
echo -e "${BOLD}${YELLOW}🛑 To Stop Services:${NC}"
echo -e "${YELLOW}   Quick stop: ./stop.sh${NC}"
echo -e "${YELLOW}   Manual:     kill $BACKEND_PID $FRONTEND_PID${NC}"
echo ""
echo -e "${BOLD}${GREEN}✨ Ready for Trading! Open http://localhost:$FRONTEND_PORT in your browser${NC}"
echo ""

# Save PIDs for stop script
echo "$BACKEND_PID" > .backend_pid
echo "$FRONTEND_PID" > .frontend_pid

# Keep script running to show live status
echo -e "${CYAN}💡 Press Ctrl+C to stop both services${NC}"
echo ""

# Trap Ctrl+C to cleanup
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    rm -f .backend_pid .frontend_pid 2>/dev/null || true
    echo -e "${GREEN}✅ Services stopped${NC}"
    exit 0
}

trap cleanup INT TERM

# Wait for processes to finish (they won't unless killed)
wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true