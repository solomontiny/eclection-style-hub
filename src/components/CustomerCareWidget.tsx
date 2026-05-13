import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { whatsappLink, CONTACT } from "@/lib/contact";

const WhatsAppIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
    <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.385.701 4.604 1.905 6.477L4 29l7.72-1.873A11.94 11.94 0 0 0 16 27c6.627 0 12-5.373 12-12S22.628 3 16.001 3zm0 21.6c-1.86 0-3.6-.51-5.09-1.39l-.36-.21-4.58 1.11 1.13-4.46-.23-.37A9.56 9.56 0 0 1 6.4 15c0-5.293 4.308-9.6 9.6-9.6 5.293 0 9.6 4.307 9.6 9.6 0 5.293-4.307 9.6-9.6 9.6zm5.27-7.18c-.29-.14-1.71-.84-1.97-.94-.27-.1-.46-.14-.65.14-.19.29-.74.94-.91 1.13-.17.19-.34.21-.62.07-.29-.14-1.21-.45-2.31-1.42-.85-.76-1.43-1.69-1.6-1.97-.17-.29-.02-.44.13-.58.13-.13.29-.34.43-.51.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.14-.65-1.57-.89-2.15-.23-.56-.47-.49-.65-.5l-.55-.01c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.39 0 1.41 1.03 2.78 1.17 2.97.14.19 2.02 3.08 4.9 4.32.69.3 1.22.48 1.64.61.69.22 1.32.19 1.81.12.55-.08 1.71-.7 1.95-1.37.24-.67.24-1.25.17-1.37-.07-.12-.26-.19-.55-.33z"/>
  </svg>
);

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
