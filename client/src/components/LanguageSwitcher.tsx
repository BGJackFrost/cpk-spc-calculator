import { Globe } from "lucide-react";
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
  variant?: "icon" | "full";
  className?: string;
}

export function LanguageSwitcher({ variant = "icon", className }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useLanguage();

  const languages: Language[] = ["vi", "en"];

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
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={className} title={t.common.language}>
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
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
