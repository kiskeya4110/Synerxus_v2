#!/bin/bash

# Synerxus CSR Platform - Concurrent Startup Script
# Starts both Node.js/Express frontend+backend and Python FastAPI backend

set -e

echo "🚀 Starting Synerxus CSR Platform..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Python backend dependencies are installed
if [ ! -d "python_backend/.venv" ]; then
  echo -e "${YELLOW}⚠️  Python virtual environment not found. Creating...${NC}"
  cd python_backend
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt
  cd ..
  echo -e "${GREEN}✅ Python dependencies installed${NC}"
fi

# Check if Tesseract OCR is installed
if ! command -v tesseract &> /dev/null; then
  echo -e "${YELLOW}⚠️  Tesseract OCR not found. Installing...${NC}"
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo apt-get update && sudo apt-get install -y tesseract-ocr
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    brew install tesseract
  else
    echo -e "${YELLOW}Please install Tesseract OCR manually for your system${NC}"
  fi
fi

# Check if Node dependencies are installed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}⚠️  Node.js dependencies not found. Installing...${NC}"
  npm install
  echo -e "${GREEN}✅ Node.js dependencies installed${NC}"
fi

echo ""
echo -e "${BLUE}📊 Synerxus Platform Services:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Frontend + Node Backend: ${GREEN}http://localhost:5000${NC}"
echo -e "  Python FastAPI Backend:  ${GREEN}http://localhost:8001${NC}"
echo -e "  API Documentation:       ${GREEN}http://localhost:8001/docs${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Create log directory
mkdir -p logs

# Start Python backend in background
echo -e "${BLUE}[1/2]${NC} Starting Python FastAPI backend (port 8001)..."
cd python_backend
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8001 --reload > ../logs/python-backend.log 2>&1 &
PYTHON_PID=$!
cd ..
echo -e "${GREEN}✅ Python backend started (PID: $PYTHON_PID)${NC}"

# Wait a moment for Python backend to start
sleep 2

# Start Node.js backend + frontend
echo -e "${BLUE}[2/2]${NC} Starting Node.js backend + Vite frontend (port 5000)..."
npm run dev > logs/node-backend.log 2>&1 &
NODE_PID=$!
echo -e "${GREEN}✅ Node.js backend started (PID: $NODE_PID)${NC}"

# Wait for services to be ready
echo ""
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 5

# Health checks
echo ""
echo -e "${BLUE}🏥 Health Checks:${NC}"

# Check Python backend
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓${NC} Python FastAPI backend: ${GREEN}healthy${NC}"
else
  echo -e "  ${YELLOW}⚠${NC} Python FastAPI backend: ${YELLOW}not responding${NC}"
fi

# Check Node backend
if curl -s http://localhost:5000 > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓${NC} Node.js backend: ${GREEN}healthy${NC}"
else
  echo -e "  ${YELLOW}⚠${NC} Node.js backend: ${YELLOW}not responding${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Synerxus CSR Platform is running!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "📝 Logs are being written to:"
echo -e "   - ${BLUE}logs/python-backend.log${NC}"
echo -e "   - ${BLUE}logs/node-backend.log${NC}"
echo ""
echo -e "🛑 To stop all services, press ${YELLOW}Ctrl+C${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
  echo ""
  echo -e "${YELLOW}🛑 Shutting down Synerxus platform...${NC}"
  kill $PYTHON_PID 2>/dev/null || true
  kill $NODE_PID 2>/dev/null || true
  echo -e "${GREEN}✅ All services stopped${NC}"
  exit 0
}

# Trap Ctrl+C and other termination signals
trap cleanup SIGINT SIGTERM

# Keep script running and show logs
echo -e "${BLUE}📋 Showing live logs (Ctrl+C to stop):${NC}"
echo ""
tail -f logs/node-backend.log logs/python-backend.log &
TAIL_PID=$!

# Wait for processes
wait $NODE_PID $PYTHON_PID $TAIL_PID
