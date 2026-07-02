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
    <>
      {/* Desktop sidebar — fixed so the main content scrolls via the body
          rather than an overflow-auto container, which would clip the
          absolutely-positioned collaboration caret labels (top: -1.4em). */}
      <div className="hidden md:flex fixed inset-y-0 left-0 z-20 w-60">
        <AppSidebar />
      </div>

      {/* Content area — shifted right of the sidebar on desktop */}
      <div className="flex flex-col min-h-screen md:pl-60">
        {/* Mobile-only top bar */}
        <div className="flex md:hidden items-center gap-3 border-b px-4 py-3 bg-card sticky top-0 z-10">
          <MobileSidebarDrawer>
            <AppSidebar />
          </MobileSidebarDrawer>
          <span className="font-bold text-sm">
            <span className="text-primary">Collab</span>
          </span>
        </div>

        <main className="flex-1">{children}</main>
      </div>
    </>
  );
}
