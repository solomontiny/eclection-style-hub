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
          <h2 className="font-display text-2xl mt-2">Choose how to pay</h2>
          <p className="mt-2 text-sm text-muted-foreground">Select your preferred Nigerian payment method below.</p>
          <PaymentSelector copied={copied} copyAcct={copyAcct} />
        </div>
      </div>
    </section>
  );
}

function PaymentSelector({ copied, copyAcct }: { copied: boolean; copyAcct: () => void }) {
  const [method, setMethod] = useState<"bank" | "whatsapp">("bank");

  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-2 p-1 rounded-full bg-background/60 border border-border/60">
        <button
          onClick={() => setMethod("bank")}
          className={`py-2.5 rounded-full text-sm font-semibold transition-colors ${
            method === "bank" ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-background"
          }`}
        >
          🏦 Bank Transfer
        </button>
        <button
          onClick={() => setMethod("whatsapp")}
          className={`py-2.5 rounded-full text-sm font-semibold transition-colors ${
            method === "whatsapp" ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-background"
          }`}
        >
          💬 WhatsApp
        </button>
      </div>

      {method === "bank" ? (
        <div className="mt-6 animate-in fade-in slide-in-from-bottom-2">
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3"><span className="font-semibold text-primary">1.</span> Confirm your order total with us on WhatsApp (item + delivery fee).</li>
            <li className="flex gap-3"><span className="font-semibold text-primary">2.</span> Transfer the exact amount to the account below.</li>
            <li className="flex gap-3"><span className="font-semibold text-primary">3.</span> Send proof of payment on WhatsApp — we dispatch within 24 hours.</li>
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
                  <button onClick={copyAcct} className="p-2 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors" aria-label="Copy account number">
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <a
            href={whatsappLink(
              `Hi E Style 👋, I've made a bank transfer to ${CONTACT.bank.bankName} (${CONTACT.bank.accountNumber}). My proof of payment is attached.`,
            )}
            target="_blank"
            rel="noreferrer"
            className="btn-primary mt-6 w-full justify-center"
          >
            <MessageCircle size={16} /> Send proof of payment
          </a>
          <p className="mt-3 text-xs text-muted-foreground text-center">
            Card payments (Paystack / Flutterwave) coming soon.
          </p>
        </div>
      ) : (
        <WhatsappOrderForm />
      )}
    </>
  );
}

type OrderItem = { name: string; size: string; qty: number };

function WhatsappOrderForm() {
  const [items, setItems] = useState<OrderItem[]>([{ name: "", size: "M", qty: 1 }]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  const updateItem = (i: number, patch: Partial<OrderItem>) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem = () => setItems((arr) => [...arr, { name: "", size: "M", qty: 1 }]);
  const removeItem = (i: number) => setItems((arr) => (arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr));

  const validItems = items.filter((it) => it.name.trim());
  const canSend = validItems.length > 0 && address.trim() && fullName.trim();

  const message =
    `*New Order — E Style Collection* 🛍️\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `🧾 *Items*\n` +
    (validItems.length
      ? validItems.map((it, i) => `${i + 1}. ${it.name} — Size ${it.size} × ${it.qty}`).join("\n")
      : "(no items yet)") +
    `\n\n👤 *Customer*\n` +
    `• Name   : ${fullName || "—"}\n` +
    `• Phone  : ${phone || "—"}\n\n` +
    `📍 *Delivery Address*\n` +
    `${address || "—"}${city ? `, ${city}` : ""}\n\n` +
    (notes.trim() ? `📝 *Notes*\n${notes}\n\n` : "") +
    `Please confirm availability, total + delivery fee. Thank you! 💕`;

  return (
    <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 space-y-4">
      <div className="rounded-2xl bg-background p-5 border border-border/60 space-y-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Your order</p>
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <input
              value={it.name}
              onChange={(e) => updateItem(i, { name: e.target.value })}
              placeholder="Item name (e.g. Floral Maxi Dress)"
              className="col-span-7 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <select
              value={it.size}
              onChange={(e) => updateItem(i, { size: e.target.value })}
              className="col-span-2 rounded-lg border border-border px-2 py-2 text-sm focus:outline-none focus:border-primary"
            >
              {["S", "M", "L", "XL", "XXL"].map((s) => <option key={s}>{s}</option>)}
            </select>
            <input
              type="number"
              min={1}
              value={it.qty}
              onChange={(e) => updateItem(i, { qty: Math.max(1, Number(e.target.value) || 1) })}
              className="col-span-2 rounded-lg border border-border px-2 py-2 text-sm focus:outline-none focus:border-primary text-center"
            />
            <button
              type="button"
              onClick={() => removeItem(i)}
              disabled={items.length === 1}
              className="col-span-1 text-muted-foreground hover:text-destructive disabled:opacity-30 text-lg"
              aria-label="Remove item"
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" onClick={addItem} className="text-xs font-semibold text-primary hover:underline">
          + Add another item
        </button>
      </div>

      <div className="rounded-2xl bg-background p-5 border border-border/60 space-y-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Delivery details</p>
        <div className="grid grid-cols-2 gap-2">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name *" className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary" />
        </div>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Delivery address *"
          rows={2}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
        />
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City / State (e.g. Lekki, Lagos)" className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary" />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (color preference, landmark…)"
          rows={2}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
        />
      </div>

      <a
        href={canSend ? whatsappLink(message) : undefined}
        target="_blank"
        rel="noreferrer"
        aria-disabled={!canSend}
        onClick={(e) => { if (!canSend) e.preventDefault(); }}
        className={`btn-primary w-full justify-center ${!canSend ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <MessageCircle size={16} /> Send order on WhatsApp
      </a>
      <p className="text-xs text-muted-foreground text-center">
        Your items, sizes, quantities and delivery address are pre-filled in the message.
      </p>
    </div>
  );
}
    </>
  );
}
