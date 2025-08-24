#!/bin/bash

# Hyperliquid Notify Stop Script
# This script stops both the backend and frontend services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping Hyperliquid Notify Services${NC}"
echo "=================================================="

# Function to check if a process is running
is_running() {
    kill -0 "$1" 2>/dev/null
}

# Stop services using saved PIDs
if [ -f ".backend_pid" ]; then
    BACKEND_PID=$(cat .backend_pid)
    if is_running $BACKEND_PID; then
        echo -e "${YELLOW}🔧 Stopping Backend (PID: $BACKEND_PID)...${NC}"
        kill $BACKEND_PID 2>/dev/null
        sleep 2
        if is_running $BACKEND_PID; then
            echo -e "${RED}Force killing Backend...${NC}"
            kill -9 $BACKEND_PID 2>/dev/null
        fi
        echo -e "${GREEN}✅ Backend stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend was not running${NC}"
    fi
    rm -f .backend_pid
fi

if [ -f ".frontend_pid" ]; then
    FRONTEND_PID=$(cat .frontend_pid)
    if is_running $FRONTEND_PID; then
        echo -e "${YELLOW}📱 Stopping Frontend (PID: $FRONTEND_PID)...${NC}"
        kill $FRONTEND_PID 2>/dev/null
        sleep 2
        if is_running $FRONTEND_PID; then
            echo -e "${RED}Force killing Frontend...${NC}"
            kill -9 $FRONTEND_PID 2>/dev/null
        fi
        echo -e "${GREEN}✅ Frontend stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend was not running${NC}"
    fi
    rm -f .frontend_pid
fi

# Additional cleanup - kill any remaining processes
echo -e "${YELLOW}🧹 Cleaning up remaining processes...${NC}"

# Kill by process name patterns
pkill -f "hyperliquid-notify" 2>/dev/null && echo -e "${GREEN}✅ Killed hyperliquid processes${NC}" || true
pkill -f "react-scripts" 2>/dev/null && echo -e "${GREEN}✅ Killed React processes${NC}" || true
pkill -f "nodemon" 2>/dev/null && echo -e "${GREEN}✅ Killed nodemon processes${NC}" || true

# Kill by port
for port in 5000 3002; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}🔌 Killing process on port $port...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        echo -e "${GREEN}✅ Port $port freed${NC}"
    fi
done

# Clean up log files (optional)
if [ -d "logs" ]; then
    read -p "🗑️  Remove log files? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -f logs/backend.log logs/frontend.log backend.log frontend.log
        echo -e "${GREEN}✅ Log files removed${NC}"
    fi
fi

echo ""
echo -e "${GREEN}🎉 All services stopped successfully!${NC}"
echo -e "${BLUE}To start again, run: ./setup-and-start.sh${NC}"