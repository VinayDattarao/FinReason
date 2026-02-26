"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { checkUser } from "@/lib/checkUser";

export async function getCurrentBudget(accountId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await checkUser();
    if (!user) {
      throw new Error("User not found");
    }

    const budget = await db.budget.findFirst({
      where: {
        userId: user.id,
      },
    });

    // Get current month's expenses
    // Look back 6 months so recent statements (e.g., last month) are counted
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const expenses = await db.transaction.aggregate({
      where: {
        userId: user.id,
        type: "EXPENSE",
        date: {
          gte: sixMonthsAgo,
        },
        accountId,
      },
      _sum: {
        amount: true,
      },
    });

    return {
      budget: budget ? { ...budget, amount: budget.amount.toNumber() } : null,
      currentExpenses: expenses._sum.amount
        ? expenses._sum.amount.toNumber()
        : 0,
    };
  } catch (error) {
    console.error("Error fetching budget:", error);
    throw error;
  }
}

export async function updateBudget(amount) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await checkUser();
    if (!user) throw new Error("User not found");

    // Update or create budget
    const budget = await db.budget.upsert({
      where: {
        userId: user.id,
      },
      update: {
        amount,
      },
      create: {
        userId: user.id,
        amount,
      },
    });

    revalidatePath("/dashboard");
    return {
      success: true,
      data: { ...budget, amount: budget.amount.toNumber() },
    };
  } catch (error) {
    console.error("Error updating budget:", error);
    return { success: false, error: error.message };
  }
}

// AI-powered budget recommendation based on spending patterns
export async function getBudgetRecommendation(
  budgetLimit = 5000,
  lookbackMonths = 3,
  cookieHeader,
  accountId
) {
  const fallback = () => ({
    success: true,
    data: {
      spendingByCategory: {},
      totalSpending: 0,
      avgMonthlySpending: 0,
      monthCount: lookbackMonths,
      recommendation: {
        suggestedBudget: budgetLimit,
        categoryBudgets: {
          groceries: Math.round(budgetLimit * 0.25),
          food: Math.round(budgetLimit * 0.15),
          transportation: Math.round(budgetLimit * 0.15),
          shopping: Math.round(budgetLimit * 0.15),
          entertainment: Math.round(budgetLimit * 0.1),
          utilities: Math.round(budgetLimit * 0.1),
          "other-expense": Math.round(budgetLimit * 0.1),
        },
        message: "Suggested budget based on your recent spending.",
        alerts: [],
        savings_opportunity: budgetLimit,
        spending_tips: [
          "Audit subscriptions monthly.",
          "Cap discretionary spend weekly.",
          "Automate a fixed savings transfer.",
        ],
      },
    },
  });

  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await checkUser();
    if (!user) throw new Error("User not found");

    // prefer explicit header passed in; do not call `headers()` to avoid dynamic
  // server usage during static generation. budget-plan route always provides
  // the cookie string when invoking this helper.
  const cookie = cookieHeader || undefined;

    // forward accountId so the recommendation service can narrow transactions
    const response = await fetch(`http://localhost:3000/api/budget-recommendation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ budgetLimit, lookbackMonths, accountId }),
    });

    if (!response.ok) {
      console.error("Budget recommendation API returned non-OK status:", response.status);
      return fallback();
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching recommendation:", error);
    return fallback();
  }
}

// Get 6-month spending trend
export async function getMonthlySpendingTrend(accountId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await checkUser();
    if (!user) throw new Error("User not found");

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const whereClause = {
      userId: user.id,
      type: "EXPENSE",
      date: { gte: sixMonthsAgo },
    };
    if (accountId) {
      whereClause.accountId = accountId;
    }

    const transactions = await db.transaction.findMany({
      where: whereClause,
      orderBy: { date: "asc" },
    });

    const monthlyTrend = {};
    transactions.forEach((tx) => {
      const month = new Date(tx.date).toISOString().slice(0, 7);
      monthlyTrend[month] = (monthlyTrend[month] || 0) + parseFloat(tx.amount.toString());
    });

    return { success: true, data: monthlyTrend };
  } catch (error) {
    console.error("Error fetching spending trend:", error);
    return { success: false, error: error.message };
  }
}

// Get current month's budget status by category
export async function getCategoryBudgetStatus(budgetLimit, accountId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await checkUser();
    if (!user) throw new Error("User not found");

    // Use the same 6‑month window as the dashboard budget so recent imports count
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const whereClause = {
        userId: user.id,
        type: "EXPENSE",
        date: { gte: sixMonthsAgo },
      };
    if (accountId) whereClause.accountId = accountId;

    const thisMonthTransactions = await db.transaction.findMany({
      where: whereClause,
    });

    const categorySpending = {};
    let totalSpending = 0;
    thisMonthTransactions.forEach((tx) => {
      const cat = tx.category || "other-expense";
      categorySpending[cat] = (categorySpending[cat] || 0) + parseFloat(tx.amount.toString());
      totalSpending += parseFloat(tx.amount.toString());
    });

    // if no budget limit set, show a full bar if there is any spending
    const budgetUsagePercent = budgetLimit > 0
      ? Math.round((totalSpending / budgetLimit) * 100)
      : totalSpending > 0
      ? 100
      : 0;
    const isOverBudget = budgetLimit > 0 ? totalSpending > budgetLimit : false;

    return {
      success: true,
      data: {
        categorySpending,
        totalSpending,
        budgetLimit,
        budgetUsagePercent,
        isOverBudget,
        amountRemaining: Math.max(0, budgetLimit - totalSpending),
      },
    };
  } catch (error) {
    console.error("Error fetching category status:", error);
    return { success: false, error: error.message };
  }
}

// Get AI spending forecast for next month
export async function getNextMonthForecast(accountId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await checkUser();
    if (!user) throw new Error("User not found");

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const whereClause = {
        userId: user.id,
        type: "EXPENSE",
        date: { gte: sixMonthsAgo },
      };
    if (accountId) whereClause.accountId = accountId;

    const pastTransactions = await db.transaction.findMany({
      where: whereClause,
    });

    // Group by category and month
    const monthlyByCategory = {};
    pastTransactions.forEach((tx) => {
      const month = new Date(tx.date).toISOString().slice(0, 7);
      const cat = tx.category || "other-expense";
      if (!monthlyByCategory[cat]) monthlyByCategory[cat] = {};
      monthlyByCategory[cat][month] = (monthlyByCategory[cat][month] || 0) + parseFloat(tx.amount.toString());
    });

    const forecast = {};
    Object.entries(monthlyByCategory).forEach(([cat, months]) => {
      const values = Object.values(months).map((v) => parseFloat(v) || 0);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const trend = values.length > 1 ? (values[values.length - 1] - values[0]) / values.length : 0;
      forecast[cat] = Math.round((avg + trend) * 100) / 100;
    });

    return { success: true, data: forecast };
  } catch (error) {
    console.error("Error fetching forecast:", error);
    return { success: false, error: error.message };
  }
}
