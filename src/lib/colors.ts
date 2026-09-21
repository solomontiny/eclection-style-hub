export const COLOR_OPTIONS = [
  "Black", "White", "Red", "Blue", "Green", "Yellow", "Pink", "Purple",
  "Gold", "Silver", "Brown", "Grey", "Beige", "Navy", "Cream", "Charcoal",
  "Orange", "Teal", "Maroon", "Ivory",
] as const;

const COLOR_SWATCH_MAP: Record<string, string> = {
  black: "#1a1a1a",
  white: "#f5f5f5",
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  pink: "#ec4899",
  purple: "#8b5cf6",
  gold: "#d4af37",
  silver: "#c0c0c0",
  grey: "#9ca3af",
  gray: "#9ca3af",
  brown: "#8b4513",
  beige: "#d4c0a1",
  navy: "#1e3a8a",
  cream: "#fef3c7",
  charcoal: "#374151",
  orange: "#f97316",
  teal: "#14b8a3",
  maroon: "#7f1d1d",
  ivory: "#fdf6e3",
};

export function colorToCss(color: string): string {
  const lower = color.toLowerCase().trim().replace(/\s+/g, "");
  return COLOR_SWATCH_MAP[lower] ?? lower;
}

export function colorsToString(colors?: string[] | null): string {
  return colors?.filter(Boolean).join(", ") ?? "";
}

export function parseColorsString(input?: string): string[] | null {
  const result = input
    ? input.split(",").map((c) => c.trim()).filter(Boolean)
    : null;
  return result && result.length > 0 ? result : null;
}
