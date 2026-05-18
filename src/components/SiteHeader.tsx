import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, User as UserIcon, LayoutDashboard } from "lucide-react";
import { CartDrawer } from "./CartDrawer";
import { useAuth } from "@/lib/auth";

const links = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/60">
      <div className="container-x flex items-center justify-between h-20">
        <Link to="/" className="font-display text-xl tracking-tight">
          E Style <span className="text-primary">Collection</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
              activeProps={{ className: "text-primary" }}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className="text-sm font-medium text-primary hover:opacity-80 inline-flex items-center gap-1.5"
              activeProps={{ className: "underline" }}
            >
              <LayoutDashboard size={15} /> Admin
            </Link>
          )}
          {user ? (
            <button
              onClick={() => signOut()}
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
            >
              Sign out
            </button>
          ) : (
            <Link
              to="/login"
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors inline-flex items-center gap-1.5"
            >
              <UserIcon size={15} /> Sign in
            </Link>
          )}
          <Link to="/contact" className="btn-primary !py-2.5 !px-5 text-sm">
            Order Now
          </Link>
          <CartDrawer />
        </nav>
        <div className="md:hidden flex items-center gap-1">
          <CartDrawer />
          <button
            className="p-2"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-border/60 bg-background">
          <div className="container-x py-4 flex flex-col gap-3">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="py-2 text-sm font-medium"
              >
                {l.label}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" onClick={() => setOpen(false)} className="py-2 text-sm font-medium text-primary">
                Admin dashboard
              </Link>
            )}
            {user ? (
              <button onClick={() => { setOpen(false); signOut(); }} className="py-2 text-sm font-medium text-left">
                Sign out
              </button>
            ) : (
              <Link to="/login" onClick={() => setOpen(false)} className="py-2 text-sm font-medium">
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

