import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { whatsappLink, CONTACT } from "@/lib/contact";

type Msg = { from: "bot" | "user"; text: string; quickReplies?: string[] };

const QUICK_REPLIES = [
  "Delivery & shipping",
  "Payment methods",
  "Sizes & fit",
  "Returns",
  "Opening hours",
  "Talk to a human",
];

function autoReply(input: string): Msg {
  const q = input.toLowerCase();
  if (/(deliver|shipping|ship|dispatch)/.test(q))
    return {
      from: "bot",
      text:
        "🚚 We deliver Lagos-wide within 24–48 hours and nationwide within 2–5 working days via GIG / DHL. Delivery fees depend on your location and are confirmed when you place your order.",
      quickReplies: ["Payment methods", "Talk to a human"],
    };
  if (/(pay|payment|transfer|bank|card)/.test(q))
    return {
      from: "bot",
      text:
        `💳 We accept bank transfer to:\n${CONTACT.bank.bankName} • ${CONTACT.bank.accountNumber}\n${CONTACT.bank.accountName}\n\nSend your proof of payment on WhatsApp and we'll confirm your order right away.`,
      quickReplies: ["Talk to a human", "Delivery & shipping"],
    };
  if (/(size|fit|measur)/.test(q))
    return {
      from: "bot",
      text:
        "📏 Most pieces run true to size (S, M, L, XL). For tailored items send your bust / waist / hip measurements and we'll match you to the perfect fit.",
      quickReplies: ["Talk to a human"],
    };
  if (/(return|refund|exchange)/.test(q))
    return {
      from: "bot",
      text:
        "🔁 You can exchange any unworn item with tags within 3 days of delivery. Custom-made and sale items are final sale.",
      quickReplies: ["Talk to a human"],
    };
  if (/(hour|open|time|when)/.test(q))
    return {
      from: "bot",
      text: "🕘 We reply Monday–Saturday, 9am–7pm WAT. Outside those hours? Drop your message and we'll get back as soon as we open. ✨",
      quickReplies: ["Talk to a human"],
    };
  if (/(human|agent|whatsapp|call|chat|talk|person)/.test(q))
    return {
      from: "bot",
      text: "👋 Tap the button below to chat live with our team on WhatsApp.",
    };
  return {
    from: "bot",
    text:
      "Thanks for your message! 💗 One of these might help — or tap “Talk to a human” to chat with us live on WhatsApp.",
    quickReplies: QUICK_REPLIES,
  };
}

export function CustomerCareWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      from: "bot",
      text: `Hi, welcome to ${CONTACT.brand}! 💕 I'm your style assistant. How can I help today?`,
      quickReplies: QUICK_REPLIES,
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  function send(text: string) {
    const value = text.trim();
    if (!value) return;
    setMessages((m) => [...m, { from: "user", text: value }]);
    setInput("");
    setTimeout(() => setMessages((m) => [...m, autoReply(value)]), 450);
  }

  const handoffMsg = `Hi ${CONTACT.brand} 👋, I was chatting with your style assistant and would like to speak to a human.`;

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-50 w-[min(92vw,360px)] h-[min(70vh,520px)] flex flex-col rounded-2xl border border-border bg-background shadow-[var(--shadow-card)] overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary to-[var(--plum,theme(colors.primary))] text-primary-foreground">
            <div>
              <p className="font-display text-base leading-tight">Style Care</p>
              <p className="text-[11px] opacity-90 flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" /> Auto-reply • online</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="p-1 hover:bg-white/10 rounded-full"><X size={18} /></button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-muted/30">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line ${m.from === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-background border border-border rounded-bl-sm"}`}>
                  {m.text}
                  {m.quickReplies && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.quickReplies.map((q) => (
                        <button key={q} onClick={() => send(q)} className="text-xs px-2.5 py-1 rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition-colors">
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border p-2 bg-background">
            <a href={whatsappLink(handoffMsg)} target="_blank" rel="noreferrer" className="block w-full text-center text-xs font-semibold text-primary hover:underline mb-2">
              Continue on WhatsApp →
            </a>
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message…" className="flex-1 rounded-full border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              <button type="submit" className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center" aria-label="Send"><Send size={15} /></button>
            </form>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Customer care chat"
        className="fixed bottom-5 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-card)] flex items-center justify-center hover:scale-105 transition-transform"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </>
  );
}
