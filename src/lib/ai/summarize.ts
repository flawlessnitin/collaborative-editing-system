"use server";

import * as Y from "yjs";
import { getSession } from "@/lib/auth/session";
import { assertMembership } from "@/lib/membership";
import prisma from "@/lib/prisma";

// Must match the field name Tiptap's Collaboration extension binds to
// (see src/lib/sync/restore.ts's COLLABORATION_FIELD for the same constant).
const COLLABORATION_FIELD = "default";
const GEMINI_MODEL = "gemini-flash-latest";
const MAX_INPUT_CHARS = 20_000; // keeps the prompt small/cheap regardless of document size

function extractPlainText(node: Y.XmlElement | Y.XmlText | Y.XmlHook): string {
  if (node instanceof Y.XmlText) {
    return node.toString();
  }
  if (node instanceof Y.XmlElement) {
    return node.toArray().map(extractPlainText).join(" ");
  }
  return "";
}

export async function summarizeDocumentAction(
  documentId: string,
): Promise<{ summary: string } | { error: string }> {
  const session = await getSession();
  if (!session) {
    return { error: "Unauthorized" };
  }

  const membership = await assertMembership(session.userId, documentId, "viewer");
  if (!membership) {
    return { error: "Forbidden" };
  }

  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) {
    return { error: "Document not found" };
  }

  const doc = new Y.Doc();
  let text: string;
  try {
    Y.applyUpdate(doc, document.state);
    text = doc
      .getXmlFragment(COLLABORATION_FIELD)
      .toArray()
      .map(extractPlainText)
      .join("\n")
      .trim();
  } finally {
    doc.destroy();
  }

  if (!text) {
    return { error: "Document is empty — nothing to summarize" };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": process.env.GEMINI_API_KEY!,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    "Summarize the following document in 2-3 concise sentences. " +
                    "Output only the summary, no preamble.\n\n" +
                    text.slice(0, MAX_INPUT_CHARS),
                },
              ],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      return { error: "AI summary failed — try again later" };
    }

    const data = await response.json();
    const summary: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return summary ? { summary: summary.trim() } : { error: "AI summary failed — try again later" };
  } catch (error) {
    console.error("AI summarize failed:", error);
    return { error: "AI summary failed — try again later" };
  }
}
