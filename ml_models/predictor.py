import os
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import numpy as np
import json

class SpendingPredictor:
    """
    ML-based spending predictor using historical transaction data.
    Predicts next 30 days spending by category using time-series analysis.
    """

    def __init__(self):
        self.model_version = "1.0"

    def predict_spending(self, transactions: List[Dict]) -> Dict:
        """
        Predict spending for next 30 days based on transaction history.
        
        Args:
            transactions: List of transaction dicts with amount, date, category
            
        Returns:
            Dictionary with predictions and confidence scores
        """
        if not transactions or len(transactions) < 5:
            return {"error": "Insufficient transaction history"}

        # Group transactions by category and calculate trends
        category_data = self._group_by_category(transactions)
        predictions = {}
        confidence = {}

        for category, amounts in category_data.items():
            if len(amounts) < 2:
                continue

            # Calculate trend using linear regression
            trend, intercept = self._calculate_trend(amounts)
            
            # Predict next 30 days average
            predicted = self._predict_next_period(amounts, trend, intercept)
            predictions[category] = max(0, round(predicted, 2))  # Ensure positive
            
            # Calculate confidence based on data consistency
            confidence[category] = self._calculate_confidence(amounts)

        return {
            "predicted_spending": predictions,
            "confidence": confidence,
            "prediction_period": "30_days",
            "model_version": self.model_version,
        }

    def _group_by_category(self, transactions: List[Dict]) -> Dict[str, List[float]]:
        """Group transactions by category and extract amounts."""
        grouped = {}
        for tx in transactions:
            category = tx.get("category", "other")
            amount = float(tx.get("amount", 0))
            if category not in grouped:
                grouped[category] = []
            grouped[category].append(amount)
        return grouped

    def _calculate_trend(self, amounts: List[float]) -> Tuple[float, float]:
        """Calculate linear trend (slope and intercept) using least squares."""
        if len(amounts) < 2:
            return 0, np.mean(amounts) if amounts else 0

        x = np.arange(len(amounts))
        y = np.array(amounts, dtype=float)
        
        # Simple linear regression
        n = len(x)
        mean_x = np.mean(x)
        mean_y = np.mean(y)
        
        numerator = np.sum((x - mean_x) * (y - mean_y))
        denominator = np.sum((x - mean_x) ** 2)
        
        slope = numerator / denominator if denominator != 0 else 0
        intercept = mean_y - slope * mean_x
        
        return float(slope), float(intercept)

    def _predict_next_period(self, amounts: List[float], trend: float, intercept: float) -> float:
        """Predict spending for the next period (average of next 30 days)."""
        if len(amounts) == 0:
            return 0
        
        # Use weighted average: recent data weighted more
        weights = np.exp(np.linspace(0, 1, len(amounts)))
        weights = weights / np.sum(weights)
        
        recent_avg = np.sum(np.array(amounts) * weights)
        
        # Apply slight trend adjustment
        trend_adjustment = trend * 5  # Project trend 5 periods ahead
        
        return recent_avg + (trend_adjustment * 0.1)  # 10% weight to trend

    def _calculate_confidence(self, amounts: List[float]) -> float:
        """Calculate confidence score (0-1) based on spending consistency."""
        if len(amounts) < 2:
            return 0.5

        amounts = np.array(amounts, dtype=float)
        mean = np.mean(amounts)
        std = np.std(amounts)
        
        # Lower coefficient of variation = higher consistency = higher confidence
        cv = (std / (mean + 1)) if mean > 0 else 0
        
        # Convert to confidence (0-1, inverted)
        confidence = max(0.3, 1 - (cv * 0.5))
        return min(1.0, float(confidence))


class AnomalyDetector:
    """
    Detects unusual spending patterns using statistical methods.
    Flags transactions that deviate significantly from historical norms.
    """

    def __init__(self, z_threshold: float = 2.5):
        self.z_threshold = z_threshold
        self.model_version = "1.0"

    def detect_anomalies(self, transactions: List[Dict]) -> Dict:
        """
        Detect anomalies in transaction data.
        
        Args:
            transactions: List of transaction dicts
            
        Returns:
            Dictionary with detected anomalies and reasons
        """
        if not transactions or len(transactions) < 10:
            return {"anomalies": [], "reason": "Insufficient data"}

        category_data = self._group_by_category_with_metadata(transactions)
        anomalies = []

        for category, data_list in category_data.items():
            if len(data_list) < 3:
                continue

            amounts = [d["amount"] for d in data_list]
            
            # Statistical anomaly detection (Z-score)
            mean = np.mean(amounts)
            std = np.std(amounts)
            
            for item in data_list[-5:]:  # Check last 5 transactions
                z_score = (item["amount"] - mean) / (std + 0.01) if std > 0 else 0
                
                if abs(z_score) > self.z_threshold:
                    anomalies.append({
                        "category": category,
                        "amount": item["amount"],
                        "date": item["date"],
                        "z_score": round(float(z_score), 2),
                        "average": round(mean, 2),
                        "reason": f"Spending {abs(z_score):.1f}σ away from normal pattern",
                    })

        return {
            "anomalies": anomalies,
            "count": len(anomalies),
            "model_version": self.model_version,
        }

    def _group_by_category_with_metadata(
        self, transactions: List[Dict]
    ) -> Dict[str, List[Dict]]:
        """Group transactions by category while preserving metadata."""
        grouped = {}
        for tx in transactions:
            category = tx.get("category", "other")
            if category not in grouped:
                grouped[category] = []
            
            grouped[category].append({
                "amount": float(tx.get("amount", 0)),
                "date": tx.get("date", ""),
                "description": tx.get("description", ""),
            })
        
        return grouped


class SavingsOptimizer:
    """
    Generates personalized savings recommendations.
    """

    def __init__(self):
        self.model_version = "1.0"

    def optimize_savings(self, transactions: List[Dict], budget_limit: float) -> Dict:
        """
        Analyze spending and suggest savings opportunities.
        
        Args:
            transactions: List of transaction dicts
            budget_limit: User's monthly budget
            
        Returns:
            Dictionary with optimization insights
        """
        if not transactions:
            return {"optimizations": []}

        category_totals = {}
        for tx in transactions:
            cat = tx.get("category", "other")
            amount = float(tx.get("amount", 0))
            category_totals[cat] = category_totals.get(cat, 0) + amount

        over_budget_categories = {
            cat: amt for cat, amt in category_totals.items()
            if amt > (budget_limit * 0.25)  # More than 25% of budget
        }

        optimizations = []

        for category, amount in sorted(over_budget_categories.items(), key=lambda x: x[1], reverse=True):
            reduction_target = amount * 0.15  # Suggest 15% reduction
            optimizations.append({
                "category": category,
                "current_spend": round(amount, 2),
                "suggested_reduction": round(reduction_target, 2),
                "target_spend": round(amount - reduction_target, 2),
                "potential_savings": round(reduction_target * 12, 2),  # Annualized
            })

        return {
            "optimizations": optimizations,
            "total_potential_annual_savings": round(
                sum(opt["potential_savings"] for opt in optimizations), 2
            ),
            "model_version": self.model_version,
        }


if __name__ == "__main__":
    # Test the models with sample data
    sample_transactions = [
        {"amount": 50, "category": "groceries", "date": "2024-12-01"},
        {"amount": 75, "category": "groceries", "date": "2024-12-05"},
        {"amount": 60, "category": "groceries", "date": "2024-12-10"},
        {"amount": 300, "category": "food", "date": "2024-12-02"},
        {"amount": 200, "category": "entertainment", "date": "2024-12-15"},
        {"amount": 1200, "category": "entertainment", "date": "2024-12-16"},  # Anomaly
    ]

    predictor = SpendingPredictor()
    detector = AnomalyDetector()
    optimizer = SavingsOptimizer()

    print("=== Predictions ===")
    print(json.dumps(predictor.predict_spending(sample_transactions), indent=2))

    print("\n=== Anomalies ===")
    print(json.dumps(detector.detect_anomalies(sample_transactions), indent=2))

    print("\n=== Optimizations ===")
    print(json.dumps(optimizer.optimize_savings(sample_transactions, 5000), indent=2))
