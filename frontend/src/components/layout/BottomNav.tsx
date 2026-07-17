import { NavLink } from "react-router-dom";
import { Home, ShieldCheck, BookOpen, Users, User } from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/knowledge", label: "Library", icon: BookOpen },
  { to: "/drills", label: "Training", icon: ShieldCheck },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] safe-bottom">
      <div className="mx-3 mb-3 flex items-center justify-around rounded-3xl border border-subtle bg-glass px-2 py-2 shadow-floating">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 rounded-2xl px-4 py-2 text-[11px] font-semibold transition-colors",
                isActive ? "text-primary" : "text-faint",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
