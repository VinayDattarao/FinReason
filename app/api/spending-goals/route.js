import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Spending goals are stored client-side in localStorage
    return new Response(
      JSON.stringify({
        success: true,
        data: { message: "Use localStorage on client-side" },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Fetch goals error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { goals } = await req.json();

    if (!goals || typeof goals !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid goals format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Goals are now handled client-side with localStorage
    return new Response(
      JSON.stringify({
        success: true,
        data: goals,
        message: "Use localStorage on client-side for persistence",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Save goals error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

