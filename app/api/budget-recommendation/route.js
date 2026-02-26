import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { checkUser } from "@/lib/checkUser";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

function buildFallbackRecommendation({
  budgetLimit,
  lookbackMonths,
  spendingByCategory,
  avgMonthlySpending,
  totalSpending,
}) {
  // Seed category budgets either from history (+10%) or defaults, then normalize to budgetLimit
  let draft = spendingByCategory && Object.keys(spendingByCategory).length
    ? Object.fromEntries(
        Object.entries(spendingByCategory).map(([cat, amt]) => [
          cat,
          Math.max(0, Math.round((amt / Math.max(lookbackMonths, 1)) * 1.1)),
        ])
      )
    : {
        groceries: Math.round(budgetLimit * 0.25),
        food: Math.round(budgetLimit * 0.15),
        transportation: Math.round(budgetLimit * 0.15),
        shopping: Math.round(budgetLimit * 0.15),
        entertainment: Math.round(budgetLimit * 0.1),
        utilities: Math.round(budgetLimit * 0.1),
        "other-expense": Math.round(budgetLimit * 0.1),
      };

  const sum = Object.values(draft).reduce((a, b) => a + b, 0) || 1;
  if (sum > 0) {
    draft = Object.fromEntries(
      Object.entries(draft).map(([cat, val]) => [
        cat,
        Math.round((val / sum) * budgetLimit),
      ])
    );
  }

  return {
    success: true,
    data: {
      spendingByCategory: spendingByCategory || {},
      totalSpending: totalSpending ?? 0,
      avgMonthlySpending: Math.round((avgMonthlySpending ?? 0) * 100) / 100,
      monthCount: lookbackMonths,
      recommendation: {
        suggestedBudget: budgetLimit,
        categoryBudgets: defaultBreakdown,
        message: "AI unavailable; using fallback recommendation.",
        alerts: [],
        savings_opportunity: Math.round(budgetLimit - (avgMonthlySpending ?? 0)),
        spending_tips: [
          "Track recurring subscriptions for quick savings.",
          "Set category caps and review weekly.",
          "Shift discretionary spend into a savings rule.",
        ],
      },
    },
  };
}

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

    const user = await checkUser();
    if (!user) return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: { "Content-Type": "application/json" } });

    const { budgetLimit = 5000, lookbackMonths = 3, accountId } = await req.json();

    // Fetch transactions from last N months (optionally scoped to an account)
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - lookbackMonths);

    const whereClause = {
      userId: user.id,
      type: "EXPENSE",
      date: { gte: startDate },
    };
    if (accountId) whereClause.accountId = accountId;

    const transactions = await db.transaction.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
    });

    if (!transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify(
          buildFallbackRecommendation({
            budgetLimit,
            lookbackMonths,
            spendingByCategory: {},
            avgMonthlySpending: 0,
            totalSpending: 0,
          })
        ),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Aggregate spending by category
    const spendingByCategory = {};
    const monthlyData = {};
    let totalSpending = 0;

    transactions.forEach((tx) => {
      const cat = tx.category || "other-expense";
      const amount = parseFloat(tx.amount.toString());
      spendingByCategory[cat] = (spendingByCategory[cat] || 0) + amount;
      totalSpending += amount;

      const month = new Date(tx.date).toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyData[month]) monthlyData[month] = {};
      monthlyData[month][cat] = (monthlyData[month][cat] || 0) + amount;
    });

    const avgMonthlySpending = totalSpending / lookbackMonths;

    // Build context for Gemini
    const spendingContext = Object.entries(spendingByCategory)
      .map(([cat, amt]) => `- ${cat}: $${amt.toFixed(2)} (avg ${(amt / lookbackMonths).toFixed(2)}/month)`)
      .join("\n");

    const prompt = `You are a financial advisor. Analyze this spending data and suggest a monthly budget breakdown:

SPENDING HISTORY (last ${lookbackMonths} months):
${spendingContext}

Total Spending: $${totalSpending.toFixed(2)}
Average Monthly: $${avgMonthlySpending.toFixed(2)}
Suggested Budget Limit: $${budgetLimit}

Generate a JSON response with:
1. categoryBudgets: object with category keys and suggested monthly budget values
2. message: short personalized advice (1 sentence)
3. alerts: array of spending alerts ["category: concern"]
4. savings_opportunity: estimated monthly savings possible
5. spending_tips: array of 2-3 actionable tips

Ensure budgets don't exceed the total limit. Start categories at their average + 10% buffer.`;

    // If no API key, return fallback immediately
    if (!genAI) {
      const fallback = buildFallbackRecommendation({
        budgetLimit,
        lookbackMonths,
        spendingByCategory,
        avgMonthlySpending,
        totalSpending,
      });
      return new Response(JSON.stringify(fallback), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" },
      });

      const response = await model.generateContent(prompt);
      let responseText = response.response.text();
      responseText = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      let recommendation;
      try {
        recommendation = JSON.parse(responseText);
      } catch (e) {
        console.warn("Failed to parse Gemini response, using defaults");
        recommendation = null;
      }

      if (!recommendation) {
        const fallback = buildFallbackRecommendation({
          budgetLimit,
          lookbackMonths,
          spendingByCategory,
          avgMonthlySpending,
          totalSpending,
        });
        return new Response(JSON.stringify(fallback), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            spendingByCategory,
            totalSpending,
            avgMonthlySpending: Math.round(avgMonthlySpending * 100) / 100,
            monthCount: lookbackMonths,
            recommendation: {
              suggestedBudget: budgetLimit,
              ...recommendation,
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (modelErr) {
      console.error("Gemini generation error:", modelErr);
      const fallback = buildFallbackRecommendation({
        budgetLimit,
        lookbackMonths,
        spendingByCategory,
        avgMonthlySpending,
        totalSpending,
      });
      return new Response(JSON.stringify(fallback), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
