import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { FloatingSosButton } from "./FloatingSosButton";

interface AppShellProps {
  children: ReactNode;
  showNav?: boolean;
  showSos?: boolean;
}

/** Wraps every authenticated screen. Bare, unpadded auth/onboarding screens use their own layout. */
export function AppShell({ children, showNav = true, showSos = true }: AppShellProps) {
  return (
    <div className="app-shell flex flex-col">
      <div className={showNav ? "flex-1 pb-32" : "flex-1"}>{children}</div>
      {showSos && showNav && <FloatingSosButton />}
      {showNav && <BottomNav />}
    </div>
  );
}
