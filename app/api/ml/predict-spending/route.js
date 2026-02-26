import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { checkUser } from "@/lib/checkUser";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execPromise = promisify(exec);

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await checkUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch last 6 months of transactions
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        type: "EXPENSE",
        date: { gte: sixMonthsAgo },
      },
      select: {
        amount: true,
        date: true,
        category: true,
      },
    });

    if (transactions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            predicted_spending: {},
            confidence: {},
            message: "Insufficient transaction history",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Prepare data for Python script
    const txData = transactions.map((tx) => ({
      amount: parseFloat(tx.amount.toString()),
      category: tx.category || "other",
      date: new Date(tx.date).toISOString().split("T")[0],
    }));

    // Call Python predictor script
    const mlPath = path.join(process.cwd(), "ml_models");
    const pythonScript = `
import sys
sys.path.insert(0, '${mlPath}')
import json
from predictor import SpendingPredictor
predictor = SpendingPredictor()
result = predictor.predict_spending(${JSON.stringify(txData)})
print(json.dumps(result))
`;

    try {
      const { stdout } = await execPromise(`python -c "${pythonScript}"`, {
        timeout: 10000,
        maxBuffer: 10 * 1024 * 1024,
      });
      
      const predictions = JSON.parse(stdout);
      
      return new Response(
        JSON.stringify({ success: true, data: predictions }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (pythonErr) {
      console.error("Python execution error:", pythonErr);
      
      // Fallback: Simple averaging if Python fails
      const categoryData = {};
      transactions.forEach((tx) => {
        const cat = tx.category || "other";
        if (!categoryData[cat]) categoryData[cat] = [];
        categoryData[cat].push(parseFloat(tx.amount.toString()));
      });

      const predictions = {};
      const confidence = {};
      
      Object.entries(categoryData).forEach(([cat, amounts]) => {
        predictions[cat] = Math.round((amounts.reduce((a, b) => a + b, 0) / amounts.length) * 100) / 100;
        confidence[cat] = Math.min(0.9, Math.max(0.5, 1 - (Math.sqrt(amounts.reduce((a, b) => a + (b - predictions[cat]) ** 2, 0) / amounts.length) / (predictions[cat] || 1)) * 0.2));
      });

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            predicted_spending: predictions,
            confidence,
            source: "fallback_averaging",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Prediction API error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

