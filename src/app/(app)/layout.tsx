import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import AppSidebar from "@/components/AppSidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar — hidden on mobile until Task 5 */}
      <div className="hidden md:flex h-full">
        <AppSidebar />
      </div>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
