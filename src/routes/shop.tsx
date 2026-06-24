import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Product, getProducts } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";

const TABS = ["All", "Women", "Men", "Accessories"] as const;

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — E Style Collection" },
      { name: "description", content: "Browse women's, men's and accessory collections from E Style Collection, Lagos." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: getProducts,
  });
  const items =
    tab === "All"
      ? products
      : products.filter((p) => p.category?.toLowerCase() === tab.toLowerCase());
  return (
    <section className="container-x py-16">
      <p className="text-xs uppercase tracking-widest text-primary font-semibold">Collection</p>
      <h1 className="font-display text-4xl md:text-6xl mt-2">Shop everything</h1>
      <p className="mt-3 text-muted-foreground max-w-lg">
        Tap any piece to order directly via WhatsApp. We confirm availability, then share payment details.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-full text-sm font-semibold border transition-colors ${
              tab === t
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border bg-background hover:border-primary"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
        {items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}
