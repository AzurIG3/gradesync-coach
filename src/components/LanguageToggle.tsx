import { useT } from "@/lib/i18n";

export function LanguageToggle() {
  const { lang, setLang } = useT();
  return (
    <button
      onClick={() => setLang(lang === "en" ? "ur" : "en")}
      className="flex h-10 items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-bold text-foreground shadow-sm active:scale-95"
      aria-label="Toggle language"
    >
      <span aria-hidden>🌐</span>
      <span>{lang === "en" ? "اردو" : "EN"}</span>
    </button>
  );
}
