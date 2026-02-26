"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";
import aj from "@/lib/arcjet";
import { request } from "@arcjet/next";
import { checkUser } from "@/lib/checkUser";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const serializeAmount = (obj) => ({
  ...obj,
  amount: obj.amount.toNumber(),
});

const sanitizeDescription = (input) => {
  if (!input) return "Transaction";
  const cleaned = String(input)
    .replace(/[^A-Za-z0-9 .,&'()\\/:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length >= 3 ? cleaned.slice(0, 255) : "Transaction";
};

const sanitizeCounterparty = (input) => {
  if (!input) return null;
  const cleaned = String(input)
    .replace(/[^A-Za-z0-9 .,&'()\\/:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length >= 2 ? cleaned.slice(0, 120) : null;
};

// Create Transaction
export async function createTransaction(data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Get request data for ArcJet
    const req = await request();

    // Check rate limit
    const decision = await aj.protect(req, {
      userId,
      requested: 1, // Specify how many tokens to consume
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        const { remaining, reset } = decision.reason;
        console.error({
          code: "RATE_LIMIT_EXCEEDED",
          details: {
            remaining,
            resetInSeconds: reset,
          },
        });

        throw new Error("Too many requests. Please try again later.");
      }

      throw new Error("Request blocked");
    }

    const user = await checkUser();
    if (!user) {
      throw new Error("User not found");
    }

    const account = await db.account.findUnique({
      where: {
        id: data.accountId,
        userId: user.id,
      },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    const description = sanitizeDescription(data.description);
    const counterparty =
      sanitizeCounterparty(data.counterparty) ||
      sanitizeCounterparty(data.description);

    // Calculate new balance
    const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
    const newBalance = account.balance.toNumber() + balanceChange;

    // Create transaction and update account balance
    const transaction = await db.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          ...data,
          description,
          counterparty,
          userId: user.id,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      await tx.account.update({
        where: { id: data.accountId },
        data: { balance: newBalance },
      });

      return newTransaction;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${transaction.accountId}`);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getTransaction(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await checkUser();
  if (!user) throw new Error("User not found");

  const transaction = await db.transaction.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!transaction) throw new Error("Transaction not found");

  return serializeAmount(transaction);
}

export async function updateTransaction(id, data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await checkUser();
    if (!user) throw new Error("User not found");

    // Get original transaction to calculate balance change
    const originalTransaction = await db.transaction.findUnique({
      where: {
        id,
        userId: user.id,
      },
      include: {
        account: true,
      },
    });

    if (!originalTransaction) throw new Error("Transaction not found");

    // Calculate balance changes
    const oldBalanceChange =
      originalTransaction.type === "EXPENSE"
        ? -originalTransaction.amount.toNumber()
        : originalTransaction.amount.toNumber();

    const newBalanceChange =
      data.type === "EXPENSE" ? -data.amount : data.amount;

    const netBalanceChange = newBalanceChange - oldBalanceChange;

    // Update transaction and account balance in a transaction
    const transaction = await db.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: {
          id,
          userId: user.id,
        },
        data: {
          ...data,
          description: sanitizeDescription(data.description),
          counterparty:
            sanitizeCounterparty(data.counterparty) ||
            sanitizeCounterparty(data.description),
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      // Update account balance
      await tx.account.update({
        where: { id: data.accountId },
        data: {
          balance: {
            increment: netBalanceChange,
          },
        },
      });

      return updated;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${data.accountId}`);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    throw new Error(error.message);
  }
}

// Get User Transactions
export async function getUserTransactions(query = {}) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await checkUser();
    if (!user) {
      throw new Error("User not found");
    }

    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        ...query,
      },
      include: {
        account: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    return { success: true, data: transactions };
  } catch (error) {
    throw new Error(error.message);
  }
}

// Scan Receipt using FAST OpenAI Vision API (2-3 seconds)
export async function scanReceipt(file) {
  try {
    console.log("⚡ [RECEIPT SCANNER] Starting scan...");
    
    if (!file || !file.type.startsWith("image/")) {
      throw new Error("Please provide a valid image file.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64String = Buffer.from(arrayBuffer).toString("base64");
    const mediaType = file.type === "image/jpeg" ? "image/jpeg" : "image/png";

    // Use Gemini Vision API
    console.log("📤 [GEMINI] Sending to Gemini Vision API (gemini-1.5-flash)...");
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });
    const response = await model.generateContent([
      {
        inlineData: {
          data: base64String,
          mimeType: mediaType,
        },
      },
      {
        text: `TASK: Extract receipt data from the image into a valid JSON object.

CRITICAL INSTRUCTIONS FOR AMOUNT:
1. Look for the absolute final total, often labeled as "Total", "Grand Total", "Amount Due", "Net Amount", or similar.
2. Carefully check for amounts in Rupees (Rs) or Dollars ($).
3. Extract ONLY the numeric value - do NOT include currency symbols like $, Rs, ₹, €, £ or commas.
4. If there are multiple totals (e.g. Subtotal vs Total), use the LARGEST final amount.
5. The "amount" field MUST be a pure number (e.g., 1797.10), NOT a string.

OTHER FIELDS:
- "date": Date of the receipt in YYYY-MM-DD format. If not found, use today's date.
- "merchantName": Name of the business/store/restaurant at the top of the receipt.

RESPOND ONLY WITH A VALID JSON OBJECT WITH THESE 3 KEYS: "amount" (number), "date" (string), "merchantName" (string).`,
      },
    ]);

    let responseText = response.response.text();
    console.log("✅ [GEMINI] Got response");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("📥 [GEMINI] RAW RESPONSE (length: " + (responseText?.length || 0) + "):");
    console.log("responseText:", responseText);
    console.log("Type:", typeof responseText);
    console.log("═══════════════════════════════════════════════════════════");

    if (!responseText) {
      console.error("❌ Empty response from Gemini - returning default");
      return getDefaultReceiptData();
    }

    // Remove markdown code blocks if present
    responseText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    console.log("🧹 [GEMINI] After cleanup (length: " + responseText.length + "):");
    console.log("cleanedText:", responseText);

    // Parse JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log("✅ [GEMINI] Successfully parsed JSON:");
      console.log("Parsed data:", JSON.stringify(data));
      console.log("amount:", data.amount);
      console.log("date:", data.date);
      console.log("merchantName:", data.merchantName);
    } catch (parseErr) {
      console.error("❌ JSON parsing failed:", parseErr.message);
      console.log("Failed to parse:", responseText);
      console.error("Attempting fallback extraction...");
      
      // FALLBACK: Try multiple regex patterns to extract amount
      let amountValue = null;
      
      console.log("🔍 [FALLBACK] Trying Pattern 1: \"amount\": NUMBER...");
      // Pattern 1: "amount": 1572.66 or "amount":1572.66
      let match = responseText.match(/"amount"\s*:\s*([0-9]+(?:\.[0-9]{1,2})?)/);
      if (match) {
        amountValue = parseFloat(match[1]);
        console.log("✅ Pattern 1 matched:", amountValue);
      }
      
      console.log("🔍 [FALLBACK] Trying Pattern 2: \"amount\": \"STRING\"...");
      // Pattern 2: "amount": "1572.66" (string format)
      if (!amountValue) {
        match = responseText.match(/"amount"\s*:\s*"([0-9]+(?:\.[0-9]{1,2})?)"/);
        if (match) {
          amountValue = parseFloat(match[1]);
          console.log("✅ Pattern 2 matched:", amountValue);
        }
      }
      
      console.log("🔍 [FALLBACK] Trying Pattern 3: Any number...");
      // Pattern 3: Any numbers in the response (last resort)
      if (!amountValue) {
        const allNumberMatches = responseText.match(/[0-9]+(?:\.[0-9]{1,2})?/g);
        if (allNumberMatches) {
          console.log("Found numbers:", allNumberMatches);
          // Get the largest number
          amountValue = Math.max(...allNumberMatches.map(parseFloat));
          console.log("✅ Pattern 3 matched (largest):", amountValue);
        }
      }

      console.log("🔍 [FALLBACK] Extracting date...");
      // Extract date
      let dateValue = null;
      match = responseText.match(/"date"\s*:\s*"([^"]+)"/);
      if (match) {
        dateValue = match[1];
        console.log("✅ Date matched:", dateValue);
      }
      if (!dateValue) {
        match = responseText.match(/"date"\s*:\s*(\d{4}-\d{2}-\d{2})/);
        if (match) {
          dateValue = match[1];
          console.log("✅ Date pattern 2 matched:", dateValue);
        }
      }

      console.log("🔍 [FALLBACK] Extracting merchant...");
      // Extract merchant
      let merchantValue = null;
      match = responseText.match(/"merchantName"\s*:\s*"([^"]+)"/);
      if (match) {
        merchantValue = match[1];
        console.log("✅ Merchant matched:", merchantValue);
      }

      console.log("🔍 [FALLBACK] Final check - Amount valid?", amountValue, "> 0 ?", amountValue > 0);
      if (amountValue !== null && amountValue > 0) {
        data = {
          amount: amountValue,
          date: dateValue || new Date().toISOString().split('T')[0],
          merchantName: merchantValue || "Unknown"
        };
        console.log("✅ [FALLBACK] Fallback regex extraction SUCCEEDED - Amount:", data.amount);
      } else {
        console.error("❌ [FALLBACK] Fallback extraction FAILED - amountValue:", amountValue);
        console.error("Response was:", responseText);
        return getDefaultReceiptData();
      }
    }

    // Validate and convert amount
    let amount = 0;
    console.log("═══════════════════════════════════════════════════════════");
    console.log("💰 [AMOUNT VALIDATION] Starting...");
    console.log("data object:", data);
    console.log("data.amount:", data?.amount);
    console.log("type of data.amount:", typeof data?.amount);
    
    if (data && (data.amount !== undefined && data.amount !== null)) {
      console.log("✅ Amount field exists in data");
      const amountStr = String(data.amount);
      console.log("Amount as string:", amountStr);
      
      const parsed = parseFloat(amountStr.replace(/,/g, ''));
      console.log("After replace & parseFloat:", parsed);
      console.log("Is NaN?", isNaN(parsed));
      console.log("Greater than 0?", parsed > 0);
      
      if (!isNaN(parsed) && parsed > 0) {
        amount = Math.round(parsed * 100) / 100; // Round to 2 decimals
        console.log("✅ VALID - Amount set to:", amount);
      } else {
        console.warn("⚠️ INVALID - Amount is NaN or <= 0. Value:", parsed);
        console.error("❌ Amount validation failed - returning default data");
        console.log("═══════════════════════════════════════════════════════════");
        return getDefaultReceiptData();
      }
    } else {
      console.warn("⚠️ Amount field missing or null in data:", data);
      console.error("❌ No amount field extracted - returning default data");
      console.log("═══════════════════════════════════════════════════════════");
      return getDefaultReceiptData();
    }
    console.log("═══════════════════════════════════════════════════════════");

    // Parse date - handle multiple formats
    let dateStr = data?.date || new Date().toISOString().split('T')[0];
    let resultDate = new Date(dateStr);
    if (isNaN(resultDate.getTime())) {
      console.warn("⚠️ Invalid date format, using today:", dateStr);
      resultDate = new Date();
    }

    const result = {
      amount: amount,
      date: resultDate,
      description: "Receipt",
      category: detectCategory(data?.merchantName || ""),
      merchantName: String(data?.merchantName || "Unknown Merchant").substring(0, 100),
    };

    console.log("✅ [GEMINI] FINAL RESULT:", {
      amount: result.amount,
      merchant: result.merchantName,
      date: result.date.toISOString().split('T')[0],
      category: result.category
    });
    
    return result;

  } catch (error) {
    console.error("❌ [GEMINI] Critical error:", error.message);
    console.error("Stack trace:", error.stack);
    return getDefaultReceiptData();
  }
}

// Quick category detection
function detectCategory(merchantName) {
  const name = (merchantName || "").toLowerCase();
  if (name.includes("restaurant") || name.includes("food") || name.includes("hotel") || name.includes("hyatt") || name.includes("café")) return "food";
  if (name.includes("grocery") || name.includes("supermarket")) return "groceries";
  if (name.includes("gas") || name.includes("fuel")) return "transportation";
  if (name.includes("store") || name.includes("shop")) return "shopping";
  return "other-expense";
}

// Default OCR fallback
function getDefaultReceiptData() {
  return {
    amount: 0,
    date: new Date(),
    description: "Receipt (manual entry required)",
    category: "other-expense",
    merchantName: "Unknown Merchant",
  };
}

// Helper function to calculate next recurring date
function calculateNextRecurringDate(startDate, interval) {
  const date = new Date(startDate);

  switch (interval) {
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date;
}
