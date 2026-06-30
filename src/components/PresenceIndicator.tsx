"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

const PRESENCE_INTERVAL_MS = 3000;

interface ActiveUser {
  userId: string;
  name: string;
}

const PresenceIndicator = ({ documentId }: { documentId: string }) => {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

  useEffect(() => {
    let cancelled = false;
    const base = `/api/documents/${documentId}/presence`;

    const tick = async () => {
      try {
        // Heartbeat (tell the server "I'm still here") and refresh the
        // active list in the same tick — one interval, two cheap requests,
        // rather than two separate polling loops.
        await fetch(base, { method: "POST" });
        const res = await fetch(base);
        if (!res.ok) return;
        const { users } = await res.json();
        if (!cancelled) setActiveUsers(users);
      } catch (error) {
        console.error("Presence tick failed:", error);
      }
    };

    tick();
    const intervalId = setInterval(tick, PRESENCE_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [documentId]);

  if (activeUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1" aria-live="polite">
      <span className="text-xs text-gray-500">Active now:</span>
      {activeUsers.map((user) => (
        <Badge key={user.userId} variant="secondary">
          {user.name}
        </Badge>
      ))}
    </div>
  );
};

export default PresenceIndicator;
