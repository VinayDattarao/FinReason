import { currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";

export const checkUser = async () => {
  try {
    const user = await currentUser();

    if (!user) {
      return null;
    }

    try {
      const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();

      const loggedInUser = await db.user.upsert({
        where: {
          clerkUserId: user.id,
        },
        update: {
          name: name || "User",
          imageUrl: user.imageUrl,
          email: user.emailAddresses[0]?.emailAddress || "",
        },
        create: {
          clerkUserId: user.id,
          name: name || "User",
          imageUrl: user.imageUrl,
          email: user.emailAddresses[0]?.emailAddress || "",
        },
      });

      return loggedInUser;
    } catch (dbError) {
      console.error("checkUser: Database error:", dbError.message);
      throw new Error(`Database error: ${dbError.message}`);
    }
  } catch (error) {
    console.error("checkUser: Error:", error);
    throw error;
  }
};
