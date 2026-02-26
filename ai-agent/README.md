# AI-Powered Autonomous Financial Agent

## Overview

This is a comprehensive AI-driven financial management system that combines Next.js frontend with a Python-based autonomous agent backend. The system provides intelligent financial insights, spending analysis, portfolio recommendations, and anomaly detection.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Frontend                          │
│              (React + Tailwind CSS + Clerk Auth)            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    HTTP API (REST)
                           │
┌──────────────────────────┴──────────────────────────────────┐
│              Python AI Agent Backend (FastAPI)              │
├─────────────────────────────────────────────────────────────┤
│  • AutonomousFinancialAgent (Claude-based reasoning)        │
│  • FinancialAnalyzer (Pattern detection & anomalies)        │
│  • MarketDataFetcher (Real-time financial data)             │
│  • DatabaseSession (PostgreSQL integration)                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ↓                ↓                ↓
      PostgreSQL    Anthropic API    Yahoo Finance API
      (Supabase)      (Claude)        (Stock/Crypto Data)
```

## Features

### 1. **Intelligent Spending Analysis**
- Automatic spending pattern detection
- Category-based analysis and trends
- Anomaly detection with statistical methods
- Monthly forecasting

### 2. **AI-Powered Recommendations**
- Spending optimization suggestions
- Portfolio rebalancing recommendations
- Budget optimization insights
- Risk assessment and mitigation

### 3. **Financial Health Scoring**
- Comprehensive health assessment (0-100 score)
- Breakdown by key metrics:
  - Savings rate
  - Debt ratio
  - Emergency fund adequacy
  - Income stability
- Personalized recommendations

### 4. **Real-Time Market Data**
- Stock price monitoring
- Cryptocurrency tracking
- Forex exchange rates
- Market index tracking
- Portfolio performance calculation

### 5. **Autonomous Decision Making**
- AI agent evaluates financial situations
- Generates actionable recommendations
- Learns from user behavior
- Explains reasoning for each decision



### 7. **Comprehensive Reporting**
- Daily/Weekly/Monthly financial reports
- Executive summaries
- Key achievements highlighting
- Actionable next steps

## Setup Instructions

### Prerequisites

- Node.js 16+ (for Next.js)
- Python 3.9+ (for AI Agent)
- PostgreSQL 12+ (or Supabase)
- Git

### Step 1: Environment Setup

1. **Copy environment template:**
```bash
cp .env.example .env
```

2. **Update `.env` with your credentials:**
```
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# AI Services

ANTHROPIC_API_KEY=your_anthropic_key

# AI Agent
AI_AGENT_URL=http://localhost:8000
```

### Step 2: Frontend Setup

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run migrations
npx prisma migrate deploy

# Start development server
npm run dev
```

Frontend will be available at: http://localhost:3000

### Step 3: AI Agent Backend Setup

```bash
# Navigate to AI agent directory
cd ai-agent

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the API server
python main.py

# Or with uvicorn directly:
uvicorn main:app --reload --port 8000
```

AI Agent API will be available at: http://localhost:8000

### Step 4: Verify Integration

1. **Check AI Agent health:**
```bash
curl http://localhost:8000/health
```

2. **Run demo to verify all components:**
```bash
python cli.py
```

## API Endpoints

### Insights Endpoints

#### GET `/api/insights/spending-analysis`
Analyze spending patterns
```
Query: user_id, days=90
Response: {patterns, total_spending}
```

#### GET `/api/insights/budget-analysis`
Analyze budget vs actual
```
Query: user_id
Response: {performance}
```

#### GET `/api/insights/financial-health`
Calculate financial health score
```
Query: user_id
Response: {health, total_assets, monthly_income/expenses}
```

### Recommendations Endpoints

#### POST `/api/recommendations/spending-optimization`
Get spending optimization tips
```
Body: {user_id}
Response: {recommendations, priority}
```

#### POST `/api/recommendations/portfolio-rebalancing`
Get portfolio rebalancing suggestions
```
Body: {user_id}
Response: {recommendation, requires_approval}
```

### Reports Endpoints

#### GET `/api/reports/summary`
Generate financial summary report
```
Query: user_id, period=monthly
Response: {report, timestamp}
```

### Alerts Endpoints

#### POST `/api/alerts/anomalies`
Detect anomalies and issues
```
Body: {user_id}
Response: {issues, critical_count, high_count}
```

## Usage Examples

### Using Python AI Components Directly

```python
from financial_analyzer import FinancialAnalyzer
from autonomous_agent import AutonomousFinancialAgent

# Initialize components
analyzer = FinancialAnalyzer()
agent = AutonomousFinancialAgent(api_key="sk-...")

# Analyze spending
patterns = analyzer.analyze_spending_patterns(transactions)

# Get AI insights
insights = agent.generate_insights(
    user_profile=profile,
    spending_patterns=patterns,
    budget_performance=budget_perf,
    financial_health=health
)

print(insights)
```

### Using from Next.js Frontend

```typescript
import { getSpendingAnalysis, getFinancialHealth } from "@/actions/ai-agent";

export default async function DashboardPage() {
  const spending = await getSpendingAnalysis();
  const health = await getFinancialHealth();
  
  return (
    <div>
      <SpendingAnalysis data={spending} />
      <HealthScore data={health} />
    </div>
  );
}
```

## Key Technologies

### Frontend
- **Next.js 15** - React framework
- **Tailwind CSS** - Styling
- **Clerk** - Authentication
- **React Hook Form** - Form management
- **Recharts** - Data visualization
- **Radix UI** - Component library

### Backend AI Agent
- **FastAPI** - Python web framework
- **Claude (Anthropic)** - LLM reasoning
- **Pandas & NumPy** - Data analysis
- **Scikit-learn** - ML algorithms
- **yfinance** - Market data
- **SQLAlchemy** - ORM

### Infrastructure
- **PostgreSQL** - Primary database (Supabase)
- **Prisma** - JavaScript ORM
- **Docker** - Containerization (optional)

## Configuration

### Financial Thresholds (in `ai-agent/config.py`)

```python
ANOMALY_THRESHOLD = 2.0  # Standard deviations for anomaly detection
REBALANCE_THRESHOLD = 0.05  # 5% portfolio deviation
BUDGET_WARNING_THRESHOLD = 0.8  # 80% of budget triggers warning
```

### AI Model Settings

```python
AI_MODEL = "claude-3-sonnet-20240229"
MAX_TOKENS = 2048
TEMPERATURE = 0.7  # Reasoning consistency
```

## Troubleshooting



### AI Agent Connection Issues

**Problem:** Frontend can't connect to AI Agent
**Solution:**
1. Verify AI Agent is running: `curl http://localhost:8000/health`
2. Check `AI_AGENT_URL` in `.env` matches running instance
3. Ensure ports 8000 (Python) and 3000 (Next.js) are available
4. Check firewall/network settings

### Database Errors

**Problem:** Database migration or connection fails
**Solution:**
1. Verify DATABASE_URL and DIRECT_URL are correct
2. Ensure database is accessible
3. Run: `npx prisma migrate deploy`
4. Check Supabase dashboard for connection status

### API Rate Limiting

**Problem:** Too many requests after testing
**Solution:**
1. Wait for rate limit window to reset
2. Implement caching in client code
3. Use request throttling for production

## Development Tips

### Adding New AI Insights

1. Add method to `FinancialAnalyzer` class
2. Create API endpoint in `main.py`
3. Create server action in Next.js
4. Add UI component to display results

### Testing AI Components

```bash
cd ai-agent
python -m pytest tests/
```

### Monitoring & Logging

Set environment variable for detailed logging:
```bash
export LOG_LEVEL=DEBUG
python main.py
```

## Performance Optimization

### Caching Strategy
- Market data cached for 5 minutes
- User profile cached for 1 hour
- Analysis results cached for 30 minutes

### Database Optimization
- Indexes on user_id, created_at
- Connection pooling enabled
- Query optimization for bulk operations

## Security

- ✅ Clerk authentication integrated
- ✅ API routes protected with auth
- ✅ CORS configured for localhost development
- ✅ Environment variables for sensitive data
- ✅ Input validation on all endpoints

## Production Considerations

1. **Database:** Use managed PostgreSQL (Supabase recommended)
2. **API Keys:** Store in secure vault (AWS Secrets Manager, etc.)
3. **Deployment:** Docker containerization for consistency
4. **Monitoring:** Integrate with monitoring service (Datadog, etc.)
5. **Rate Limiting:** Implement API rate limits
6. **Caching:** Configure Redis for production caching
7. **CORS:** Update allowed origins for production domain

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues and questions:
- Check troubleshooting section
- Review logs for error details
- Open GitHub issue with detailed context

## License

MIT License - See LICENSE file for details
