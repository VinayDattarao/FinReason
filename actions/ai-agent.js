"use server";

import { auth } from "@clerk/nextjs/server";

const AI_AGENT_URL = process.env.AI_AGENT_URL || "http://localhost:8000";

/**
 * Fetch spending analysis from AI agent
 */
export async function getSpendingAnalysis(days: number = 90) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const response = await fetch(
      `${AI_AGENT_URL}/api/insights/spending-analysis?user_id=${userId}&days=${days}`
    );

    if (!response.ok) {
      throw new Error(`AI Agent error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching spending analysis:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to analyze spending"
    );
  }
}

/**
 * Fetch budget analysis from AI agent
 */
export async function getBudgetAnalysis() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const response = await fetch(
      `${AI_AGENT_URL}/api/insights/budget-analysis?user_id=${userId}`
    );

    if (!response.ok) {
      throw new Error(`AI Agent error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching budget analysis:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to analyze budget"
    );
  }
}

/**
 * Fetch financial health assessment
 */
export async function getFinancialHealth() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const response = await fetch(
      `${AI_AGENT_URL}/api/insights/financial-health?user_id=${userId}`
    );

    if (!response.ok) {
      throw new Error(`AI Agent error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching financial health:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to assess financial health"
    );
  }
}

/**
 * Get spending optimization recommendations
 */
export async function getSpendingOptimization() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const response = await fetch(
      `${AI_AGENT_URL}/api/recommendations/spending-optimization?user_id=${userId}`,
      { method: "POST" }
    );

    if (!response.ok) {
      throw new Error(`AI Agent error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching spending optimization:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to get recommendations"
    );
  }
}

/**
 * Get portfolio rebalancing recommendations
 */
export async function getPortfolioRebalancing() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const response = await fetch(
      `${AI_AGENT_URL}/api/recommendations/portfolio-rebalancing?user_id=${userId}`,
      { method: "POST" }
    );

    if (!response.ok) {
      throw new Error(`AI Agent error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching portfolio recommendation:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to get portfolio recommendation"
    );
  }
}

/**
 * Get financial summary report
 */
export async function getFinancialReport(period: string = "monthly") {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const response = await fetch(
      `${AI_AGENT_URL}/api/reports/summary?user_id=${userId}&period=${period}`
    );

    if (!response.ok) {
      throw new Error(`AI Agent error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching financial report:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to generate report"
    );
  }
}

/**
 * Detect financial anomalies and alert issues
 */
export async function detectAnomalies() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const response = await fetch(
      `${AI_AGENT_URL}/api/alerts/anomalies?user_id=${userId}`,
      { method: "POST" }
    );

    if (!response.ok) {
      throw new Error(`AI Agent error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error detecting anomalies:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to detect anomalies"
    );
  }
}

/**
 * Health check for AI agent service
 */
export async function checkAIAgentHealth() {
  try {
    const response = await fetch(`${AI_AGENT_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
