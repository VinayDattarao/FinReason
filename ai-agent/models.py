from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

# User Models
class UserBase(BaseModel):
    email: str
    name: str

class UserCreate(UserBase):
    clerk_user_id: str

class User(UserBase):
    id: str
    clerk_user_id: str
    image_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Account Models
class AccountBase(BaseModel):
    name: str
    account_type: str  # CURRENT, SAVINGS, INVESTMENT
    balance: float
    is_default: bool = False

class AccountCreate(AccountBase):
    user_id: str

class Account(AccountBase):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Transaction Models
class TransactionBase(BaseModel):
    amount: float
    description: Optional[str] = None
    category: str
    type: str  # INCOME, EXPENSE

class TransactionCreate(TransactionBase):
    date: datetime
    account_id: str
    user_id: str
    is_recurring: bool = False
    recurring_interval: Optional[str] = None

class Transaction(TransactionBase):
    id: str
    account_id: str
    user_id: str
    date: datetime
    created_at: datetime

    class Config:
        from_attributes = True

# Portfolio Models
class Portfolio(BaseModel):
    user_id: str
    total_assets: float
    total_liabilities: float
    net_worth: float
    asset_allocation: dict
    risk_profile: str  # conservative, moderate, aggressive

class PortfolioRebalancing(BaseModel):
    portfolio_id: str
    from_asset: str
    to_asset: str
    amount: float
    reason: str
    confidence_score: float

# Spending Analysis Models
class SpendingPattern(BaseModel):
    category: str
    monthly_average: float
    trend: str  # UP, DOWN, STABLE
    forecast_next_month: float
    anomaly_detected: bool
    anomaly_reason: Optional[str] = None

class SpendingAnalysis(BaseModel):
    user_id: str
    analysis_date: datetime
    patterns: List[SpendingPattern]
    total_spending: float
    budget_vs_actual: dict
    recommendations: List[str]

# Financial Insights Models
class FinancialInsight(BaseModel):
    user_id: str
    insight_type: str  # SPENDING, SAVING, INVESTMENT, BUDGET, RISK
    title: str
    description: str
    actionable_steps: List[str]
    impact_score: float  # 0-100
    urgency: str  # LOW, MEDIUM, HIGH
    generated_at: datetime

class FinancialReport(BaseModel):
    user_id: str
    report_period: str  # daily, weekly, monthly
    summary: str
    insights: List[FinancialInsight]
    recommendations: List[str]
    next_actions: List[str]

# Agent Decision Models
class AgentDecision(BaseModel):
    user_id: str
    decision_type: str
    action: str
    reasoning: str
    parameters: dict
    confidence_score: float
    requires_approval: bool
    created_at: datetime
    status: str  # PENDING, PENDING_APPROVAL, EXECUTED, REJECTED

class AgentAction(BaseModel):
    decision_id: str
    action_type: str
    details: dict
    executed_at: datetime
    result: dict
