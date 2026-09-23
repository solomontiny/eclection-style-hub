import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, Mail, Clock } from "lucide-react";
import { CONTACT, SUPPORT_HOURS } from "@/lib/contact";
import officialLogo from "@/assets/supplier-affordable-logo.png";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/30">
      <div className="container-x py-20 grid gap-12 md:grid-cols-4">
        <div className="md:col-span-2 space-y-4">
          <Link to="/" className="inline-flex items-center gap-4" aria-label="SupplierAffordable home">
            <img
              src={officialLogo}
              alt="SupplierAffordable official logo"
              width={1024}
              height={1024}
              loading="lazy"
              className="size-20 shrink-0 object-contain"
            />
            <span className="font-display text-2xl font-bold">SupplierAffordable</span>
          </Link>
          <p className="text-sm text-muted-foreground max-w-sm">
            SupplierAffordable is a Nigerian fashion brand bringing you stylish, quality, and affordable clothing. We make it easy to look good, feel confident, and stay fashionable without breaking the bank.
          </p>
          <div className="flex gap-4 pt-2">
          <a href={`https://instagram.com/${CONTACT.instagram}`} target="_blank" rel="noreferrer" className="p-3 rounded-full bg-background border border-primary hover:bg-primary hover:text-primary-foreground transition-colors" aria-label="Instagram">
            <Instagram size={20} />
          </a>
          <a href={`https://facebook.com/${CONTACT.facebook}`} target="_blank" rel="noreferrer" className="p-3 rounded-full bg-background border border-primary hover:bg-primary hover:text-primary-foreground transition-colors" aria-label="Facebook">
            <Facebook size={20} />
          </a>
          <a href="https://www.tiktok.com/@_supplieraffordable?_r=1&_t=ZS-99wKAm28RHh" target="_blank" rel="noreferrer noopener" className="p-3 rounded-full bg-background border border-primary hover:bg-primary hover:text-primary-foreground transition-colors" aria-label="TikTok">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.77 0 2.89 2.89 0 0 1 2.76-2.89h.6V8.62a5.45 5.45 0 0 0-3.36 1.15 5.77 5.77 0 0 0-1.74 4.34 5.77 5.77 0 0 0 5.77 5.77 5.77 5.77 0 0 0 5.77-5.77V7.12a8.55 8.55 0 0 0 4.6 1.36V4.76a7.66 7.66 0 0 1-2.61-.92z" />
            </svg>
          </a>
          </div>
          </div>
          <div>
          <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-6 text-primary">Shop</h4>
          <ul className="space-y-4 text-sm text-muted-foreground">
          <li><Link to="/shop" className="hover:text-accent transition-colors">All Products</Link></li>
          <li><Link to="/shop" className="hover:text-accent transition-colors">Women's Collection</Link></li>
          <li><Link to="/about" className="hover:text-accent transition-colors">About Us</Link></li>
          </ul>
          </div>
          <div>
          <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-6 text-primary">Contact</h4>
          <ul className="space-y-4 text-sm text-muted-foreground">
          <li className="flex gap-3"><Mail size={18} className="text-accent" /> <a href={`mailto:${CONTACT.email}`} className="hover:text-accent transition-colors break-all">{CONTACT.email}</a></li>
          <li className="flex gap-3"><Clock size={18} className="text-accent" /> <span>{SUPPORT_HOURS}</span></li>
          </ul>
          </div>

      </div>
      <div className="border-t border-border">
        <div className="container-x py-8 text-xs text-muted-foreground flex flex-wrap gap-4 justify-between items-center">
          <p>© {new Date().getFullYear()} SupplierAffordable. All rights reserved.</p>
          <p className="text-center w-full md:w-auto mt-4 md:mt-0 opacity-70">Powered by Tiny-Tech</p>
          <div className="flex gap-6">
            <Link to="/admin/login" className="hover:text-primary transition-colors">Admin Login</Link>
            <span>Lagos, Nigeria</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
