import { useEffect, useRef, useSyncExternalStore } from "react";
import { io, type Socket } from "socket.io-client";
import { env } from "@/lib/env";
import { useAuthStore } from "@/stores/authStore";

let sharedSocket: Socket | null = null;

/** Connected by default so pages that never touch a socket don't show a false "reconnecting" state. */
let connected = true;
const statusListeners = new Set<() => void>();
const setConnected = (value: boolean) => {
  if (connected === value) return;
  connected = value;
  statusListeners.forEach((l) => l());
};

function getSocket(): Socket | null {
  const token = useAuthStore.getState().session?.accessToken;
  if (!token) return null;

  if (!sharedSocket) {
    sharedSocket = io(`${env.wsUrl}/rt`, {
      auth: { token },
      transports: ["websocket"],
      autoConnect: true,
    });
    sharedSocket.on("connect", () => setConnected(true));
    sharedSocket.on("disconnect", () => setConnected(false));
    sharedSocket.on("connect_error", () => setConnected(false));
  }
  return sharedSocket;
}

/** True once a socket exists and has dropped connection — false otherwise (including "no socket yet"). */
export function useSocketConnected(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      statusListeners.add(onChange);
      return () => statusListeners.delete(onChange);
    },
    () => connected,
  );
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
