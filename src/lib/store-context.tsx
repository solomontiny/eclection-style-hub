import React, { createContext, useContext, useState, useEffect } from "react";
import { COUNTRIES } from "./currency";
import { LANGUAGES, type Language, translate } from "./i18n";

type StoreContextType = {
  currency: string;
  setCurrency: (c: string) => void;
  country: string;
  setCountry: (c: string) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<string>("NGN");
  const [country, setCountryState] = useState<string>("Nigeria");
  const [language, setLanguageState] = useState<Language>("en");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedCurr = localStorage.getItem("sa_currency");
        if (savedCurr) setCurrencyState(savedCurr);
        const savedCountry = localStorage.getItem("sa_country");
        if (savedCountry) setCountryState(savedCountry);
        const savedLang = localStorage.getItem("sa_language") as Language;
        if (savedLang) setLanguageState(savedLang);
      } catch {}
      setIsLoaded(true);
    }
  }, []);

  const setCurrency = (c: string) => {
    setCurrencyState(c);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sa_currency", c);
      } catch {}
    }
    const found = COUNTRIES.find((item) => item.code === c);
    if (found) {
      setCountryState(found.country);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("sa_country", found.country);
        } catch {}
      }
    }
  };

  const setCountry = (c: string) => {
    setCountryState(c);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sa_country", c);
      } catch {}
    }
    const found = COUNTRIES.find((item) => item.country === c);
    if (found) {
      setCurrencyState(found.code);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("sa_currency", found.code);
        } catch {}
      }
    }
  };

  const setLanguage = (l: Language) => {
    setLanguageState(l);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sa_language", l);
      } catch {}
    }
  };

  const currentLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];
  const dir = currentLangObj.dir;

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("dir", dir);
      document.documentElement.setAttribute("lang", language);
    }
  }, [dir, language]);

  const t = (key: string) => translate(language, key);

  return (
    <StoreContext.Provider value={{ currency, setCurrency, country, setCountry, language, setLanguage, t, dir }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
