"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { updateBudget } from "@/actions/budget";

const categoryIcons = {
  groceries: "🛒",
  food: "🍕",
  transportation: "🚌",
  housing: "🏠",
  subscription: "📺",
  shopping: "🛍️",
  entertainment: "🎬",
  utilities: "⚡",
  "other-expense": "💳",
};

export default function BudgetPlanPage() {
  const [budgetLimit, setBudgetLimit] = useState(0);
  const [currentInput, setCurrentInput] = useState("0");
  const [loading, setLoading] = useState(true);
  const [recommendation, setRecommendation] = useState(null);
  const [monthlyTrend, setMonthlyTrend] = useState(null);
  const [categoryStatus, setCategoryStatus] = useState(null);
  const [nextMonthForecast, setNextMonthForecast] = useState(null);
  const [accountCurrency, setAccountCurrency] = useState("INR");
  const [defaultAccountId, setDefaultAccountId] = useState(null);

  const currencySymbol = (code) => {
    switch ((code || "INR").toUpperCase()) {
      case "INR":
        return "₹";
      case "EUR":
        return "€";
      case "GBP":
        return "£";
      case "USD":
      default:
        return "$";
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let defaultAccountId;
        let localBudget = 0;

        // pick default account + its balance/currency
        const dashRes = await fetch("/api/dashboard");
        if (dashRes.ok) {
          const dash = await dashRes.json();
          const acctList = dash?.data?.accounts || [];
          const def = acctList.find((a) => a.isDefault) || acctList[0];
          if (def?.currency) setAccountCurrency(def.currency);
          defaultAccountId = def?.id;
          setDefaultAccountId(def?.id || null);

          // read per-account budget saved by dashboard (localStorage key: account-budgets)
          if (typeof window !== "undefined" && def?.id) {
            try {
              const stored = JSON.parse(
                window.localStorage.getItem("account-budgets") || "{}"
              );
              const saved = stored[def.id];
              if (saved?.amount) {
                localBudget = Number(saved.amount);
              }
            } catch (e) {
              // ignore parse errors
            }
          }
        }

        const res = await fetch("/api/budget-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            budgetLimit: localBudget || 0,
            accountId: defaultAccountId,
          }),
        });
        if (!res.ok) {
          throw new Error("Failed to fetch budget data");
        }
        const json = await res.json();
        const data = json.data || {};

        setRecommendation(data.recommendation);
        setMonthlyTrend(data.monthlyTrend);
        setCategoryStatus(data.categoryStatus);
        setNextMonthForecast(data.nextMonthForecast);
        const resolvedBudget =
          localBudget || (data.budget?.amount ? Number(data.budget.amount) : 0);
        setBudgetLimit(resolvedBudget);
        setCurrentInput(String(resolvedBudget));
      } catch (err) {
        toast.error("Failed to load budget data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  async function handleSaveBudget() {
    try {
      const newLimit = parseFloat(currentInput);
      if (isNaN(newLimit) || newLimit <= 0) {
        toast.error("Please enter a valid budget amount");
        return;
      }
      await updateBudget(newLimit);
      setBudgetLimit(newLimit);

       // persist per-account budget locally so dashboard and budget plan stay in sync
      if (typeof window !== "undefined" && defaultAccountId) {
        try {
          const stored = JSON.parse(
            window.localStorage.getItem("account-budgets") || "{}"
          );
          stored[defaultAccountId] = {
            amount: newLimit,
            manual: true,
          };
          window.localStorage.setItem(
            "account-budgets",
            JSON.stringify(stored)
          );
        } catch (e) {
          // ignore localStorage errors
        }
      }

      toast.success("Budget saved successfully");
    } catch (err) {
      toast.error("Failed to save budget");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  const safeCategoryStatus = categoryStatus
    ? {
        totalSpending: Number(categoryStatus.totalSpending ?? 0),
        amountRemaining: Number(categoryStatus.amountRemaining ?? 0),
        budgetUsagePercent: Number(categoryStatus.budgetUsagePercent ?? 0),
        isOverBudget: Boolean(categoryStatus.isOverBudget),
        categorySpending: categoryStatus.categorySpending || {},
      }
    : null;

  return (
    <div className="max-w-6xl mx-auto px-5 py-8 space-y-8">
      <h1 className="text-4xl gradient-title mb-8">Smart Budget Planning</h1>

      {/* Budget Limit Setup */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle>Set Your Monthly Budget</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <input
              type="number"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              placeholder="Enter monthly budget"
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <Button onClick={handleSaveBudget}>Save Budget</Button>
          </div>
          <p className="text-sm text-gray-600">
            Current Budget Limit: <strong>{currencySymbol(accountCurrency)}{Number(budgetLimit).toLocaleString()}</strong>
          </p>
        </CardContent>
      </Card>

      {/* Current Month Status */}
      {safeCategoryStatus && (
        <Card>
          <CardHeader>
            <CardTitle>This Month&apos;s Spending Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total Spent</span>
                <span className="text-2xl font-bold text-blue-600">
                  {currencySymbol(accountCurrency)}
                  {safeCategoryStatus.totalSpending.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full ${
                    safeCategoryStatus.isOverBudget ? "bg-red-500" : "bg-green-500"
                  }`}
                  style={{
                    width: `${Math.min(safeCategoryStatus.budgetUsagePercent, 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span>{safeCategoryStatus.budgetUsagePercent}% used</span>
                <span>
                  {safeCategoryStatus.isOverBudget ? (
                    <span className="text-red-600 font-semibold">
                      {currencySymbol(accountCurrency)}
                      {Math.abs(safeCategoryStatus.amountRemaining).toFixed(2)} over
                    </span>
                  ) : (
                    <span className="text-green-600 font-semibold">
                      {currencySymbol(accountCurrency)}
                      {safeCategoryStatus.amountRemaining.toFixed(2)} remaining
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
              {Object.entries(safeCategoryStatus.categorySpending).map(([cat, amount]) => (
                <div
                  key={cat}
                  className="p-4 bg-gray-50 rounded-lg text-center hover:bg-gray-100 transition"
                >
                  <div className="text-2xl mb-2">{categoryIcons[cat] || "💰"}</div>
                  <div className="text-sm font-semibold capitalize">{cat}</div>
                  <div className="text-lg font-bold text-blue-600">
                    {currencySymbol(accountCurrency)}
                    {amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Recommendation */}
      {recommendation && (
        <Card className="bg-gradient-to-r from-green-50 to-teal-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="text-green-600" />
              Budget Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-white bg-opacity-60 rounded-lg border-l-4 border-green-600">
              <p className="text-lg font-semibold text-gray-800">
                {recommendation.message}
              </p>
            </div>

            {/* Suggested Category Budgets */}
            <div>
              <h3 className="font-semibold mb-4 text-gray-700">Recommended Monthly Budget by Category</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(recommendation.categoryBudgets || {}).map(
                  ([cat, budget]) => (
                    <div key={cat} className="p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition">
                      <div className="text-center">
                        <div className="text-xl mb-1">{categoryIcons[cat] || "💰"}</div>
                        <div className="text-xs font-semibold capitalize text-gray-600">
                          {cat}
                        </div>
                        <div className="text-lg font-bold text-green-600">
                          {currencySymbol(accountCurrency)}{budget.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Savings Opportunity */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <TrendingUp className="text-blue-600 mt-1" />
                <div>
                  <p className="font-semibold text-blue-900">Savings Opportunity</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {currencySymbol(accountCurrency)}{(recommendation.savings_opportunity || 0).toLocaleString()}/month
                  </p>
                </div>
              </div>
            </div>

            {/* Spending Tips */}
            {recommendation.spending_tips && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-700">Money-Saving Tips</h3>
                {recommendation.spending_tips.map((tip, idx) => (
                  <div key={idx} className="flex gap-2 p-3 bg-white rounded-lg">
                    <span className="text-lg">💡</span>
                    <p className="text-sm text-gray-700">{tip}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Alerts */}
            {recommendation.alerts && recommendation.alerts.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle size={18} />
                  Budget Alerts
                </h3>
                {recommendation.alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="flex gap-2 p-3 bg-red-50 rounded-lg border border-red-200"
                  >
                    <span className="text-lg">⚠️</span>
                    <p className="text-sm text-red-700">{alert}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Next Month Forecast */}
      {nextMonthForecast && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="text-purple-600" />
              Predicted Spending - Next Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(nextMonthForecast).map(([cat, forecast]) => (
                <div key={cat} className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl mb-1">{categoryIcons[cat] || "💰"}</div>
                    <div className="text-xs font-semibold capitalize text-gray-600">
                      {cat}
                    </div>
                    <div className="text-lg font-bold text-purple-600">
                      {currencySymbol(accountCurrency)}{forecast.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-4">
              Based on your last 6 months of spending patterns and trends
            </p>
          </CardContent>
        </Card>
      )}

      {/* Monthly Trend Chart */}
      {monthlyTrend && (
        <Card>
          <CardHeader>
            <CardTitle>6-Month Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(monthlyTrend)
                .sort()
                .slice(-6)
                .map(([month, amount]) => (
                  <div key={month} className="flex items-center gap-4">
                    <span className="w-16 text-sm font-semibold text-gray-600">
                      {month}
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-full flex items-center justify-end pr-2"
                        style={{
                          width: `${(amount / Math.max(...Object.values(monthlyTrend))) * 100}%`,
                        }}
                      >
                        <span className="text-xs font-bold text-white">
                          {currencySymbol(accountCurrency)}{amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
