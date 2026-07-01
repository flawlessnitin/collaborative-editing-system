import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar slotted in Task 3 */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
