import { RefreshCw, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSocketConnected } from "@/hooks/useSocket";

/**
 * Ambient network status, mounted once in AppShell. Two distinct failure
 * modes matter here: no internet at all (browser offline event) vs. internet
 * present but the realtime channel dropped (socket disconnected/reconnecting)
 * — a judge mid-demo should see *why* live updates stopped, not a silent hang.
 */
export function ConnectionBanner() {
  const online = useOnlineStatus();
  const socketConnected = useSocketConnected();

  if (online && socketConnected) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-tint-warning px-4 py-2 text-xs font-semibold text-[#a86a00] dark:text-warning">
      {online ? (
        <>
          <RefreshCw size={13} className="animate-spin" />
          Reconnecting live updates…
        </>
      ) : (
        <>
          <WifiOff size={13} />
          You're offline — some features won't work until you're back online.
        </>
      )}
    </div>
  );
}
