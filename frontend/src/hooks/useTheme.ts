import { useEffect } from "react";
import { resolveTheme, useThemeStore } from "@/stores/themeStore";

export function useTheme() {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  useEffect(() => {
    const apply = () => {
      document.documentElement.setAttribute("data-theme", resolveTheme(preference));
    };
    apply();

    if (preference === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
  }, [preference]);

  return { preference, setPreference, resolved: resolveTheme(preference) };
}
