#!/bin/bash

# AI Financial Management System - Automated Setup Script
# This script will set up both the frontend and AI agent

set -e

echo "==========================================="
echo "AI Financial Management System Setup"
echo "==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️ Node.js not found. Please install Node.js 16+ from https://nodejs.org${NC}"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}⚠️ Python 3 not found. Please install Python 3.9+ from https://www.python.org${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"
echo -e "${GREEN}✓ Python found: $(python3 --version)${NC}"
echo ""

# Step 1: Check for .env file
echo -e "${BLUE}Step 1: Checking environment configuration...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️ .env file not found. Creating from template...${NC}"
    cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://user:password@host:5432/finance_db"
DIRECT_URL="postgresql://user:password@host:5432/finance_db"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_
CLERK_SECRET_KEY=sk_test_
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# AI Services
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
ARCJET_KEY=

# AI Agent Backend
AI_AGENT_URL=http://localhost:8000
NODE_ENV=development
EOF
    echo -e "${YELLOW}⚠️ Please edit .env with your API keys and database URL${NC}"
else
    echo -e "${GREEN}✓ .env file found${NC}"
fi
echo ""

# Step 2: Frontend Setup
echo -e "${BLUE}Step 2: Setting up frontend...${NC}"

if [ ! -d "node_modules" ]; then
    echo "Installing Node dependencies..."
    npm install --legacy-peer-deps
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

# Check for Prisma
if [ ! -d "node_modules/.prisma" ]; then
    echo "Generating Prisma client..."
    npx prisma generate
    echo -e "${GREEN}✓ Prisma client generated${NC}"
fi

echo ""

# Step 3: AI Agent Setup
echo -e "${BLUE}Step 3: Setting up AI Agent...${NC}"

cd ai-agent

# Create AI agent .env if not exists
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
DATABASE_URL="postgresql://user:password@host:5432/finance_db"
DIRECT_URL="postgresql://user:password@host:5432/finance_db"
AI_MODEL=claude-3-sonnet-20240229
TEMPERATURE=0.7
MAX_TOKENS=2048
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=INFO
EOF
    echo -e "${YELLOW}⚠️ AI Agent .env created. Please update with your API keys${NC}"
fi

# Create Python virtual environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    
    # Activate venv
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
    else
        . venv/Scripts/activate  # Windows
    fi
    
    echo "Installing Python dependencies..."
    pip install -r requirements.txt
    echo -e "${GREEN}✓ Python environment set up${NC}"
else
    echo -e "${GREEN}✓ Python virtual environment already exists${NC}"
fi

cd ..

echo ""
echo -e "${GREEN}==========================================="
echo "Setup completed successfully! ✅"
echo "==========================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo "1. Update .env with your API keys:"
echo "   - DATABASE_URL (Supabase or local PostgreSQL)"
echo "   - CLERK_* keys (from clerk.com)"
echo "   - GEMINI_API_KEY (from aistudio.google.com)"
echo "   - ANTHROPIC_API_KEY (from console.anthropic.com)"
echo ""
echo "2. (Optional) Run database migrations:"
echo "   npx prisma migrate deploy"
echo ""
echo "3. Start the services in separate terminals:"
echo ""
echo -e "${YELLOW}Terminal 1 - Frontend:${NC}"
echo "   npm run dev"
echo ""
echo -e "${YELLOW}Terminal 2 - AI Agent:${NC}"
echo "   cd ai-agent"
echo "   source venv/bin/activate  # or venv\\Scripts\\activate on Windows"
echo "   python main.py"
echo ""
echo -e "${YELLOW}Terminal 3 - Test (optional):${NC}"
echo "   cd ai-agent"
echo "   python cli.py"
echo ""
echo "4. Access the system:"
echo "   Frontend: http://localhost:3000"
echo "   AI API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "For detailed instructions, refer to README.md in the project root."
echo ""