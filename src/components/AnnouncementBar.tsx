import { Sparkles } from "lucide-react";

const MESSAGES = [
  "✨ Free delivery on orders above ₦50,000",
  "🎁 Use code WELCOME10 for 10% off your first order",
  "🚚 Same-day delivery within Lekki / Ajah",
  "💖 New arrivals every week — shop the latest drops",
  "📦 Pickup available at our Majek, Lekki location",
];

export function AnnouncementBar() {
  // Duplicate so the marquee loops seamlessly
  const loop = [...MESSAGES, ...MESSAGES];
  return (
    <div className="bg-primary text-primary-foreground overflow-hidden border-b border-primary/20">
      <div className="flex whitespace-nowrap animate-marquee py-2 will-change-transform">
        {loop.map((m, i) => (
          <span key={i} className="flex items-center gap-2 px-6 text-xs font-medium tracking-wide">
            <Sparkles size={12} className="opacity-80" />
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}
