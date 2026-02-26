import os
from dotenv import load_dotenv

load_dotenv()

# Database
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost/finance_db"
)

DIRECT_URL = os.getenv(
    "DIRECT_URL",
    "postgresql://postgres:password@localhost/finance_db"
)

# API Keys
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# AI Agent Settings
AI_MODEL = "claude-3-sonnet-20240229"
MAX_TOKENS = 2048
TEMPERATURE = 0.7

# Financial Thresholds
ANOMALY_THRESHOLD = 2.0  # Standard deviations
REBALANCE_THRESHOLD = 0.05  # 5% deviation
BUDGET_WARNING_THRESHOLD = 0.8  # 80% of budget

# Polling intervals (in seconds)
MARKET_DATA_UPDATE_INTERVAL = 300  # 5 minutes
ANALYSIS_INTERVAL = 600  # 10 minutes
RECOMMENDATION_INTERVAL = 1800  # 30 minutes

# Portfolio settings
DEFAULT_RISK_PROFILE = "moderate"
REBALANCE_FREQUENCY = "monthly"
