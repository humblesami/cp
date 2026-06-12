"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSocketStore } from "../store/socketStore";

/**
 * Call this once at the top of the app tree (e.g. in a layout or provider).
 * Automatically connects/disconnects socket based on session state.
 */
export function useSocket() {
  const { data: session } = useSession();
  const { connect, disconnect, connected } = useSocketStore();

  useEffect(() => {
    if (session?.djangoAccess) {
      connect(session.djangoAccess);
    }
    return () => {
      if (!session) disconnect();
    };
  }, [session?.djangoAccess]);

  return { connected };
}
