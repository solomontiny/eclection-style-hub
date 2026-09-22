import { Sparkles } from "lucide-react";

const MESSAGES = [
  "✦ New Styles & Collections Regularly",
  "✦ Fast & Reliable Delivery",
];

export function AnnouncementBar() {
  // Duplicate so the marquee loops seamlessly
  const loop = [...MESSAGES, ...MESSAGES];
  return (
    <div className="bg-primary/5 text-primary overflow-hidden border-b border-primary/10">
      <div className="flex whitespace-nowrap animate-marquee py-3 will-change-transform">
        {loop.map((m, i) => (
          <span key={i} className="flex items-center gap-3 px-8 text-sm font-medium tracking-wide">
            <Sparkles size={14} className="opacity-60" />
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}
