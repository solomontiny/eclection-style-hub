import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Ruler, Check } from "lucide-react";

const SIZE_CHART_DATA = [
  { uk: "Size 8", letter: "S/M" },
  { uk: "Size 10", letter: "M" },
  { uk: "Size 12", letter: "L" },
  { uk: "Size 14", letter: "XL" },
  { uk: "Size 16", letter: "XL" },
  { uk: "Size 18", letter: "2XL" },
  { uk: "Size 20", letter: "3XL" },
];

interface SizeChartDialogProps {
  trigger?: ReactNode;
  /** Currently selected letter size (e.g., "M", "L", "XL") */
  selectedSize?: string;
  /** Callback when user selects a size from the chart */
  onSelectSize?: (letterSize: string) => void;
  /** Whether to close the dialog after selecting a size */
  closeOnSelect?: boolean;
}

export function SizeChartDialog({
  trigger,
  selectedSize,
  onSelectSize,
  closeOnSelect = true,
}: SizeChartDialogProps) {
  const [open, setOpen] = useState(false);

  const handleRowClick = (letterSize: string) => {
    onSelectSize?.(letterSize);
    if (closeOnSelect) {
      setOpen(false);
    }
  };

  const isRowSelected = (letterSize: string) => selectedSize === letterSize;

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
          Use this reference table to find your ideal letter size based on standard UK sizing. Click a row to select it.
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
              {SIZE_CHART_DATA.map((row, idx) => {
                const isSelected = isRowSelected(row.letter);
                return (
                  <tr
                    key={idx}
                    className={`hover:bg-muted/40 transition-colors cursor-pointer ${isSelected ? "bg-primary/10" : ""}`}
                    onClick={() => handleRowClick(row.letter)}
                  >
                    <td className="px-4 py-3 font-medium">{row.uk}</td>
                    <td className="px-4 py-3 font-bold text-primary flex items-center gap-2">
                      {row.letter}
                      {isRowSelected(row.letter) && <Check size={16} className="text-primary" />}
                    </td>
                  </tr>
                );
              })}
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
