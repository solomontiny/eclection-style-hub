import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Instagram, Facebook, MessageCircle, Copy, Check } from "lucide-react";
import { CONTACT, whatsappLink } from "@/lib/contact";
import { useState } from "react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Payment — E Style Collection" },
      { name: "description", content: "Reach E Style Collection via WhatsApp, phone, email or visit our Lekki office. Pay securely by Nigerian bank transfer." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [copied, setCopied] = useState(false);
  const copyAcct = () => {
    navigator.clipboard.writeText(CONTACT.bank.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="container-x py-16">
      <p className="text-xs uppercase tracking-widest text-primary font-semibold">Get in touch</p>
      <h1 className="font-display text-4xl md:text-6xl mt-2 max-w-2xl">Order, ask, or stop by.</h1>

      <div className="mt-12 grid lg:grid-cols-2 gap-8">
        {/* Contact details */}
        <div className="rounded-3xl bg-card p-8 shadow-[var(--shadow-card)] border border-border/60">
          <h2 className="font-display text-2xl">Reach us directly</h2>
          <div className="mt-6 space-y-5 text-sm">
            <a href={whatsappLink("Hi E Style 👋")} target="_blank" rel="noreferrer" className="flex items-start gap-3 hover:text-primary">
              <MessageCircle className="text-primary mt-0.5" size={20} />
              <div>
                <p className="font-semibold">WhatsApp (preferred)</p>
                <p className="text-muted-foreground">{CONTACT.phone}</p>
              </div>
            </a>
            <a href={`tel:${CONTACT.phone}`} className="flex items-start gap-3 hover:text-primary">
              <Phone className="text-primary mt-0.5" size={20} />
              <div>
                <p className="font-semibold">Call</p>
                <p className="text-muted-foreground">{CONTACT.phone}</p>
              </div>
            </a>
            <a href={`mailto:${CONTACT.email}`} className="flex items-start gap-3 hover:text-primary">
              <Mail className="text-primary mt-0.5" size={20} />
              <div>
                <p className="font-semibold">Email</p>
                <p className="text-muted-foreground break-all">{CONTACT.email}</p>
              </div>
            </a>
            <div className="flex items-start gap-3">
              <MapPin className="text-primary mt-0.5" size={20} />
              <div>
                <p className="font-semibold">Office</p>
                <p className="text-muted-foreground">{CONTACT.address}</p>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-border/60">
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

        {/* Payment */}
        <div className="rounded-3xl p-8 text-foreground" style={{ background: "var(--gradient-soft)" }}>
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">Payment</p>
          <h2 className="font-display text-2xl mt-2">How to pay</h2>
          <ol className="mt-5 space-y-3 text-sm">
            <li className="flex gap-3"><span className="font-semibold text-primary">1.</span> Send us your order on WhatsApp — we'll confirm availability and total (item + delivery).</li>
            <li className="flex gap-3"><span className="font-semibold text-primary">2.</span> Pay via bank transfer to the account below.</li>
            <li className="flex gap-3"><span className="font-semibold text-primary">3.</span> Send proof of payment. We dispatch within 24 hours.</li>
          </ol>

          <div className="mt-6 rounded-2xl bg-background p-5 border border-border/60">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Bank transfer (NGN)</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Bank</p>
                <p className="font-semibold">{CONTACT.bank.bankName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Account name</p>
                <p className="font-semibold">{CONTACT.bank.accountName}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Account number</p>
                <div className="flex items-center gap-3 mt-1">
                  <p className="font-display text-2xl text-primary">{CONTACT.bank.accountNumber}</p>
                  <button onClick={copyAcct} className="p-2 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors" aria-label="Copy">
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <a href={whatsappLink("Hi E Style 👋, I'd like to place an order.")} target="_blank" rel="noreferrer" className="btn-primary mt-6 w-full justify-center">
            <MessageCircle size={16} /> Start order on WhatsApp
          </a>
          <p className="mt-3 text-xs text-muted-foreground text-center">
            Card payments (Paystack / Flutterwave) coming soon.
          </p>
        </div>
      </div>
    </section>
  );
}
