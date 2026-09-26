import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Globe, Languages, CreditCard, Shield, Heart, ShoppingBag } from "lucide-react";
import { CartDrawer } from "./CartDrawer";
import { ThemeToggle } from "./ThemeToggle";
import { useStore } from "@/lib/store-context";
import { COUNTRIES } from "@/lib/currency";
import { LANGUAGES } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useFavorites } from "@/lib/favorites";
import officialLogo from "@/assets/supplier-affordable-logo.png";

const links = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/bulk-order", label: "Bulk Order" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

// Helper to make navigation more accessible and consistent
const NavLinks = ({ onClick }: { onClick?: () => void }) => (
  <>
    {links.map((l) => (
      <Link
        key={l.to}
        to={l.to}
        onClick={onClick}
        className="py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
        activeProps={{ className: "text-primary" }}
      >
        {l.label}
      </Link>
    ))}
  </>
);

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { currency, setCurrency, language, setLanguage } = useStore();
  const { favorites } = useFavorites();

  const currentCountry = COUNTRIES.find((c) => c.code === currency) || COUNTRIES[0];
  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  // Paystack supported currencies (based on typical Paystack Nigeria integration)
  const PAYSTACK_SUPPORTED_CURRENCIES = ["NGN", "GHS", "KES", "ZAR", "USD"];

  const isPaymentCurrencySupported = PAYSTACK_SUPPORTED_CURRENCIES.includes(currency);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/90 border-b border-border/50 shadow-sm">
      {/* Row 2: Info/Payment Row */}
      <div className="hidden md:flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background/50 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            <CreditCard className="h-3.5 w-3.5" />
            <span className="font-medium">
              Prices shown in your selected currency for convenience. Payments processed securely via Paystack.
            </span>
          </div>
          {!isPaymentCurrencySupported && (
            <span className="ml-3 px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              Payment will be processed in NGN via Paystack
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Compact Currency Selector */}
          <Select
            value={currency}
            onValueChange={setCurrency}
            className="w-[140px]"
          >
            <SelectTrigger className="h-8 text-xs gap-1" aria-label="Select currency">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder={currentCountry.flag} />
            </SelectTrigger>
            <SelectContent className="w-[260px] max-h-72" position="popper">
              {COUNTRIES.map((c) => (
                <SelectItem key={c.country} value={c.code} className="flex items-center gap-2 py-1.5 text-xs">
                  <span className="text-sm">{c.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{c.country}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{c.currencyName} ({c.code})</p>
                  </div>
                  {currency === c.code && <span className="text-primary text-xs">✓</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Compact Language Selector */}
          <Select
            value={language}
            onValueChange={setLanguage}
            className="w-[120px]"
          >
            <SelectTrigger className="h-8 text-xs gap-1" aria-label="Select language">
              <Languages className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder={currentLang.flag} />
            </SelectTrigger>
            <SelectContent className="w-[180px]" position="popper">
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code} className="flex items-center gap-2 py-1.5 text-xs">
                  <span className="text-sm">{l.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{l.label}</p>
                  </div>
                  {language === l.code && <span className="text-primary text-xs">✓</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 3: Main Navigation Row */}
      <div className="container-x flex items-center justify-between h-20 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 mr-8" aria-label="SupplierAffordable home">
          <img
            src={officialLogo}
            alt="SupplierAffordable official logo"
            width={1024}
            height={1024}
            className="size-12 object-contain md:size-14"
          />
          <span className="hidden font-display text-xl font-bold tracking-tight sm:inline">SupplierAffordable</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <NavLinks />
          <div className="h-6 w-px bg-border/60" />
          {user ? (
            <div className="flex items-center gap-4">
              <Link to="/account" className="text-sm font-medium text-primary hover:text-accent transition-colors">
                Account
              </Link>
              <button onClick={async () => await signOut()} className="text-sm font-medium text-primary hover:text-accent transition-colors disabled:opacity-50">
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              search={{ redirect: undefined }}
              className="text-sm font-medium text-primary hover:text-accent transition-colors"
              activeProps={{ className: "text-accent" }}
            >
              Login
            </Link>
          )}
          <ThemeToggle />
          <Link to="/shop" className="btn-primary !py-2 !px-6 text-sm">
            Shop Now
          </Link>
          <Link to="/favorites" className="relative p-2 text-foreground/80 hover:text-primary transition-colors" aria-label="Favorites">
            <Heart size={20} className="fill-current" />
            {favorites.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {favorites.length > 99 ? "99+" : favorites.length}
              </span>
            )}
          </Link>
          <CartDrawer />
        </nav>

        <div className="md:hidden flex items-center gap-1">
          <ThemeToggle />
          <Link to="/favorites" className="relative p-2 text-foreground/80 hover:text-primary transition-colors" aria-label="Favorites">
            <Heart size={20} className="fill-current" />
            {favorites.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {favorites.length > 99 ? "99+" : favorites.length}
              </span>
            )}
          </Link>
          <CartDrawer />
          <button
            className="p-2 -mr-2"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden border-t border-border/60 bg-background">
          <div className="container-x py-4 flex flex-col gap-1">
            <NavLinks onClick={() => setOpen(false)} />
            <div className="pt-2 border-t border-border/60 flex flex-wrap items-center gap-2">
              {/* Mobile Currency Selector */}
              <Select
                value={currency}
                onValueChange={setCurrency}
                className="w-full sm:w-auto"
              >
                <SelectTrigger className="h-8 text-xs gap-1" aria-label="Select currency">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder={currentCountry.flag} />
                </SelectTrigger>
                <SelectContent className="w-[260px] max-h-72" position="popper">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.country} value={c.code} className="flex items-center gap-2 py-1.5 text-xs">
                      <span className="text-sm">{c.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{c.country}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{c.currencyName} ({c.code})</p>
                      </div>
                      {currency === c.code && <span className="text-primary text-xs">✓</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Mobile Language Selector */}
              <Select
                value={language}
                onValueChange={setLanguage}
                className="w-full sm:w-auto"
              >
                <SelectTrigger className="h-8 text-xs gap-1" aria-label="Select language">
                  <Languages className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder={currentLang.flag} />
                </SelectTrigger>
                <SelectContent className="w-[180px]" position="popper">
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code} className="flex items-center gap-2 py-1.5 text-xs">
                      <span className="text-sm">{l.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{l.label}</p>
                      </div>
                      {language === l.code && <span className="text-primary text-xs">✓</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {user && (
              <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-border/60">
                <Link to="/account" onClick={() => setOpen(false)} className="py-2 text-sm font-medium">
                  Account
                </Link>
                <button onClick={() => { setOpen(false); signOut(); }} className="py-2 text-sm font-medium text-left">Sign out</button>
              </div>
            )}
            {!user && (
              <Link to="/login" search={{ redirect: undefined }} onClick={() => setOpen(false)} className="py-2 mt-2 pt-2 border-t border-border/60 text-sm font-medium">
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}