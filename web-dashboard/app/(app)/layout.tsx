import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppNavbar from "@/components/AppNavbar";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;
  const userRole = cookieStore.get("userRole")?.value;

  if (!userId || !userRole) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <AppNavbar role={userRole} />
      <main className="p-6">{children}</main>
    </div>
  );
}