import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import AppSidebar from "@/components/AppSidebar";
import MobileSidebarDrawer from "@/components/MobileSidebarDrawer";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full">
        <AppSidebar />
      </div>

      <div className="flex flex-1 flex-col min-h-0">
        {/* Mobile-only top bar */}
        <div className="flex md:hidden items-center gap-3 border-b px-4 py-3 bg-card sticky top-0 z-10">
          <MobileSidebarDrawer>
            <AppSidebar />
          </MobileSidebarDrawer>
          <span className="font-bold text-sm">
            <span className="text-primary">Collab</span>
          </span>
        </div>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
