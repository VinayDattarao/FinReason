"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const currencySymbol = (code) => {
  switch ((code || "USD").toUpperCase()) {
    case "INR":
      return "₹";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    default:
      return "$";
  }
};

export default function InsightsPage() {
  const [predictions, setPredictions] = useState({});
  const [anomalies, setAnomalies] = useState([]);
  const [goals, setGoals] = useState({});
  const [newGoal, setNewGoal] = useState("");
  const [newGoalAmount, setNewGoalAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accountCurrency, setAccountCurrency] = useState("USD");
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  // Load predictions and anomalies
  async function loadInsights() {
    setLoading(true);
    setError(null);
    try {
      const [predRes, anomRes, dashRes] = await Promise.all([
        fetch("/api/ml/predict-spending", { method: "POST" }),
        fetch("/api/ml/detect-anomalies", { method: "POST" }),
        fetch("/api/dashboard"),
      ]);

      if (dashRes.ok) {
        const dash = await dashRes.json();
        const acctList = dash?.data?.accounts || [];
        setAccounts(acctList);
        const def = acctList.find((a) => a.isDefault) || acctList[0];
        if (def) {
          setSelectedAccountId(def.id);
          if (def.currency) setAccountCurrency(def.currency);
        }
      }

      if (predRes.ok) {
        const pred = await predRes.json();
        setPredictions(pred.data?.predicted_spending || {});
      } else {
        setPredictions({ note: "Unable to load predictions" });
      }

      if (anomRes.ok) {
        const anom = await anomRes.json();
        setAnomalies(anom.data?.anomalies || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Load goals from localStorage
  useEffect(() => {
    loadInsights();
    const stored = localStorage.getItem("spending-goals");
    if (stored) {
      try {
        setGoals(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to parse goals:", err);
      }
    }
  }, []);

  // Save goals to localStorage
  function saveGoals(updated) {
    setGoals(updated);
    localStorage.setItem("spending-goals", JSON.stringify(updated));
  }

  function addGoal() {
    if (!newGoal || !newGoalAmount) return;
    const updated = { ...goals, [newGoal]: parseFloat(newGoalAmount) };
    saveGoals(updated);
    setNewGoal("");
    setNewGoalAmount("");
  }

  function removeGoal(category) {
    const updated = { ...goals };
    delete updated[category];
    saveGoals(updated);
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Smart Insights</h1>
        <div className="flex gap-3 items-center">
          <select
            className="border rounded px-3 py-2 text-sm"
            value={selectedAccountId}
            onChange={(e) => {
              const acct = accounts.find((a) => a.id === e.target.value);
              setSelectedAccountId(e.target.value);
              if (acct?.currency) setAccountCurrency(acct.currency);
            }}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency || "USD"})
              </option>
            ))}
          </select>
          <Button onClick={loadInsights} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      {error && <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>}

      {/* Spending Predictions */}
      <Card>
        <CardHeader>
          <CardTitle>Next 30 Days Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(predictions).length === 0 ? (
              <p className="text-gray-500">No prediction data available</p>
            ) : (
              Object.entries(predictions).map(([category, amount]) => (
                <div key={category} className="p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="text-sm font-semibold text-blue-900 capitalize">{category}</div>
                  <div className="text-lg font-bold text-blue-700">
                    {currencySymbol(accountCurrency)}
                    {Number(amount).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Anomaly Detection */}
      <Card>
        <CardHeader>
          <CardTitle>Unusual Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {anomalies.length === 0 ? (
            <p className="text-gray-500">No anomalies detected</p>
          ) : (
            <div className="space-y-2">
              {anomalies.map((anom, idx) => (
                <div key={idx} className="p-3 bg-orange-50 border border-orange-200 rounded">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-semibold text-orange-900">
                        {currencySymbol(accountCurrency)}
                        {Number(anom.amount).toFixed(2)}
                      </div>
                      <div className="text-sm text-orange-700">{anom.description || anom.category}</div>
                    </div>
                    <div className="text-right text-sm text-orange-600">{anom.reason || "Unusual amount"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spending Goals */}
      <Card>
        <CardHeader>
          <CardTitle>Spending Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(goals).map(([category, amount]) => (
              <div key={category} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <div className="font-semibold capitalize">{category}</div>
                  <div className="text-sm text-gray-600">
                    {currencySymbol(accountCurrency)}
                    {Number(amount).toFixed(2)} / month
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeGoal(category)}
                  className="text-red-600"
                >
                  Remove
                </Button>
              </div>
            ))}

            <div className="flex gap-2 mt-4">
              <Input
                placeholder="Category (e.g., groceries)"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
              />
              <Input
                placeholder="Amount"
                type="number"
                value={newGoalAmount}
                onChange={(e) => setNewGoalAmount(e.target.value)}
              />
              <Button onClick={addGoal}>Add Goal</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Smart Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-gray-700">• Track recurring subscriptions to reduce unnecessary spending</p>
          <p className="text-sm text-gray-700">• Set category goals and monitor progress with predictions</p>
          <p className="text-sm text-gray-700">• Review anomalies weekly to catch unusual expenses early</p>
          <p className="text-sm text-gray-700">• CSV import lets you bulk-load historical transactions for better predictions</p>
        </CardContent>
      </Card>
    </div>
  );
}
