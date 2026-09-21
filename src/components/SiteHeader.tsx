import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { CartDrawer } from "./CartDrawer";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/lib/auth";
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

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/90 border-b border-border/50 shadow-sm">
      <div className="container-x flex items-center justify-between h-20">
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="SupplierAffordable home">
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
          <CartDrawer />
        </nav>
        <div className="md:hidden flex items-center gap-1">
          <ThemeToggle />
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
      {open && (
        <div className="md:hidden border-t border-border/60 bg-background">
          <div className="container-x py-4 flex flex-col gap-1">
            <NavLinks onClick={() => setOpen(false)} />
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

