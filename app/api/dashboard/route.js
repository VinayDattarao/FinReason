import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { checkUser } from "@/lib/checkUser";

export async function GET() {
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

    const accounts = await db.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const serializedAccounts = accounts.map((acc) => ({
      ...acc,
      balance: acc.balance.toNumber(),
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          accounts: serializedAccounts,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Dashboard API error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
