"use client";

import { useState, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateBudget } from "@/actions/budget";

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

const STORAGE_KEY = "account-budgets";

export function BudgetProgress({ initialBudget, currentExpenses, currency = "USD", accountId }) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeBudget, setActiveBudget] = useState(initialBudget);
  const [newBudget, setNewBudget] = useState(initialBudget?.amount?.toString() || "");
  const [hydrated, setHydrated] = useState(false);

  const { loading: isLoading, fn: updateBudgetFn, error } = useFetch(updateBudget);

  // Load stored budget for this account, or seed from initialBudget
  useEffect(() => {
    if (!accountId) {
      setActiveBudget(initialBudget);
      setNewBudget(initialBudget?.amount?.toString() || "");
      setHydrated(true);
      return;
    }
    try {
      const store = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const saved = store[accountId];
      if (saved) {
        setActiveBudget(saved);
        setNewBudget(saved.amount?.toString() || "");
      } else if (initialBudget) {
        const seed = { ...initialBudget, manual: false };
        store[accountId] = seed;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
        setActiveBudget(seed);
        setNewBudget(seed.amount?.toString() || "");
      } else {
        setActiveBudget(null);
        setNewBudget("");
      }
      setHydrated(true);
    } catch {
      setActiveBudget(initialBudget);
      setNewBudget(initialBudget?.amount?.toString() || "");
      setHydrated(true);
    }
  }, [accountId, initialBudget, currency]);

  const percentUsed = activeBudget
    ? activeBudget.amount > 0
      ? (currentExpenses / activeBudget.amount) * 100
      : currentExpenses > 0
      ? 100
      : 0
    : 0;

  const handleUpdateBudget = async () => {
    const amount = parseFloat(newBudget);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    await updateBudgetFn(amount); // keep server call for compatibility
    if (accountId) {
      const store = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      store[accountId] = { amount, currency, manual: true };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }
    setActiveBudget({ amount, currency, manual: true });
    setIsEditing(false);
    toast.success("Budget updated successfully");
  };

  const handleCancel = () => {
    setNewBudget(activeBudget?.amount?.toString() || "");
    setIsEditing(false);
  };

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to update budget");
    }
  }, [error]);

  return (
    hydrated && (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex-1">
          <CardTitle className="text-sm font-medium">
            Monthly Budget (Default Account)
          </CardTitle>
          <div className="flex items-center gap-2 mt-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  className="w-32"
                  placeholder="Enter amount"
                  autoFocus
                  disabled={isLoading}
                />
                <Button variant="ghost" size="icon" onClick={handleUpdateBudget} disabled={isLoading}>
                  <Check className="h-4 w-4 text-green-500" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCancel} disabled={isLoading}>
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ) : (
              <>
                <CardDescription>
                  {activeBudget
                    ? activeBudget.amount > 0
                      ? `${currencySymbol(activeBudget.currency || currency)}${currentExpenses.toFixed(2)} of ${currencySymbol(activeBudget.currency || currency)}${activeBudget.amount.toFixed(2)} spent`
                      : `${currencySymbol(activeBudget.currency || currency)}${currentExpenses.toFixed(2)} spent` // no budget limit
                    : "No budget set"}
                </CardDescription>
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-6 w-6">
                  <Pencil className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activeBudget && (
          <div className="space-y-2">
            <Progress
              value={percentUsed}
              extraStyles={`${
                percentUsed >= 90
                  ? "bg-red-500"
                  : percentUsed >= 75
                    ? "bg-yellow-500"
                    : "bg-green-500"
              }`}
            />
            <p className="text-xs text-muted-foreground text-right">
              {percentUsed.toFixed(1)}% used
            </p>
          </div>
        )}
      </CardContent>
    </Card>
    )
  );
}
