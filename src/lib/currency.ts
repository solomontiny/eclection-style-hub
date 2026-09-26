export type CountryCurrency = {
  country: string;
  code: string;
  currencyName: string;
  flag: string;
  rateToNGN: number;
  paystackSupported: boolean;
};

export const COUNTRIES: CountryCurrency[] = [
  { country: "Nigeria", code: "NGN", currencyName: "Nigerian naira", flag: "🇳🇬", rateToNGN: 1.0, paystackSupported: true },
  { country: "Ghana", code: "GHS", currencyName: "Ghanaian cedi", flag: "🇬🇭", rateToNGN: 0.012, paystackSupported: true },
  { country: "Kenya", code: "KES", currencyName: "Kenyan shilling", flag: "🇰🇪", rateToNGN: 0.095, paystackSupported: true },
  { country: "South Africa", code: "ZAR", currencyName: "South African rand", flag: "🇿🇦", rateToNGN: 0.012, paystackSupported: true },
  { country: "Senegal", code: "XOF", currencyName: "West African CFA franc", flag: "🇸🇳", rateToNGN: 0.58, paystackSupported: false },
  { country: "Côte d'Ivoire", code: "XOF", currencyName: "West African CFA franc", flag: "🇨🇮", rateToNGN: 0.58, paystackSupported: false },
  { country: "Mali", code: "XOF", currencyName: "West African CFA franc", flag: "🇲🇱", rateToNGN: 0.58, paystackSupported: false },
  { country: "Burkina Faso", code: "XOF", currencyName: "West African CFA franc", flag: "🇧🇫", rateToNGN: 0.58, paystackSupported: false },
  { country: "Niger", code: "XOF", currencyName: "West African CFA franc", flag: "🇳🇪", rateToNGN: 0.58, paystackSupported: false },
  { country: "Togo", code: "XOF", currencyName: "West African CFA franc", flag: "🇹🇬", rateToNGN: 0.58, paystackSupported: false },
  { country: "Benin", code: "XOF", currencyName: "West African CFA franc", flag: "🇧🇯", rateToNGN: 0.58, paystackSupported: false },
  { country: "Guinea-Bissau", code: "XOF", currencyName: "West African CFA franc", flag: "🇬🇼", rateToNGN: 0.58, paystackSupported: false },
  { country: "Cameroon", code: "XAF", currencyName: "Central African CFA franc", flag: "🇨🇲", rateToNGN: 0.58, paystackSupported: false },
  { country: "Gabon", code: "XAF", currencyName: "Central African CFA franc", flag: "🇬🇦", rateToNGN: 0.58, paystackSupported: false },
  { country: "Central African Republic", code: "XAF", currencyName: "Central African CFA franc", flag: "🇨🇫", rateToNGN: 0.58, paystackSupported: false },
  { country: "Republic of the Congo", code: "XAF", currencyName: "Central African CFA franc", flag: "🇨🇬", rateToNGN: 0.58, paystackSupported: false },
  { country: "Chad", code: "XAF", currencyName: "Central African CFA franc", flag: "🇹🇩", rateToNGN: 0.58, paystackSupported: false },
  { country: "Equatorial Guinea", code: "XAF", currencyName: "Central African CFA franc", flag: "🇬🇶", rateToNGN: 0.58, paystackSupported: false },
  { country: "Morocco", code: "MAD", currencyName: "Moroccan dirham", flag: "🇲🇦", rateToNGN: 0.0075, paystackSupported: false },
  { country: "Egypt", code: "EGP", currencyName: "Egyptian pound", flag: "🇪🇬", rateToNGN: 0.038, paystackSupported: false },
  { country: "Algeria", code: "DZD", currencyName: "Algerian dinar", flag: "🇩🇿", rateToNGN: 0.0055, paystackSupported: false },
  { country: "Tunisia", code: "TND", currencyName: "Tunisian dinar", flag: "🇹🇳", rateToNGN: 0.0028, paystackSupported: false },
  { country: "Libya", code: "LYD", currencyName: "Libyan dinar", flag: "🇱🇾", rateToNGN: 0.0018, paystackSupported: false },
  { country: "Uganda", code: "UGX", currencyName: "Ugandan shilling", flag: "🇺🇬", rateToNGN: 2.6, paystackSupported: false },
  { country: "Tanzania", code: "TZS", currencyName: "Tanzanian shilling", flag: "🇹🇿", rateToNGN: 1.7, paystackSupported: false },
  { country: "Rwanda", code: "RWF", currencyName: "Rwandan franc", flag: "🇷🇼", rateToNGN: 0.95, paystackSupported: false },
  { country: "Zambia", code: "ZMW", currencyName: "Zambian kwacha", flag: "🇿🇲", rateToNGN: 0.017, paystackSupported: false },
  { country: "Malawi", code: "MWK", currencyName: "Malawian kwacha", flag: "🇲🇼", rateToNGN: 0.45, paystackSupported: false },
  { country: "Zimbabwe", code: "ZWG", currencyName: "Zimbabwe Gold (ZiG)", flag: "🇿🇼", rateToNGN: 0.0002, paystackSupported: false },
  { country: "Botswana", code: "BWP", currencyName: "Botswana pula", flag: "🇧🇼", rateToNGN: 0.009, paystackSupported: false },
  { country: "Namibia", code: "NAD", currencyName: "Namibian dollar", flag: "🇳🇦", rateToNGN: 0.012, paystackSupported: false },
  { country: "Eswatini", code: "SZL", currencyName: "Swazi lilangeni", flag: "🇸🇿", rateToNGN: 0.012, paystackSupported: false },
  { country: "Lesotho", code: "LSL", currencyName: "Lesotho loti", flag: "🇱🇸", rateToNGN: 0.012, paystackSupported: false },
  { country: "Mauritius", code: "MUR", currencyName: "Mauritian rupee", flag: "🇲🇺", rateToNGN: 0.032, paystackSupported: false },
  { country: "Seychelles", code: "SCR", currencyName: "Seychellois rupee", flag: "🇸🇨", rateToNGN: 0.045, paystackSupported: false },
  { country: "Comoros", code: "KMF", currencyName: "Comorian franc", flag: "🇰🇲", rateToNGN: 0.16, paystackSupported: false },
  { country: "Djibouti", code: "DJF", currencyName: "Djiboutian franc", flag: "🇩🇯", rateToNGN: 0.42, paystackSupported: false },
  { country: "Somalia", code: "SOS", currencyName: "Somali shilling", flag: "🇸🇴", rateToNGN: 1.3, paystackSupported: false },
  { country: "Ethiopia", code: "ETB", currencyName: "Ethiopian birr", flag: "🇪🇹", rateToNGN: 0.13, paystackSupported: false },
  { country: "Eritrea", code: "ERN", currencyName: "Eritrean nakfa", flag: "🇪🇷", rateToNGN: 0.012, paystackSupported: false },
  { country: "Sudan", code: "SDG", currencyName: "Sudanese pound", flag: "🇸🇩", rateToNGN: 0.014, paystackSupported: false },
  { country: "South Sudan", code: "SSP", currencyName: "South Sudanese pound", flag: "🇸🇸", rateToNGN: 0.012, paystackSupported: false },
  { country: "Sierra Leone", code: "SLE", currencyName: "Sierra Leonean leone", flag: "🇸🇱", rateToNGN: 0.013, paystackSupported: false },
  { country: "Liberia", code: "LRD", currencyName: "Liberian dollar", flag: "🇱🇷", rateToNGN: 0.11, paystackSupported: false },
  { country: "The Gambia", code: "GMD", currencyName: "Gambian dalasi", flag: "🇬🇲", rateToNGN: 0.052, paystackSupported: false },
  { country: "Guinea", code: "GNF", currencyName: "Guinean franc", flag: "🇬🇳", rateToNGN: 6.5, paystackSupported: false },
  { country: "Cape Verde", code: "CVE", currencyName: "Cape Verdean escudo", flag: "🇨🇻", rateToNGN: 0.007, paystackSupported: false },
  { country: "São Tomé and Príncipe", code: "STN", currencyName: "São Tomé and Príncipe dobra", flag: "🇸🇹", rateToNGN: 0.0003, paystackSupported: false },
  { country: "Angola", code: "AOA", currencyName: "Angolan kwanza", flag: "🇦🇴", rateToNGN: 0.001, paystackSupported: false },
  { country: "Burundi", code: "BIF", currencyName: "Burundian franc", flag: "🇧🇮", rateToNGN: 0.022, paystackSupported: false },
  { country: "Democratic Republic of the Congo", code: "CDF", currencyName: "Congolese franc", flag: "🇨🇩", rateToNGN: 0.003, paystackSupported: false },
  { country: "Madagascar", code: "MGA", currencyName: "Malagasy ariary", flag: "🇲🇬", rateToNGN: 0.016, paystackSupported: false },
  { country: "Mauritania", code: "MRU", currencyName: "Mauritanian ouguiya", flag: "🇲🇷", rateToNGN: 0.002, paystackSupported: false },
  { country: "Mozambique", code: "MZN", currencyName: "Mozambican metical", flag: "🇲🇿", rateToNGN: 0.011, paystackSupported: false },
];

export function convertAmount(amountInNGN: number, targetCurrency: string): number {
  const item = COUNTRIES.find((c) => c.code === targetCurrency) || COUNTRIES[0];
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
