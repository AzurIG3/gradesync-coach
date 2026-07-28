import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
const KEY = "study-planner-theme";

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const isDark = t === "dark" || (t === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", isDark);
}

type Ctx = { theme: Theme; setTheme: (t: Theme) => void; resolved: "light" | "dark" };
const ThemeContext = createContext<Ctx>({ theme: "system", setTheme: () => {}, resolved: "light" });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    let initial: Theme = "system";
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "light" || saved === "dark" || saved === "system") initial = saved;
    } catch {}
    setThemeState(initial);
    applyTheme(initial);
    setResolved(document.documentElement.classList.contains("dark") ? "dark" : "light");

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((localStorage.getItem(KEY) ?? "system") === "system") {
        applyTheme("system");
        setResolved(document.documentElement.classList.contains("dark") ? "dark" : "light");
      }
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {}
    applyTheme(t);
    setResolved(
      typeof document !== "undefined" && document.documentElement.classList.contains("dark")
        ? "dark"
        : "light",
    );
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme, resolved }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Inline script to apply theme before hydration to avoid a flash. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${KEY}');var d=t==='dark'||((t==null||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}`;
