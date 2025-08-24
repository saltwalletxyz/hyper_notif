#!/bin/bash

# Frontend Startup Script  
# Run this from the frontend directory

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📱 Starting Hyperliquid Notify Frontend${NC}"
echo "=========================================="

# Check if we're in the frontend directory
if [ ! -f "package.json" ] || [ ! -f "src/App.tsx" ]; then
    echo -e "${RED}❌ Error: Please run this from the frontend directory${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Kill existing process on port 3002
if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 3002 is in use. Killing existing process...${NC}"
    lsof -ti:3002 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Start the frontend on port 3002
echo -e "${GREEN}🚀 Starting frontend server on port 3002...${NC}"
echo -e "${YELLOW}💡 Press Ctrl+C to stop${NC}"
echo -e "${BLUE}🌐 Will be available at: http://localhost:3002${NC}"
echo ""

PORT=3002 npm start