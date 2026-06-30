import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function sendInviteEmail({
  to,
  documentTitle,
  documentId,
  inviterName,
  role,
}: {
  to: string;
  documentTitle: string;
  documentId: string;
  inviterName: string;
  role: string;
}): Promise<void> {
  const link = `${APP_URL}/documents/${documentId}`;

  try {
    await resend.emails.send({
      from: "Collaborative Document Editor <onboarding@resend.dev>",
      to,
      subject: `${inviterName} shared "${documentTitle}" with you`,
      html: `
        <p>${inviterName} gave you <strong>${role}</strong> access to "${documentTitle}".</p>
        <p><a href="${link}">Open the document</a></p>
      `,
    });
  } catch (error) {
    // An email failure should never block the actual access grant — the
    // membership row is already committed by the time this runs. Log and
    // move on, same "degrade gracefully" principle as the AI stretch goal.
    console.error("Failed to send invite email:", error);
  }
}
