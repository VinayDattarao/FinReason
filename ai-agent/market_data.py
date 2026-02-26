import asyncio
import logging
from typing import Dict, Optional
from datetime import datetime, timedelta
import yfinance as yf

logger = logging.getLogger(__name__)

class MarketDataFetcher:
    """Fetches real-time market data for financial analysis."""

    def __init__(self):
        self.cache = {}
        self.cache_expiry = {}
        self.cache_duration = 300  # 5 minutes

    async def get_stock_data(
        self, symbol: str, period: str = "1mo"
    ) -> Dict:
        """
        Fetch stock data for a symbol.
        
        Args:
            symbol: Stock symbol (e.g., "AAPL")
            period: Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 5y)
            
        Returns:
            Dictionary with stock data and analysis
        """
        try:
            # Check cache
            cache_key = f"stock_{symbol}_{period}"
            if self._is_cached(cache_key):
                return self.cache[cache_key]

            # Fetch data
            stock = yf.Ticker(symbol)
            hist = stock.history(period=period)
            info = stock.info

            # Calculate metrics
            data = {
                "symbol": symbol,
                "price": float(info.get("currentPrice", 0)),
                "change_percent": float(info.get("regularMarketChangePercent", 0)),
                "52_week_high": float(info.get("fiftyTwoWeekHigh", 0)),
                "52_week_low": float(info.get("fiftyTwoWeekLow", 0)),
                "market_cap": info.get("marketCap", 0),
                "pe_ratio": float(info.get("trailingPE", 0)) if info.get("trailingPE") else None,
                "dividend_yield": float(info.get("dividendYield", 0)) if info.get("dividendYield") else None,
                "last_updated": datetime.now().isoformat(),
            }

            # Cache the result
            self.cache[cache_key] = data
            self.cache_expiry[cache_key] = datetime.now() + timedelta(seconds=self.cache_duration)

            return data

        except Exception as e:
            logger.error(f"Error fetching stock data for {symbol}: {e}")
            return {}

    async def get_crypto_data(
        self, symbol: str
    ) -> Dict:
        """
        Fetch cryptocurrency data.
        
        Args:
            symbol: Crypto symbol with -USD suffix (e.g., "BTC-USD")
            
        Returns:
            Dictionary with crypto data
        """
        try:
            # Check cache
            cache_key = f"crypto_{symbol}"
            if self._is_cached(cache_key):
                return self.cache[cache_key]

            # Fetch data
            crypto = yf.Ticker(symbol)
            data_obj = crypto.history(period="1d")
            info = crypto.info

            if data_obj.empty:
                return {}

            data = {
                "symbol": symbol,
                "price": float(data_obj["Close"].iloc[-1]) if not data_obj.empty else 0,
                "high_24h": float(data_obj["High"].max()) if not data_obj.empty else 0,
                "low_24h": float(data_obj["Low"].min()) if not data_obj.empty else 0,
                "volume": float(data_obj["Volume"].iloc[-1]) if not data_obj.empty else 0,
                "last_updated": datetime.now().isoformat(),
            }

            # Cache the result
            self.cache[cache_key] = data
            self.cache_expiry[cache_key] = datetime.now() + timedelta(seconds=self.cache_duration)

            return data

        except Exception as e:
            logger.error(f"Error fetching crypto data for {symbol}: {e}")
            return {}

    async def get_forex_rate(
        self, from_currency: str, to_currency: str
    ) -> Dict:
        """
        Get forex exchange rate.
        
        Args:
            from_currency: Source currency (e.g. USD)
            to_currency: Target currency (e.g. EUR)
            
        Returns:
            Exchange rate data
        """
        try:
            # Check cache
            cache_key = f"forex_{from_currency}_{to_currency}"
            if self._is_cached(cache_key):
                return self.cache[cache_key]

            # Create currency pair symbol
            symbol = f"{from_currency}{to_currency}=X"
            currency = yf.Ticker(symbol)
            data_obj = currency.history(period="1d")

            if data_obj.empty:
                return {}

            data = {
                "from": from_currency,
                "to": to_currency,
                "rate": float(data_obj["Close"].iloc[-1]) if not data_obj.empty else 0,
                "last_updated": datetime.now().isoformat(),
            }

            # Cache the result
            self.cache[cache_key] = data
            self.cache_expiry[cache_key] = datetime.now() + timedelta(seconds=self.cache_duration)

            return data

        except Exception as e:
            logger.error(f"Error fetching forex rate {from_currency}/{to_currency}: {e}")
            return {}

    async def get_market_index(
        self, index_symbol: str
    ) -> Dict:
        """
        Get market index data (S&P 500, NASDAQ, etc).
        
        Args:
            index_symbol: Index symbol (^GSPC, ^IXIC, ^DJI)
            
        Returns:
            Index data
        """
        try:
            # Check cache
            cache_key = f"index_{index_symbol}"
            if self._is_cached(cache_key):
                return self.cache[cache_key]

            index = yf.Ticker(index_symbol)
            hist = index.history(period="1mo")

            if hist.empty:
                return {}

            # Calculate metrics
            current_price = hist["Close"].iloc[-1]
            prev_close = hist["Close"].iloc[0]
            change = ((current_price - prev_close) / prev_close * 100) if prev_close > 0 else 0

            data = {
                "symbol": index_symbol,
                "current": float(current_price),
                "change_percent": float(change),
                "high_52w": float(hist["High"].max()),
                "low_52w": float(hist["Low"].min()),
                "volume": float(hist["Volume"].iloc[-1]) if not hist.empty else 0,
                "last_updated": datetime.now().isoformat(),
            }

            # Cache the result
            self.cache[cache_key] = data
            self.cache_expiry[cache_key] = datetime.now() + timedelta(seconds=self.cache_duration)

            return data

        except Exception as e:
            logger.error(f"Error fetching index data for {index_symbol}: {e}")
            return {}

    async def get_portfolio_performance(
        self, symbols: list, weights: Dict[str, float]
    ) -> Dict:
        """
        Calculate portfolio performance based on holdings.
        
        Args:
            symbols: List of asset symbols
            weights: Dictionary of symbol -> weight
            
        Returns:
            Portfolio performance metrics
        """
        try:
            total_return = 0
            total_weight = sum(weights.values())

            for symbol in symbols:
                weight = weights.get(symbol, 0) / total_weight if total_weight > 0 else 0
                data = await self.get_stock_data(symbol, period="1y")
                
                if data and "change_percent" in data:
                    total_return += weight * data["change_percent"]

            return {
                "total_return_percent": float(total_return),
                "symbols": symbols,
                "last_updated": datetime.now().isoformat(),
            }

        except Exception as e:
            logger.error(f"Error calculating portfolio performance: {e}")
            return {}

    def _is_cached(self, key: str) -> bool:
        """Check if cache entry is still valid."""
        if key not in self.cache:
            return False

        expiry = self.cache_expiry.get(key)
        if expiry and datetime.now() > expiry:
            # Cache expired
            del self.cache[key]
            del self.cache_expiry[key]
            return False

        return True

    def clear_cache(self):
        """Clear all cached data."""
        self.cache.clear()
        self.cache_expiry.clear()
        logger.info("Market data cache cleared")
