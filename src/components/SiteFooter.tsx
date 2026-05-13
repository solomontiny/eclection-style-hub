import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, Mail, Phone, MapPin } from "lucide-react";
import { CONTACT } from "@/lib/contact";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-secondary/40">
      <div className="container-x py-16 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <h3 className="font-display text-2xl">E Style Collection</h3>
          <p className="mt-3 text-sm text-muted-foreground max-w-sm">
            Affordable, elevated fashion for women and men — curated and shipped from Lagos.
          </p>
          <div className="flex gap-3 mt-5">
            <a href={`https://instagram.com/${CONTACT.instagram}`} target="_blank" rel="noreferrer" className="p-2.5 rounded-full bg-background hover:bg-primary hover:text-primary-foreground transition-colors" aria-label="Instagram">
              <Instagram size={18} />
            </a>
            <a href="https://facebook.com/" target="_blank" rel="noreferrer" className="p-2.5 rounded-full bg-background hover:bg-primary hover:text-primary-foreground transition-colors" aria-label="Facebook">
              <Facebook size={18} />
            </a>
            <a href={`https://tiktok.com/@${CONTACT.tiktokHandle}`} target="_blank" rel="noreferrer" className="p-2.5 rounded-full bg-background hover:bg-primary hover:text-primary-foreground transition-colors" aria-label="TikTok">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.5a8.16 8.16 0 0 0 4.77 1.52V6.6a4.85 4.85 0 0 1-1.84.09Z"/></svg>
            </a>
          </div>
        </div>
        <div>
          <h4 className="font-display text-sm uppercase tracking-widest mb-4">Shop</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/shop" className="hover:text-primary">All</Link></li>
            <li><Link to="/shop" className="hover:text-primary">Women</Link></li>
            <li><Link to="/shop" className="hover:text-primary">Men</Link></li>
            <li><Link to="/about" className="hover:text-primary">About</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm uppercase tracking-widest mb-4">Contact</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-primary" /> {CONTACT.address}</li>
            <li className="flex gap-2"><Phone size={16} className="text-primary" /> <a href={`tel:${CONTACT.phone}`} className="hover:text-primary">{CONTACT.phone}</a></li>
            <li className="flex gap-2"><Mail size={16} className="text-primary" /> <a href={`mailto:${CONTACT.email}`} className="hover:text-primary break-all">{CONTACT.email}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="container-x py-5 text-xs text-muted-foreground flex flex-wrap gap-2 justify-between">
          <p>© {new Date().getFullYear()} E Style Collection. All rights reserved.</p>
          <p>Lagos, Nigeria</p>
        </div>
      </div>
    </footer>
  );
}
