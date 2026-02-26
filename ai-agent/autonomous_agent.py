import json
import logging
from typing import Dict, List, Optional
from datetime import datetime
from anthropic import Anthropic

logger = logging.getLogger(__name__)

class AutonomousFinancialAgent:
    """
    Autonomous AI agent that makes intelligent financial decisions
    using Claude as the reasoning engine.
    """

    def __init__(self, api_key: str):
        self.client = Anthropic()
        self.conversation_history = []

    def generate_insights(
        self,
        user_profile: Dict,
        spending_patterns: Dict,
        budget_performance: Dict,
        financial_health: Dict,
        market_data: Optional[Dict] = None,
    ) -> Dict:
        """
        Generate comprehensive financial insights using AI.
        
        Args:
            user_profile: User's financial profile
            spending_patterns: Analyzed spending patterns
            budget_performance: Budget vs actual analysis
            financial_health: Overall financial health metrics
            market_data: Optional current market data
            
        Returns:
            Dictionary with insights and recommendations
        """

        prompt = f"""
You are an expert financial advisor. Analyze the following financial data and provide actionable insights.

USER PROFILE:
{json.dumps(user_profile, indent=2)}

SPENDING PATTERNS:
{json.dumps(spending_patterns, indent=2)}

BUDGET PERFORMANCE:
{json.dumps(budget_performance, indent=2)}

FINANCIAL HEALTH:
{json.dumps(financial_health, indent=2)}

MARKET DATA:
{json.dumps(market_data or {{}}, indent=2)}

Based on this data, provide:
1. Key financial insights (2-3 most important)
2. Spending optimization opportunities
3. Budget recommendations
4. Risk assessment
5. Action items (prioritized by impact)

Format your response as JSON with the following structure:
{{
    "key_insights": [
        {{"title": "...", "description": "...", "impact_score": 0-100}}
    ],
    "spending_optimization": [
        {{"category": "...", "current_avg": 0, "recommended": 0, "savings_potential": 0}}
    ],
    "budget_recommendations": [
        {{"category": "...", "adjustment": "increase/decrease", "reason": "..."}}
    ],
    "risk_assessment": {{"level": "low/medium/high", "factors": []}},
    "action_items": [
        {{"priority": "high/medium/low", "action": "...", "reason": "..."}}
    ]
}}
"""

        response = self.client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )

        try:
            response_text = response.content[0].text
            # Extract JSON from response
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            json_str = response_text[json_start:json_end]
            insights = json.loads(json_str)
            return insights
        except (json.JSONDecodeError, IndexError) as e:
            logger.error(f"Error parsing AI response: {e}")
            return self._get_default_insights()

    def make_portfolio_recommendation(
        self,
        current_portfolio: Dict,
        risk_profile: str,
        goals: Dict,
        constraints: Dict,
    ) -> Dict:
        """
        Generate portfolio rebalancing recommendation.
        
        Args:
            current_portfolio: Current asset allocation
            risk_profile: User's risk tolerance (conservative/moderate/aggressive)
            goals: Financial goals
            constraints: Any constraints on rebalancing
            
        Returns:
            Portfolio recommendation
        """

        prompt = f"""
You are an expert portfolio manager. Recommend portfolio allocation changes based on the following:

CURRENT PORTFOLIO:
{json.dumps(current_portfolio, indent=2)}

RISK PROFILE: {risk_profile}

FINANCIAL GOALS:
{json.dumps(goals, indent=2)}

CONSTRAINTS:
{json.dumps(constraints, indent=2)}

Provide a recommended portfolio allocation that:
1. Matches the risk profile
2. Aligns with financial goals
3. Respects the constraints
4. Indicates the reasoning for each change

Format as JSON:
{{
    "recommended_allocation": {{"asset_class": percentage, ...}},
    "rebalancing_actions": [
        {{"from": "asset1", "to": "asset2", "amount": 0, "reason": "..."}}
    ],
    "expected_return": 0,
    "risk_level": "...",
    "confidence_score": 0-100,
    "rationale": "..."
}}
"""

        response = self.client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        try:
            response_text = response.content[0].text
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            recommendation = json.loads(response_text[json_start:json_end])
            return recommendation
        except (json.JSONDecodeError, IndexError) as e:
            logger.error(f"Error parsing portfolio recommendation: {e}")
            return self._get_default_portfolio_recommendation()

    def generate_financial_report(
        self,
        summary_data: Dict,
        insights: List[Dict],
        recommendations: List[Dict],
    ) -> Dict:
        """
        Generate a comprehensive financial report.
        
        Args:
            summary_data: Financial summary data
            insights: List of insights from analysis
            recommendations: List of recommendations
            
        Returns:
            Formatted financial report
        """

        prompt = f"""
You are a financial reports specialist. Create a professional financial report summary based on:

SUMMARY DATA:
{json.dumps(summary_data, indent=2)}

KEY INSIGHTS:
{json.dumps(insights, indent=2)}

RECOMMENDATIONS:
{json.dumps(recommendations, indent=2)}

Generate a clear, professional report that:
1. Summarizes the financial situation
2. Highlights key achievements
3. Identifies areas for improvement
4. Provides next steps

Format as JSON:
{{
    "executive_summary": "...",
    "key_achievements": ["..."],
    "areas_for_improvement": ["..."],
    "next_steps": ["..."],
    "overall_assessment": "..."
}}
"""

        response = self.client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        try:
            response_text = response.content[0].text
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            report = json.loads(response_text[json_start:json_end])
            return report
        except (json.JSONDecodeError, IndexError) as e:
            logger.error(f"Error generating report: {e}")
            return self._get_default_report()

    def detect_and_flag_issues(self, analysis_data: Dict) -> List[Dict]:
        """
        Detect and flag financial issues that need attention.
        
        Args:
            analysis_data: Complete financial analysis data
            
        Returns:
            List of flagged issues with severity and recommendations
        """

        prompt = f"""
You are a financial risk analyst. Review the following financial data and identify any issues or red flags:

DATA:
{json.dumps(analysis_data, indent=2)}

Identify any:
1. Spending anomalies
2. Budget overruns
3. Unusual patterns
4. Risks to address
5. Time-sensitive actions needed

Format as JSON array:
[
    {{
        "issue": "description",
        "severity": "critical/high/medium/low",
        "reason": "why this matters",
        "action": "recommended action"
    }}
]
"""

        response = self.client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        try:
            response_text = response.content[0].text
            json_start = response_text.find("[")
            json_end = response_text.rfind("]") + 1
            issues = json.loads(response_text[json_start:json_end])
            return issues
        except (json.JSONDecodeError, IndexError) as e:
            logger.error(f"Error detecting issues: {e}")
            return []

    def _get_default_insights(self) -> Dict:
        """Return default insights structure if AI parsing fails."""
        return {
            "key_insights": [],
            "spending_optimization": [],
            "budget_recommendations": [],
            "risk_assessment": {"level": "medium", "factors": []},
            "action_items": [],
        }

    def _get_default_portfolio_recommendation(self) -> Dict:
        """Return default portfolio recommendation if AI parsing fails."""
        return {
            "recommended_allocation": {},
            "rebalancing_actions": [],
            "expected_return": 0,
            "risk_level": "moderate",
            "confidence_score": 0,
            "rationale": "",
        }

    def _get_default_report(self) -> Dict:
        """Return default report structure if AI parsing fails."""
        return {
            "executive_summary": "",
            "key_achievements": [],
            "areas_for_improvement": [],
            "next_steps": [],
            "overall_assessment": "",
        }
