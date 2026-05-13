import p1 from "@/assets/product-1.jpg";
import p2 from "@/assets/product-2.jpg";
import p3 from "@/assets/product-3.jpg";
import p4 from "@/assets/product-4.jpg";
import p5 from "@/assets/product-5.jpg";
import p6 from "@/assets/product-6.jpg";

export type Product = {
  id: string;
  name: string;
  price: number; // NGN
  image: string;
  category: "Women" | "Men" | "Accessories";
  tag?: string;
};

export const PRODUCTS: Product[] = [
  { id: "blush-ruffle-dress", name: "Blush Ruffle Dress", price: 24500, image: p1, category: "Women", tag: "New" },
  { id: "lavender-three-piece", name: "Lavender Three-Piece Suit", price: 89000, image: p2, category: "Men" },
  { id: "violet-evening-gown", name: "Violet Evening Gown", price: 65000, image: p3, category: "Women", tag: "Bestseller" },
  { id: "coral-linen-shirt", name: "Coral Linen Shirt Set", price: 32000, image: p4, category: "Men" },
  { id: "blush-handbag-set", name: "Blush Handbag Set", price: 28500, image: p5, category: "Accessories" },
  { id: "lilac-co-ord", name: "Lilac Co-ord Set", price: 38000, image: p6, category: "Women", tag: "New" },
];

export const formatNaira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
