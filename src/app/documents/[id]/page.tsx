import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { assertMembership } from "@/lib/membership";
import Editor from "@/components/Editor";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const membership = await assertMembership(session.userId, id, "viewer");
  if (!membership) {
    notFound();
  }

  return <Editor documentId={id} />;
}
