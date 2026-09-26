"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store-context";
import { LANGUAGES } from "@/lib/i18n";
import { ChevronDown, Languages } from "lucide-react";

export function LanguageSelector() {
  const { language, setLanguage, t } = useStore();

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <Select
      value={language}
      onValueChange={setLanguage}
      className="w-[140px] sm:w-[160px]"
    >
      <SelectTrigger className="h-9 text-sm gap-2">
        <Languages className="h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder={t("language") ?? "Language"} />
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectTrigger>
      <SelectContent className="w-[200px]" position="popper">
        {LANGUAGES.map((l) => (
          <SelectItem key={l.code} value={l.code} className="flex items-center gap-2 py-2 text-sm">
            <span className="text-base">{l.flag}</span>
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{l.label}</p>
            </div>
            {language === l.code && <span className="text-primary text-xs">✓</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}