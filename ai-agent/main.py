from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from typing import Optional, Dict, List

from config import (
    DATABASE_URL, 
    ANTHROPIC_API_KEY,
    AI_MODEL,
    ANOMALY_THRESHOLD,
    REBALANCE_THRESHOLD,
)
from models import (
    FinancialInsight,
    FinancialReport,
    AgentDecision,
    SpendingAnalysis,
)
from financial_analyzer import FinancialAnalyzer
from autonomous_agent import AutonomousFinancialAgent
from database import init_db, get_db_session
from market_data import MarketDataFetcher

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize components
analyzer = FinancialAnalyzer(anomaly_threshold=ANOMALY_THRESHOLD)
agent = AutonomousFinancialAgent(api_key=ANTHROPIC_API_KEY)
market_fetcher = MarketDataFetcher()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting AI Financial Agent...")
    # Initialize database
    await init_db()
    yield
    logger.info("Shutting down AI Financial Agent...")

app = FastAPI(
    title="AI Financial Agent API",
    description="Autonomous AI-powered financial management system",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# INSIGHTS ENDPOINTS
# ============================================================================

@app.post("/api/insights/spending-analysis")
async def analyze_spending(
    user_id: str,
    days: int = 90,
    db = Depends(get_db_session)
):
    """
    Analyze spending patterns for a user.
    
    Args:
        user_id: User ID
        days: Number of days to analyze
        
    Returns:
        Spending analysis with patterns and anomalies
    """
    try:
        # Fetch transactions from database
        transactions = await db.fetch_user_transactions(user_id, days)
        
        if not transactions:
            return {
                "user_id": user_id,
                "patterns": {},
                "message": "No transactions found for analysis"
            }

        # Analyze patterns
        patterns = analyzer.analyze_spending_patterns(transactions, days)
        
        return {
            "user_id": user_id,
            "analysis_date": str(__import__("datetime").datetime.now()),
            "patterns": patterns,
            "total_spending": sum(
                p.get('total_spent', 0) for p in patterns.values()
            ),
        }
    except Exception as e:
        logger.error(f"Error analyzing spending: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/insights/budget-analysis")
async def analyze_budget(
    user_id: str,
    db = Depends(get_db_session)
):
    """
    Analyze budget performance vs actual spending.
    
    Args:
        user_id: User ID
        
    Returns:
        Budget performance analysis
    """
    try:
        # Fetch transactions and budgets
        transactions = await db.fetch_user_transactions(user_id, 30)
        budgets = await db.fetch_user_budgets(user_id)
        
        if not budgets:
            return {
                "user_id": user_id,
                "message": "No budgets configured"
            }

        performance = analyzer.analyze_budget_performance(transactions, budgets)
        
        return {
            "user_id": user_id,
            "performance": performance,
            "total_budgeted": sum(budgets.values()),
        }
    except Exception as e:
        logger.error(f"Error analyzing budget: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/insights/financial-health")
async def analyze_financial_health(
    user_id: str,
    db = Depends(get_db_session)
):
    """
    Calculate overall financial health score.
    
    Args:
        user_id: User ID
        
    Returns:
        Financial health score and breakdown
    """
    try:
        # Fetch financial data
        accounts = await db.fetch_user_accounts(user_id)
        transactions = await db.fetch_user_transactions(user_id, 30)
        
        # Calculate metrics
        total_assets = sum(acc.get('balance', 0) for acc in accounts)
        
        # Calculate monthly income/expenses
        df_data = __import__("pandas").DataFrame(transactions)
        income = df_data[df_data['type'] == 'INCOME']['amount'].sum()
        expenses = df_data[df_data['type'] == 'EXPENSE']['amount'].sum()
        
        # Placeholder for liabilities (would come from separate data)
        total_liabilities = 0
        debt_ratio = total_liabilities / total_assets if total_assets > 0 else 0
        
        health = analyzer.get_financial_health_score(
            net_worth=total_assets - total_liabilities,
            monthly_income=income,
            monthly_expenses=expenses,
            debt_ratio=debt_ratio,
        )
        
        return {
            "user_id": user_id,
            "health": health,
            "total_assets": float(total_assets),
            "monthly_income": float(income),
            "monthly_expenses": float(expenses),
        }
    except Exception as e:
        logger.error(f"Error analyzing financial health: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# AI RECOMMENDATIONS ENDPOINTS
# ============================================================================

@app.post("/api/recommendations/spending-optimization")
async def get_spending_optimization(
    user_id: str,
    db = Depends(get_db_session)
):
    """
    Get AI-powered spending optimization recommendations.
    
    Args:
        user_id: User ID
        
    Returns:
        Optimization recommendations
    """
    try:
        # Gather all financial data
        user_profile = await db.fetch_user_profile(user_id)
        transactions = await db.fetch_user_transactions(user_id, 90)
        budgets = await db.fetch_user_budgets(user_id)
        accounts = await db.fetch_user_accounts(user_id)
        
        spending_patterns = analyzer.analyze_spending_patterns(transactions)
        budget_performance = analyzer.analyze_budget_performance(transactions, budgets)
        
        # Get AI insights
        insights = agent.generate_insights(
            user_profile=user_profile,
            spending_patterns=spending_patterns,
            budget_performance=budget_performance,
            financial_health={},  # Would be populated from health analysis
        )
        
        return {
            "user_id": user_id,
            "recommendations": insights.get("spending_optimization", []),
            "priority": "high" if insights.get("risk_assessment", {}).get("level") == "high" else "medium",
        }
    except Exception as e:
        logger.error(f"Error getting optimization recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recommendations/portfolio-rebalancing")
async def get_portfolio_rebalancing(
    user_id: str,
    db = Depends(get_db_session)
):
    """
    Get portfolio rebalancing recommendations.
    
    Args:
        user_id: User ID
        
    Returns:
        Portfolio rebalancing suggestions
    """
    try:
        # Fetch user data
        user_profile = await db.fetch_user_profile(user_id)
        portfolio = await db.fetch_user_portfolio(user_id)
        goals = await db.fetch_user_goals(user_id)
        
        if not portfolio:
            raise HTTPException(status_code=404, detail="No portfolio found")
        
        recommendation = agent.make_portfolio_recommendation(
            current_portfolio=portfolio.get('allocation', {}),
            risk_profile=user_profile.get('risk_profile', 'moderate'),
            goals=goals,
            constraints=user_profile.get('constraints', {}),
        )
        
        return {
            "user_id": user_id,
            "recommendation": recommendation,
            "requires_approval": recommendation.get("confidence_score", 0) < 80,
        }
    except Exception as e:
        logger.error(f"Error getting portfolio recommendation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# REPORTS ENDPOINTS
# ============================================================================

@app.get("/api/reports/summary")
async def get_financial_summary(
    user_id: str,
    period: str = "monthly",
    db = Depends(get_db_session)
):
    """
    Get comprehensive financial summary report.
    
    Args:
        user_id: User ID
        period: Report period (daily, weekly, monthly)
        
    Returns:
        Financial summary report
    """
    try:
        # Determine date range
        from datetime import datetime, timedelta
        
        days_map = {"daily": 1, "weekly": 7, "monthly": 30}
        days = days_map.get(period, 30)
        
        # Gather data
        transactions = await db.fetch_user_transactions(user_id, days)
        accounts = await db.fetch_user_accounts(user_id)
        budgets = await db.fetch_user_budgets(user_id)
        
        spending_patterns = analyzer.analyze_spending_patterns(transactions, days)
        budget_performance = analyzer.analyze_budget_performance(transactions, budgets)
        
        insights = agent.generate_insights(
            user_profile={},
            spending_patterns=spending_patterns,
            budget_performance=budget_performance,
            financial_health={},
        )
        
        report = agent.generate_financial_report(
            summary_data={
                "period": period,
                "total_spending": sum(p.get('total_spent', 0) for p in spending_patterns.values()),
                "accounts": len(accounts),
            },
            insights=[],
            recommendations=insights.get("action_items", []),
        )
        
        return {
            "user_id": user_id,
            "report": report,
            "timestamp": str(__import__("datetime").datetime.now()),
        }
    except Exception as e:
        logger.error(f"Error generating summary report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ALERTS & ANOMALIES ENDPOINTS
# ============================================================================

@app.post("/api/alerts/anomalies")
async def detect_anomalies(
    user_id: str,
    db = Depends(get_db_session)
):
    """
    Detect financial anomalies and flag issues.
    
    Args:
        user_id: User ID
        
    Returns:
        List of detected issues
    """
    try:
        transactions = await db.fetch_user_transactions(user_id, 30)
        budgets = await db.fetch_user_budgets(user_id)
        
        # Prepare analysis data
        analysis_data = {
            "transactions": transactions,
            "budgets": budgets,
        }
        
        issues = agent.detect_and_flag_issues(analysis_data)
        
        return {
            "user_id": user_id,
            "issues": issues,
            "critical_count": sum(1 for i in issues if i.get("severity") == "critical"),
            "high_count": sum(1 for i in issues if i.get("severity") == "high"),
        }
    except Exception as e:
        logger.error(f"Error detecting anomalies: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "AI Financial Agent API",
        "version": "1.0.0",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
