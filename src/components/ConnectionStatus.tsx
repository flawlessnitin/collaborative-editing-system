"use client";
import { useState, useEffect, useCallback } from "react";
const ConnectionStatus = () => {
  // Deliberately deterministic (always true) on the very first render, on
  // both server and client — reading the real navigator.onLine here would
  // make the client's first render diverge from the server-rendered HTML
  // whenever real connectivity happens to be false at that exact moment,
  // causing a hydration-mismatch error (and a full client-side tree
  // discard/re-render to recover). checkConnectivity() below corrects this
  // to the real value immediately after mount instead, which is a normal
  // post-hydration update, not a mismatch.
  const [isOnline, setIsOnline] = useState(true);

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
