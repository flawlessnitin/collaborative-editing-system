import { z } from "zod";

// ~1.4M base64 chars covers ~1MB of binary data after base64's ~4/3 inflation.
// 200 updates per request is a generous-but-bounded cap, not a tuned limit.
export const syncPushSchema = z.object({
  updates: z.array(z.string().max(1_400_000)).max(200),
});

export type SyncPushInput = z.infer<typeof syncPushSchema>;
