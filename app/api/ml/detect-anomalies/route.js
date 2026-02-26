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

    // Fetch last 3 months of transactions
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        type: "EXPENSE",
        date: { gte: threeMonthsAgo },
      },
      select: {
        id: true,
        amount: true,
        date: true,
        category: true,
        description: true,
      },
      orderBy: { date: "desc" },
    });

    if (transactions.length < 10) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            anomalies: [],
            count: 0,
            message: "Insufficient transaction history for anomaly detection",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Prepare data for Python script
    const txData = transactions.map((tx) => ({
      id: tx.id,
      amount: parseFloat(tx.amount.toString()),
      category: tx.category || "other",
      date: new Date(tx.date).toISOString().split("T")[0],
      description: tx.description || "",
    }));

    // Call Python anomaly detector script
    const mlPath = path.join(process.cwd(), "ml_models");
    const pythonScript = `
import sys
sys.path.insert(0, '${mlPath}')
import json
from predictor import AnomalyDetector
detector = AnomalyDetector()
result = detector.detect_anomalies(${JSON.stringify(txData)})
print(json.dumps(result))
`;

    try {
      const { stdout } = await execPromise(`python -c "${pythonScript}"`, {
        timeout: 10000,
        maxBuffer: 10 * 1024 * 1024,
      });

      const anomalies = JSON.parse(stdout);

      return new Response(
        JSON.stringify({ success: true, data: anomalies }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (pythonErr) {
      console.error("Python execution error:", pythonErr);

      // Fallback: Simple Z-score detection in JavaScript
      const amounts = transactions.map((t) => parseFloat(t.amount.toString()));
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const stdDev = Math.sqrt(
        amounts.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / amounts.length
      );

      const anomalies = transactions
        .filter((tx) => {
          const zScore = Math.abs((parseFloat(tx.amount.toString()) - mean) / (stdDev || 1));
          return zScore > 2.5;
        })
        .map((tx) => ({
          id: tx.id,
          amount: parseFloat(tx.amount.toString()),
          category: tx.category,
          date: tx.date,
          description: tx.description,
          reason: "Unusually high spending for this category",
        }));

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            anomalies,
            count: anomalies.length,
            source: "fallback_zscore",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Anomaly detection API error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

