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
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/60">
      <div className="container-x flex items-center justify-between h-20">
        <Link to="/" className="font-display text-xl tracking-tight">
          Supplier<span className="text-primary">Affordable</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <NavLinks />
          {isAdmin ? (
            <div className="flex items-center gap-4 border-l pl-6 border-border/60">
              <Link
                to="/admin"
                className="text-sm font-medium text-primary hover:opacity-80 inline-flex items-center gap-1.5"
                activeProps={{ className: "underline" }}
              >
                <LayoutDashboard size={15} /> Admin
              </Link>
              <button onClick={async () => await signOut()} className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors disabled:opacity-50">
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="text-xs font-semibold text-primary border border-primary/40 rounded-full px-3 py-1.5 hover:bg-primary hover:text-primary-foreground transition-colors inline-flex items-center gap-1.5"
              title="Admin sign in"
            >
              <LayoutDashboard size={13} /> Admin
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
          <div className="container-x py-4 flex flex-col gap-1">
            <NavLinks onClick={() => setOpen(false)} />
            {isAdmin && (
              <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-border/60">
                <Link to="/admin" onClick={() => setOpen(false)} className="py-2 text-sm font-medium text-primary">
                  Admin dashboard
                </Link>
                <button onClick={() => { setOpen(false); signOut(); }} className="py-2 text-sm font-medium text-left">Sign out</button>
              </div>
            )}
            {!isAdmin && (
              <Link to="/login" onClick={() => setOpen(false)} className="py-2 mt-2 pt-2 border-t border-border/60 text-sm font-medium">
                Admin login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

