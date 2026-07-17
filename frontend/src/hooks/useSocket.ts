import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { env } from "@/lib/env";
import { useAuthStore } from "@/stores/authStore";

let sharedSocket: Socket | null = null;

function getSocket(): Socket | null {
  const token = useAuthStore.getState().session?.accessToken;
  if (!token) return null;

  if (!sharedSocket) {
    sharedSocket = io(`${env.wsUrl}/rt`, {
      auth: { token },
      transports: ["websocket"],
      autoConnect: true,
    });
  }
  return sharedSocket;
}

/**
 * Joins an incident's realtime room for the lifetime of the component and
 * leaves on unmount. The server re-derives room membership from the DB on
 * every join, so this is safe to call speculatively.
 */
export function useIncidentSocket(incidentId: string | null, onEvent: (event: string, payload: unknown) => void) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!incidentId) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit("incident:join", { incidentId });

    const forward = (event: string) => (payload: unknown) => handlerRef.current(event, payload);
    const events = ["breakout:message", "incident:update", "transport:update", "welfare:prompt"];
    const listeners = events.map((event) => {
      const listener = forward(event);
      socket.on(event, listener);
      return { event, listener };
    });

    return () => {
      listeners.forEach(({ event, listener }) => socket.off(event, listener));
      socket.emit("incident:leave", { incidentId });
    };
  }, [incidentId]);
}
