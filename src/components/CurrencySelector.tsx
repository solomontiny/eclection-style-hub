"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store-context";
import { COUNTRIES } from "@/lib/currency-browser";
import { ChevronDown, Globe } from "lucide-react";

export function CurrencySelector() {
  const { currency, setCurrency, country, t } = useStore();

  const currentCountry = COUNTRIES.find((c) => c.code === currency) || COUNTRIES[0];

  return (
    <Select
      value={currency}
      onValueChange={setCurrency}
      className="w-[160px] sm:w-[180px]"
    >
      <SelectTrigger className="h-9 text-sm gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder={t("currency") ?? "Currency"} />
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectTrigger>
      <SelectContent className="w-[280px] max-h-80" position="popper">
        {COUNTRIES.map((c) => (
          <SelectItem key={c.country} value={c.code} className="flex items-center gap-2 py-2 text-sm">
            <span className="text-base">{c.flag}</span>
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{c.country}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {c.currencyName} ({c.code})
              </p>
            </div>
            {currency === c.code && <span className="text-primary text-xs">✓</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}