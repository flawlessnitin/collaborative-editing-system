"use client";
import { useState, useEffect, useCallback } from "react";
const ConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  const checkConnectivity = useCallback(async () => {
    try {
      const response = await fetch("/api/ping", { cache: "no-store" });
      setIsOnline(response.ok);
    } catch {
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    // setIsOnline here runs only after the fetch's promise resolves (an async
    // callback reacting to an external system), not synchronously during this
    // effect — safe despite the lint heuristic not seeing through the `await`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkConnectivity();

    const intervalId = setInterval(checkConnectivity, 10000);
    window.addEventListener("online", checkConnectivity);
    window.addEventListener("offline", checkConnectivity);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("online", checkConnectivity);
      window.removeEventListener("offline", checkConnectivity);
    };
  }, [checkConnectivity]);
  return (
    <div aria-live="polite">{isOnline ? "Online" : "Offline"}</div>
  )
}

export default ConnectionStatus
