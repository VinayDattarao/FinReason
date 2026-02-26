import React from "react";
import { checkUser } from "@/lib/checkUser";
import { redirect } from "next/navigation";

const MainLayout = async ({ children }) => {
  try {
    const user = await checkUser();
    if (!user) {
      redirect("/sign-up");
    }
  } catch (error) {
    console.error("Error in MainLayout checkUser:", error);
    redirect("/sign-in");
  }

  return <div className="container mx-auto my-32">{children}</div>;
};

export default MainLayout;
