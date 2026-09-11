import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Instagram, Facebook, MessageCircle } from "lucide-react";
import { CONTACT, whatsappLink } from "@/lib/contact";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Supplier Affordable" },
      { name: "description", content: "Reach Supplier Affordable via WhatsApp, phone, or email. We're here to help." },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <section className="container-x py-16">
      <p className="text-xs uppercase tracking-widest text-primary font-semibold">Get in touch</p>
      <h1 className="font-display text-4xl md:text-6xl mt-2 max-w-2xl">We're here to help.</h1>

      <div className="mt-12 rounded-3xl bg-card p-8 shadow-[var(--shadow-card)] border border-border/60 max-w-3xl">
        <div className="space-y-6 text-sm">
          <a href={whatsappLink("Hi Supplier Affordable 👋")} target="_blank" rel="noreferrer" className="flex items-start gap-3 hover:text-primary">
            <MessageCircle className="text-primary mt-0.5" size={20} />
            <div>
              <p className="font-semibold">WhatsApp (preferred)</p>
              <p className="text-muted-foreground">{CONTACT.phone}</p>
            </div>
          </a>
          <div className="flex items-start gap-3">
            <Phone className="text-primary mt-0.5" size={20} />
            <div className="flex-1">
              <p className="font-semibold">Call</p>
              <p className="text-muted-foreground">{CONTACT.phone}</p>
              <span className="text-muted-foreground block">{CONTACT.phone2}</span>
            </div>
          </div>

          <a href={`mailto:${CONTACT.email}`} className="flex items-start gap-3 hover:text-primary">
            <Mail className="text-primary mt-0.5" size={20} />
            <div>
              <p className="font-semibold">Email</p>
              <p className="text-muted-foreground break-all">{CONTACT.email}</p>
            </div>
          </a>
          <div className="flex items-start gap-3">
            <MapPin className="text-primary mt-0.5" size={20} />
            <div className="flex-1">
              <p className="font-semibold">Office</p>
              <p className="text-muted-foreground">{CONTACT.address}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACT.mapQuery)}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary font-semibold hover:underline mt-1 inline-block"
              >
                Open in Google Maps →
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-border/60">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Follow</p>
          <div className="flex gap-3">
            <a href={`https://instagram.com/${CONTACT.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground text-sm transition-colors">
              <Instagram size={16} /> @{CONTACT.instagram}
            </a>
            <a href="https://facebook.com/" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground text-sm transition-colors">
              <Facebook size={16} /> {CONTACT.facebook}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
