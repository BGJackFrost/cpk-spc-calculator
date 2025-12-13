import { Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "../contexts/LanguageContext";
import { Language, languageNames } from "../locales";

interface LanguageSwitcherProps {
  variant?: "icon" | "full" | "inline";
  className?: string;
}

export function LanguageSwitcher({ variant = "icon", className }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useLanguage();

  const languages: Language[] = ["vi", "en"];

  // Inline variant - simple buttons without dropdown (for nested menus)
  if (variant === "inline") {
    return (
      <div className={`flex flex-col gap-1 ${className || ""}`}>
        <div className="text-xs text-muted-foreground px-2 py-1">{t.common?.language || "Language"}</div>
        {languages.map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors hover:bg-accent ${
              language === lang ? "bg-accent" : ""
            }`}
          >
            <span>{lang === "vi" ? "🇻🇳" : "🇺🇸"}</span>
            <span className="flex-1 text-left">{languageNames[lang]}</span>
            {language === lang && <Check className="h-4 w-4" />}
          </button>
        ))}
      </div>
    );
  }

  // Full variant with dropdown
  if (variant === "full") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={className}>
            <Globe className="h-4 w-4 mr-2" />
            {languageNames[language]}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang}
              onClick={() => setLanguage(lang)}
              className={language === lang ? "bg-accent" : ""}
            >
              <span className="mr-2">{lang === "vi" ? "🇻🇳" : "🇺🇸"}</span>
              {languageNames[lang]}
              {language === lang && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Icon variant (default)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={className} title={t.common?.language || "Language"}>
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => setLanguage(lang)}
            className={language === lang ? "bg-accent" : ""}
          >
            <span className="mr-2">{lang === "vi" ? "🇻🇳" : "🇺🇸"}</span>
            {languageNames[lang]}
            {language === lang && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
