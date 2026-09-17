import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, Mail, Phone, MapPin } from "lucide-react";
import { CONTACT } from "@/lib/contact";
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
            <a href={`https://instagram.com/${CONTACT.instagram}`} target="_blank" rel="noreferrer" className="p-3 rounded-full bg-background border border-border hover:bg-primary hover:text-primary-foreground transition-colors" aria-label="Instagram">
              <Instagram size={20} />
            </a>
            <a href={`https://facebook.com/${CONTACT.facebook}`} target="_blank" rel="noreferrer" className="p-3 rounded-full bg-background border border-border hover:bg-primary hover:text-primary-foreground transition-colors" aria-label="Facebook">
              <Facebook size={20} />
            </a>
          </div>
        </div>
        <div>
          <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-6">Shop</h4>
          <ul className="space-y-4 text-sm text-muted-foreground">
            <li><Link to="/shop" className="hover:text-primary transition-colors">All Products</Link></li>
            <li><Link to="/shop" className="hover:text-primary transition-colors">Women's Collection</Link></li>
            <li><Link to="/shop" className="hover:text-primary transition-colors">Men's Collection</Link></li>
            <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-6">Contact</h4>
          <ul className="space-y-4 text-sm text-muted-foreground">
            
            <li className="flex gap-3"><Mail size={18} className="text-primary" /> <a href={`mailto:${CONTACT.email}`} className="hover:text-primary transition-colors break-all">{CONTACT.email}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-x py-8 text-xs text-muted-foreground flex flex-wrap gap-4 justify-between items-center">
          <p>© {new Date().getFullYear()} SupplierAffordable. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/admin/login" className="hover:text-primary transition-colors">Admin Login</Link>
            <span>Lagos, Nigeria</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
