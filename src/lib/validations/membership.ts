import { z } from "zod";

// "owner" is deliberately excluded — ownership is set once at document
// creation, not reassigned through the invite flow.
export const inviteSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  role: z.enum(["editor", "viewer"], { message: "Role must be editor or viewer" }),
});

export type InviteInput = z.infer<typeof inviteSchema>;
