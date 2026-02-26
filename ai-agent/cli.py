"""
CLI tool for running the AI Financial Agent
"""
import asyncio
import logging
from datetime import datetime
from financial_analyzer import FinancialAnalyzer
from autonomous_agent import AutonomousFinancialAgent
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIAgentCLI:
    def __init__(self):
        self.analyzer = FinancialAnalyzer()
        self.agent = AutonomousFinancialAgent(
            api_key=os.getenv("ANTHROPIC_API_KEY")
        )

    async def demo_spending_analysis(self):
        """Demo: Analyze spending patterns"""
        print("\n" + "="*60)
        print("DEMO: Spending Pattern Analysis")
        print("="*60)
        
        # Sample transaction data
        sample_transactions = [
            {"date": "2024-01-10", "amount": 120, "category": "groceries", "type": "EXPENSE"},
            {"date": "2024-01-11", "amount": 50, "category": "food", "type": "EXPENSE"},
            {"date": "2024-01-12", "amount": 150, "category": "entertainment", "type": "EXPENSE"},
            {"date": "2024-01-13", "amount": 100, "category": "transportation", "type": "EXPENSE"},
            {"date": "2024-01-14", "amount": 500, "category": "groceries", "type": "EXPENSE"},  # Anomaly
            {"date": "2024-01-15", "amount": 80, "category": "food", "type": "EXPENSE"},
        ]
        
        patterns = self.analyzer.analyze_spending_patterns(sample_transactions)
        
        print("\nSpending Patterns:")
        for category, pattern in patterns.items():
            print(f"\n{category.upper()}:")
            print(f"  Monthly Average: ${pattern['monthly_average']:.2f}")
            print(f"  Trend: {pattern['trend']}")
            print(f"  Forecast Next Month: ${pattern['forecast_next_month']:.2f}")
            if pattern['anomaly_detected']:
                print(f"  ⚠️ ANOMALY DETECTED: {pattern['anomaly_reason']}")

    async def demo_financial_health(self):
        """Demo: Calculate financial health score"""
        print("\n" + "="*60)
        print("DEMO: Financial Health Assessment")
        print("="*60)
        
        health = self.analyzer.get_financial_health_score(
            net_worth=50000,
            monthly_income=5000,
            monthly_expenses=2500,
            debt_ratio=0.15,
        )
        
        print(f"\nOverall Score: {health['overall_score']:.1f}/100")
        print(f"Rating: {health['rating']}")
        
        print("\nScore Breakdown:")
        for metric, score in health['breakdown'].items():
            bar_length = int(score / 4)
            bar = "█" * bar_length + "░" * (25 - bar_length)
            print(f"  {metric:20} [{bar}] {score:.1f}")
        
        print("\nRecommendations:")
        for rec in health['recommendations']:
            print(f"  • {rec}")

    async def demo_ai_insights(self):
        """Demo: Generate AI insights"""
        print("\n" + "="*60)
        print("DEMO: AI-Generated Financial Insights")
        print("="*60)
        
        # Sample data
        user_profile = {
            "annual_income": 80000,
            "age": 35,
            "goals": ["retire by 60", "buy home"],
        }
        
        spending_patterns = {
            "groceries": {
                "monthly_average": 400,
                "trend": "UP",
                "forecast_next_month": 450,
                "anomaly_detected": False,
            },
            "entertainment": {
                "monthly_average": 200,
                "trend": "UP",
                "forecast_next_month": 250,
                "anomaly_detected": True,
                "anomaly_reason": "50% above average spending",
            },
        }
        
        budget_performance = {
            "groceries": {
                "budget": 400,
                "spent": 420,
                "remaining": -20,
                "spent_percent": 105.0,
                "status": "OVER",
            },
        }
        
        financial_health = {
            "overall_score": 72,
            "rating": "GOOD",
        }
        
        insights = self.agent.generate_insights(
            user_profile=user_profile,
            spending_patterns=spending_patterns,
            budget_performance=budget_performance,
            financial_health=financial_health,
        )
        
        print("\nGenerated Insights:")
        if insights.get("key_insights"):
            for insight in insights["key_insights"]:
                print(f"\n  💡 {insight.get('title')}")
                print(f"     {insight.get('description')}")
                print(f"     Impact Score: {insight.get('impact_score')}/100")
        
        print("\nRecommended Actions:")
        if insights.get("action_items"):
            for i, action in enumerate(insights["action_items"], 1):
                priority = action.get('priority', 'medium').upper()
                print(f"\n  {i}. [{priority}] {action.get('action')}")
                print(f"     Reason: {action.get('reason')}")

    async def demo_budget_analysis(self):
        """Demo: Budget vs Actual analysis"""
        print("\n" + "="*60)
        print("DEMO: Budget Performance Analysis")
        print("="*60)
        
        sample_transactions = [
            {"date": "2024-01-10", "amount": 150, "category": "groceries", "type": "EXPENSE"},
            {"date": "2024-01-15", "amount": 300, "category": "utilities", "type": "EXPENSE"},
            {"date": "2024-01-20", "amount": 80, "category": "entertainment", "type": "EXPENSE"},
        ]
        
        budgets = {
            "groceries": 400,
            "utilities": 200,
            "entertainment": 150,
        }
        
        performance = self.analyzer.analyze_budget_performance(
            sample_transactions, budgets
        )
        
        print("\nBudget Status:")
        for category, perf in performance.items():
            status_icon = "✓" if perf['status'] == 'ON_TRACK' else "⚠️"
            print(f"\n{status_icon} {category.upper()}")
            print(f"  Budget: ${perf['budget']:.2f}")
            print(f"  Spent: ${perf['spent']:.2f}")
            print(f"  Remaining: ${perf['remaining']:.2f}")
            print(f"  Spent: {perf['spent_percent']:.1f}%")

    async def run_all_demos(self):
        """Run all demos"""
        print("\n" + "="*70)
        print(" "*15 + "AI FINANCIAL AGENT DEMO")
        print("="*70)
        
        try:
            await self.demo_spending_analysis()
            await self.demo_financial_health()
            await self.demo_budget_analysis()
            await self.demo_ai_insights()
            
            print("\n" + "="*70)
            print("Demo completed successfully!")
            print("="*70 + "\n")
            
        except Exception as e:
            logger.error(f"Error running demos: {e}")

if __name__ == "__main__":
    cli = AIAgentCLI()
    asyncio.run(cli.run_all_demos())
