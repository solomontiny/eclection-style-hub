import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Ruler } from "lucide-react";

const SIZE_CHART_DATA = [
  { uk: "Size 8", letter: "S/M" },
  { uk: "Size 10", letter: "M" },
  { uk: "Size 12", letter: "L" },
  { uk: "Size 14", letter: "XL" },
  { uk: "Size 16", letter: "XL" },
  { uk: "Size 18", letter: "2XL" },
  { uk: "Size 20", letter: "3XL" },
];

export function SizeChartDialog({ trigger }: { trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <Ruler size={14} /> Size Chart
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <Ruler size={20} className="text-primary" /> Size Reference Guide
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Use this reference table to find your ideal letter size based on standard UK sizing. This guide helps you choose the right fit without altering individual product sizes.
        </p>
        <div className="mt-4 rounded-xl border border-border overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/60 text-secondary-foreground font-display uppercase tracking-wider text-xs">
              <tr>
                <th className="px-4 py-3 font-bold">UK Size</th>
                <th className="px-4 py-3 font-bold">Letter Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SIZE_CHART_DATA.map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 font-medium">{row.uk}</td>
                  <td className="px-4 py-3 font-bold text-primary">{row.letter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 text-center">
          Need personalized fit advice? Chat with our style assistant or contact support.
        </p>
      </DialogContent>
    </Dialog>
  );
}
