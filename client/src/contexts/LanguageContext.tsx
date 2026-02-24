import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { translations, Language, defaultLanguage, TranslationKeys } from "../locales";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
  // Helper function to get nested translation
  translate: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = "spc-calculator-language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === "vi" || stored === "en") {
        return stored;
      }
      // Detect browser language
      const browserLang = navigator.language.split("-")[0];
      if (browserLang === "vi") return "vi";
      if (browserLang === "en") return "en";
    }
    return defaultLanguage;
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    // Update document lang attribute
    document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useMemo(() => translations[language], [language]);

  // Helper function to get nested translation by dot notation
  const translate = useCallback((key: string): string => {
    const keys = key.split(".");
    let result: unknown = translations[language];
    
    for (const k of keys) {
      if (result && typeof result === "object" && k in result) {
        result = (result as Record<string, unknown>)[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    return typeof result === "string" ? result : key;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    translate,
  }), [language, setLanguage, t, translate]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Shorthand hook for just getting translations
export function useTranslation() {
  const { t, translate, language } = useLanguage();
  return { t, translate, language };
}
