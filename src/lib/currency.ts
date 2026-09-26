export type CountryCurrency = {
  country: string;
  code: string;
  currencyName: string;
  flag: string;
  rateToNGN: number;
  paystackSupported: boolean;
};

export const COUNTRIES: CountryCurrency[] = [
  { country: "Ghana", code: "GHS", currencyName: "Ghanaian cedi", flag: "🇬🇭", rateToNGN: 0.012, paystackSupported: true },
  { country: "Sierra Leone", code: "SLE", currencyName: "Sierra Leonean leone", flag: "🇸🇱", rateToNGN: 0.013, paystackSupported: false },
  { country: "Liberia", code: "LRD", currencyName: "Liberian dollar", flag: "🇱🇷", rateToNGN: 0.11, paystackSupported: false },
  { country: "The Gambia", code: "GMD", currencyName: "Gambian dalasi", flag: "🇬🇲", rateToNGN: 0.052, paystackSupported: false },
  { country: "Togo", code: "XOF", currencyName: "West African CFA franc", flag: "🇹🇬", rateToNGN: 0.58, paystackSupported: false },
  { country: "Côte d’Ivoire", code: "XOF", currencyName: "West African CFA franc", flag: "🇨🇮", rateToNGN: 0.58, paystackSupported: false },
  { country: "Kenya", code: "KES", currencyName: "Kenyan shilling", flag: "🇰🇪", rateToNGN: 0.095, paystackSupported: true },
  { country: "South Africa", code: "ZAR", currencyName: "South African rand", flag: "🇿🇦", rateToNGN: 0.012, paystackSupported: true },
  { country: "Uganda", code: "UGX", currencyName: "Ugandan shilling", flag: "🇺🇬", rateToNGN: 2.6, paystackSupported: false },
  { country: "Tanzania", code: "TZS", currencyName: "Tanzanian shilling", flag: "🇹🇿", rateToNGN: 1.7, paystackSupported: false },
  { country: "Rwanda", code: "RWF", currencyName: "Rwandan franc", flag: "🇷🇼", rateToNGN: 0.95, paystackSupported: false },
  { country: "Zambia", code: "ZMW", currencyName: "Zambian kwacha", flag: "🇿🇲", rateToNGN: 0.017, paystackSupported: false },
  { country: "Senegal", code: "XOF", currencyName: "West African CFA franc", flag: "🇸🇳", rateToNGN: 0.58, paystackSupported: false },
  { country: "Benin", code: "XOF", currencyName: "West African CFA franc", flag: "🇧🇯", rateToNGN: 0.58, paystackSupported: false },
  { country: "Cameroon", code: "XAF", currencyName: "Central African CFA franc", flag: "🇨🇲", rateToNGN: 0.58, paystackSupported: false },
  { country: "Morocco", code: "MAD", currencyName: "Moroccan dirham", flag: "🇲🇦", rateToNGN: 0.0075, paystackSupported: false },
  { country: "Egypt", code: "EGP", currencyName: "Egyptian pound", flag: "🇪🇬", rateToNGN: 0.038, paystackSupported: false },
  { country: "Mauritius", code: "MUR", currencyName: "Mauritian rupee", flag: "🇲🇺", rateToNGN: 0.032, paystackSupported: false },
  { country: "Nigeria", code: "NGN", currencyName: "Nigerian naira", flag: "🇳🇬", rateToNGN: 1.0, paystackSupported: true },
];

export function convertAmount(amountInNGN: number, targetCurrency: string): number {
  const item = COUNTRIES.find((c) => c.code === targetCurrency) || COUNTRIES[COUNTRIES.length - 1];
  return Math.round(amountInNGN * item.rateToNGN * 100) / 100;
}

export function formatCurrencyPrice(amountInNGN: number, targetCurrency: string): string {
  const converted = convertAmount(amountInNGN, targetCurrency);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: targetCurrency,
    maximumFractionDigits: 2,
  }).format(converted);
}
