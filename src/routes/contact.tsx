import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Instagram, Facebook, Clock, Truck, RefreshCcw } from "lucide-react";
import { CONTACT, SUPPORT_HOURS, DELIVERY_INFO, EXCHANGE_POLICY, LAGOS_DELIVERY_NOTE } from "@/lib/contact";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — SupplierAffordable" },
      { name: "description", content: "Email SupplierAffordable customer care. We reply Monday to Friday, 9 AM to 6 PM." },
      { property: "og:title", content: "Contact — SupplierAffordable" },
      { property: "og:description", content: "Email SupplierAffordable customer care. We reply Monday to Friday, 9 AM to 6 PM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <section className="container-x py-16">
      <p className="text-xs uppercase tracking-widest text-primary font-semibold">Get in touch</p>
      <h1 className="font-display text-4xl md:text-6xl mt-2 max-w-2xl">We're here to help.</h1>
      <p className="mt-4 text-muted-foreground max-w-xl">
        Browse, pick your size, add to cart and pay securely online — no message required. Email us any time and our team will get back to you.
      </p>

      <div className="mt-12 rounded-3xl bg-card p-8 shadow-[var(--shadow-card)] border border-border/60 max-w-3xl">
        <div className="space-y-6 text-sm">
          <a href={`mailto:${CONTACT.email}`} className="flex items-start gap-3 hover:text-primary">
            <Mail className="text-primary mt-0.5" size={20} />
            <div>
              <p className="font-semibold">Email</p>
              <p className="text-muted-foreground break-all">{CONTACT.email}</p>
            </div>
          </a>

          <div className="flex items-start gap-3">
            <Clock className="text-primary mt-0.5" size={20} />
            <div>
              <p className="font-semibold">Customer support</p>
              <p className="text-muted-foreground">{SUPPORT_HOURS}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Truck className="text-primary mt-0.5" size={20} />
            <div>
              <p className="font-semibold">Delivery</p>
              <p className="text-muted-foreground">{DELIVERY_INFO.interstate}</p>
              <p className="text-muted-foreground">{DELIVERY_INFO.international}</p>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(DELIVERY_INFO.regionalFees).map(([region, fee]) => (
                  <p key={region} className="text-muted-foreground text-sm">
                    <span className="font-medium text-foreground">{region}:</span> {fee}
                  </p>
                ))}
              </div>
              <p className="text-muted-foreground mt-3 text-sm border-t pt-2">{LAGOS_DELIVERY_NOTE}</p>
              <p className="text-muted-foreground mt-1 text-sm">{DELIVERY_INFO.note}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <RefreshCcw className="text-primary mt-0.5" size={20} />
            <div>
              <p className="font-semibold">Exchange policy</p>
              <p className="text-muted-foreground">{EXCHANGE_POLICY}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border/60">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Follow</p>
          <div className="flex flex-wrap gap-3">
            <a href={`https://instagram.com/${CONTACT.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground text-sm transition-colors">
              <Instagram size={16} /> @{CONTACT.instagram}
            </a>
            <a href={`https://facebook.com/${CONTACT.facebook.replace(/\s+/g, '.')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground text-sm transition-colors">
              <Facebook size={16} /> {CONTACT.facebook}
            </a>
          </div>
        </div>

        <Link to="/shop" className="btn-primary mt-8 inline-flex">Start shopping</Link>
      </div>
    </section>
  );
}
