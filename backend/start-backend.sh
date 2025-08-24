#!/bin/bash

# Backend Startup Script
# Run this from the backend directory

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔧 Starting Hyperliquid Notify Backend${NC}"
echo "========================================="

# Check if we're in the backend directory
if [ ! -f "package.json" ] || [ ! -f "src/index.ts" ]; then
    echo -e "${RED}❌ Error: Please run this from the backend directory${NC}"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found. Please create it from .env.example${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Kill existing process on port 5001
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 5001 is in use. Killing existing process...${NC}"
    lsof -ti:5001 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Start the backend
echo -e "${GREEN}🚀 Starting backend server on port 5001...${NC}"
echo -e "${YELLOW}💡 Press Ctrl+C to stop${NC}"
echo ""

npm run dev