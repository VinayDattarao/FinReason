import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest
import logging

logger = logging.getLogger(__name__)

class FinancialAnalyzer:
    """Analyzes financial data and detects patterns, anomalies, and trends."""

    def __init__(self, anomaly_threshold: float = 2.0):
        self.anomaly_threshold = anomaly_threshold
        self.scaler = StandardScaler()

    def analyze_spending_patterns(
        self, transactions: List[Dict], days: int = 90
    ) -> Dict:
        """
        Analyze spending patterns over a period.
        
        Args:
            transactions: List of transaction dictionaries
            days: Number of days to analyze
            
        Returns:
            Dictionary with spending patterns by category
        """
        if not transactions:
            return {}

        df = pd.DataFrame(transactions)
        df['date'] = pd.to_datetime(df['date'])
        
        # Filter to last N days
        cutoff_date = datetime.now() - timedelta(days=days)
        df = df[df['date'] >= cutoff_date]

        patterns = {}
        
        for category in df['category'].unique():
            category_data = df[df['category'] == category]
            expenses = category_data[category_data['type'] == 'EXPENSE']['amount'].values
            
            if len(expenses) == 0:
                continue

            monthly_avg = np.mean(expenses) * 30 / (days / 30)
            trend = self._calculate_trend(
                category_data[category_data['type'] == 'EXPENSE']['amount'].values
            )
            
            # Calculate forecast for next month
            forecast = self._forecast_next_month(category_data, category)
            
            # Detect anomalies
            anomaly_detected, reason = self._detect_anomalies(
                category_data, self.anomaly_threshold
            )

            patterns[category] = {
                'monthly_average': float(monthly_avg),
                'trend': trend,
                'forecast_next_month': float(forecast),
                'anomaly_detected': anomaly_detected,
                'anomaly_reason': reason,
                'transaction_count': int(len(category_data)),
                'total_spent': float(category_data[category_data['type'] == 'EXPENSE']['amount'].sum()),
            }

        return patterns

    def detect_anomalies(self, amounts: List[float]) -> Tuple[bool, str]:
        """
        Detect anomalies in transaction amounts using statistical methods.
        
        Args:
            amounts: List of transaction amounts
            
        Returns:
            Tuple of (is_anomaly, reason)
        """
        if len(amounts) < 3:
            return False, None

        amounts = np.array(amounts).reshape(-1, 1)
        
        # Use Isolation Forest for robust anomaly detection
        iso_forest = IsolationForest(contamination=0.1, random_state=42)
        anomalies = iso_forest.fit_predict(amounts)
        
        if -1 in anomalies:
            return True, "Unusual spending pattern detected"
        
        return False, None

    def _detect_anomalies(
        self, category_data: pd.DataFrame, threshold: float
    ) -> Tuple[bool, str]:
        """Detect anomalies in category spending."""
        expenses = category_data[category_data['type'] == 'EXPENSE']['amount'].values
        
        if len(expenses) < 3:
            return False, None

        mean = np.mean(expenses)
        std = np.std(expenses)
        
        recent_expense = expenses[-1]
        z_score = abs((recent_expense - mean) / std) if std > 0 else 0
        
        if z_score > threshold:
            return True, f"Spending {z_score:.1f} std deviations above average"
        
        return False, None

    def _calculate_trend(self, amounts: np.ndarray) -> str:
        """Calculate spending trend: UP, DOWN, or STABLE."""
        if len(amounts) < 2:
            return "STABLE"

        # Split data in half
        first_half = np.mean(amounts[:len(amounts)//2])
        second_half = np.mean(amounts[len(amounts)//2:])
        
        change_percent = (second_half - first_half) / first_half if first_half > 0 else 0
        
        if change_percent > 0.1:
            return "UP"
        elif change_percent < -0.1:
            return "DOWN"
        else:
            return "STABLE"

    def _forecast_next_month(self, category_data: pd.DataFrame, category: str) -> float:
        """Forecast spending for next month using simple moving average."""
        expenses = category_data[category_data['type'] == 'EXPENSE']
        
        if len(expenses) == 0:
            return 0.0

        # Get amounts from last 30 days
        cutoff_date = datetime.now() - timedelta(days=30)
        recent_expenses = expenses[expenses['date'] >= cutoff_date]['amount']
        
        if len(recent_expenses) == 0:
            return float(expenses['amount'].mean())
        
        # Simple moving average forecast
        return float(recent_expenses.sum() * (30 / len(recent_expenses)))

    def analyze_budget_performance(
        self, transactions: List[Dict], budgets: Dict[str, float]
    ) -> Dict:
        """
        Analyze budget performance.
        
        Args:
            transactions: List of transactions
            budgets: Dictionary of {category: budget_amount}
            
        Returns:
            Budget performance analysis
        """
        df = pd.DataFrame(transactions)
        df['date'] = pd.to_datetime(df['date'])
        
        # Current month analysis
        now = datetime.now()
        current_month_df = df[
            (df['date'].dt.year == now.year) & 
            (df['date'].dt.month == now.month)
        ]

        performance = {}
        
        for category, budget_amount in budgets.items():
            category_expenses = current_month_df[
                (current_month_df['category'] == category) &
                (current_month_df['type'] == 'EXPENSE')
            ]['amount'].sum()

            spent_percent = (category_expenses / budget_amount * 100) if budget_amount > 0 else 0
            remaining = budget_amount - category_expenses

            performance[category] = {
                'budget': float(budget_amount),
                'spent': float(category_expenses),
                'remaining': float(remaining),
                'spent_percent': float(spent_percent),
                'status': 'OVER' if spent_percent > 100 else (
                    'WARNING' if spent_percent > 80 else 'ON_TRACK'
                ),
            }

        return performance

    def calculate_net_worth(
        self, assets: Dict[str, float], liabilities: Dict[str, float]
    ) -> Dict:
        """Calculate net worth and asset allocation."""
        total_assets = sum(assets.values())
        total_liabilities = sum(liabilities.values())
        net_worth = total_assets - total_liabilities

        allocation = {
            asset: (amount / total_assets * 100) if total_assets > 0 else 0
            for asset, amount in assets.items()
        }

        return {
            'total_assets': float(total_assets),
            'total_liabilities': float(total_liabilities),
            'net_worth': float(net_worth),
            'asset_allocation': allocation,
        }

    def get_financial_health_score(
        self,
        net_worth: float,
        monthly_income: float,
        monthly_expenses: float,
        debt_ratio: float,
    ) -> Dict:
        """
        Calculate overall financial health score (0-100).
        
        Args:
            net_worth: Total net worth
            monthly_income: Monthly income
            monthly_expenses: Monthly expenses
            debt_ratio: Total debt / Total assets
            
        Returns:
            Health score and breakdown
        """
        scores = {}

        # Savings rate score (0-25)
        savings_rate = (monthly_income - monthly_expenses) / monthly_income if monthly_income > 0 else 0
        scores['savings_rate'] = min(25, max(0, savings_rate * 100 / 20))

        # Debt ratio score (0-25)
        debt_score = max(0, 25 * (1 - min(1, debt_ratio)))
        scores['debt_ratio'] = debt_score

        # Emergency fund score (0-25)
        months_of_expenses = net_worth / monthly_expenses if monthly_expenses > 0 else 0
        months_of_expenses = min(months_of_expenses, 12)  # Cap at 12 months
        scores['emergency_fund'] = min(25, months_of_expenses * 25 / 6)

        # Income stability score (0-25) - simplified
        scores['income_stability'] = 15  # Base score, would need income history

        total_score = sum(scores.values())

        return {
            'overall_score': float(total_score),
            'breakdown': scores,
            'rating': self._get_health_rating(total_score),
            'recommendations': self._get_health_recommendations(scores),
        }

    def _get_health_rating(self, score: float) -> str:
        """Get health rating based on score."""
        if score >= 80:
            return "EXCELLENT"
        elif score >= 60:
            return "GOOD"
        elif score >= 40:
            return "FAIR"
        else:
            return "POOR"

    def _get_health_recommendations(self, scores: Dict) -> List[str]:
        """Generate recommendations based on score breakdown."""
        recommendations = []
        
        if scores['savings_rate'] < 10:
            recommendations.append("Increase saving rate by reducing expenses")
        
        if scores['debt_ratio'] < 10:
            recommendations.append("Focus on paying down debt")
        
        if scores['emergency_fund'] < 10:
            recommendations.append("Build emergency fund with 3-6 months of expenses")
        
        return recommendations
