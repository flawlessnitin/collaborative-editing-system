import { z } from "zod";

export const renameDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: "Title cannot be empty" })
    .max(200, { message: "Title is too long" }),
});
