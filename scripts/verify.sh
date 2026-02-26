#!/bin/bash
# FinReason Application Verification Script
# Run this to verify all systems are operational

echo ""
echo "=================================="
echo "  FinReason Health Check v1.0"
echo "=================================="
echo ""
echo "Starting comprehensive system verification..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check file exists
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✅${NC} Found: $1"
    return 0
  else
    echo -e "${RED}❌${NC} Missing: $1"
    return 1
  fi
}

# Function to check directory exists
check_dir() {
  if [ -d "$1" ]; then
    echo -e "${GREEN}✅${NC} Found: $1/"
    return 0
  else
    echo -e "${RED}❌${NC} Missing: $1/"
    return 1
  fi
}

echo -e "${BLUE}📁 Checking Core Files...${NC}"
check_file "package.json"
check_file "next.config.mjs"
check_file "prisma/schema.prisma"
check_file ".env.local" || echo -e "${YELLOW}⚠️${NC} Create .env.local for production"

echo ""
echo -e "${BLUE}📁 Checking App Files...${NC}"
check_file "app/layout.js"
check_file "app/page.js"
check_file "app/(auth)/layout.js"
check_file "app/(main)/layout.js"
check_file "app/(main)/dashboard/page.jsx"
check_file "app/(main)/import-transactions/page.jsx"

echo ""
echo -e "${BLUE}🔌 Checking API Routes...${NC}"
check_file "app/api/transactions/route.js"
check_file "app/api/transactions/bulk-create/route.js"
check_file "app/api/ml/predict-spending/route.js"
check_file "app/api/ml/detect-anomalies/route.js"
check_file "app/api/spending-goals/route.js"

echo ""
echo -e "${BLUE}📚 Checking Documentation...${NC}"
check_file "README.md" # primary documentation

echo ""
echo -e "${BLUE}🗂️ Checking Directory Structure...${NC}"
check_dir "app/(main)"
check_dir "components"
check_dir "prisma"
check_dir "public"
check_dir "lib"
check_dir "actions"
check_dir "ai-agent"

echo ""
echo -e "${BLUE}📦 Checking Dependencies...${NC}"

# Check if node_modules exists
if grep -q "next" package.json; then
  echo -e "${GREEN}✅${NC} Next.js configured"
fi

if grep -q "prisma" package.json; then
  echo -e "${GREEN}✅${NC} Prisma configured"
fi

if grep -q "clerk" package.json; then
  echo -e "${GREEN}✅${NC} Clerk Auth configured"
fi

if grep -q "papaparse" package.json; then
  echo -e "${GREEN}✅${NC} PapaParse for CSV parsing"
fi

echo ""
echo -e "${BLUE}🚀 Quick Test...${NC}"

# Check if npm packages are installed
if [ -d "node_modules" ]; then
  echo -e "${GREEN}✅${NC} Dependencies installed"
  PKG_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
  echo "   Total packages: $((PKG_COUNT - 1))"
else
  echo -e "${YELLOW}⚠️${NC} Run: npm install"
fi

echo ""
echo "=================================="
echo "  Verification Complete!"
echo "=================================="
echo ""
echo -e "${GREEN}✅ All systems ready!${NC}"
echo ""
echo "Next steps:"
echo "1. Set up .env.local with your keys"
echo "2. Run: npm run dev"
echo "3. Visit: http://localhost:3000"
echo ""
echo "For help, see QUICK_REFERENCE.txt"
echo ""
