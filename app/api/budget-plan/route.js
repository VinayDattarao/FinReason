import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { checkUser } from "@/lib/checkUser";
import { getBudgetRecommendation, getMonthlySpendingTrend, getCategoryBudgetStatus, getNextMonthForecast } from "@/actions/budget";

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const user = await checkUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    const { budgetLimit = 0, accountId } = await req.json();
    const cookieHeader = req.headers.get("cookie") || undefined;

    // Run the four pieces in parallel on the server, passing along optionally scoped accountId
    const budget = await db.budget.findFirst({ where: { userId: user.id } });
    const effectiveLimit =
      Number(budgetLimit) > 0
        ? Number(budgetLimit)
        : budget?.amount?.toNumber?.() ?? 0;

    const [recommendation, monthlyTrend, categoryStatus, nextMonthForecast] =
      await Promise.all([
        getBudgetRecommendation(effectiveLimit, 3, cookieHeader, accountId),
        getMonthlySpendingTrend(accountId),
        getCategoryBudgetStatus(effectiveLimit, accountId),
        getNextMonthForecast(accountId),
      ]);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          recommendation:
            recommendation?.data?.recommendation ||
            recommendation?.recommendation ||
            recommendation?.data ||
            recommendation,
          monthlyTrend: monthlyTrend?.data || monthlyTrend,
          categoryStatus: categoryStatus?.data || categoryStatus,
          nextMonthForecast: nextMonthForecast?.data || nextMonthForecast,
          budget: budget ? { ...budget, amount: budget.amount.toNumber() } : null,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Budget plan API error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
