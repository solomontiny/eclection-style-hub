import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import hero from "@/assets/hero-forest.jpg";
import { Product, getProducts } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { whatsappLink } from "@/lib/contact";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SupplierAffordable — Affordable Fashion for Women & Men" },
      { name: "description", content: "Curated women's and men's fashion in Lagos. Order via WhatsApp or bank transfer." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const featured = products.filter(p => p.featured).slice(0, 4);
  const newArrivals = products.slice(0, 4);
  const bundles = products.filter(p => p.product_type === 'bundle').slice(0, 4);
  const onSale = products.filter(p => p.sale_price && p.sale_price < p.price).slice(0, 4);

  return (
    <>
      {/* Full-bleed hero */}
      <section className="relative -mt-20 h-[100vh] min-h-[640px] w-full overflow-hidden">
        <img
          src={hero}
          alt="Woman in straw hat walking through sunlit pine forest"
          width={1920}
          height={1280}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/30 via-foreground/20 to-foreground/50" />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-6 pt-20">
          <p className="text-primary text-xs md:text-sm font-semibold tracking-[0.3em] uppercase mb-6">
            ✦ Affordable Fashion for Everyone ✦
          </p>
          <h1 className="font-display text-white text-6xl md:text-7xl lg:text-8xl leading-[1] tracking-tight drop-shadow-lg">
            Supplier
            <br />
            <em className="italic font-normal">Affordable</em>
          </h1>
          <p className="mt-6 text-white/90 text-base md:text-lg max-w-md">
            Premium fashion for women & men. Elegance meets affordability.
          </p>
          <div className="mt-9 flex flex-wrap gap-4 justify-center">
            <Link to="/shop" className="btn-primary !rounded-none !px-8 !py-3.5 text-xs tracking-[0.2em] uppercase">
              Shop Now <ArrowRight size={14} />
            </Link>
            <Link to="/about" className="btn-outline !rounded-none !px-8 !py-3.5 text-xs tracking-[0.2em] uppercase !border-white !text-white hover:!bg-white hover:!text-foreground">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      <section className="container-x py-20">
        <h2 className="font-display text-3xl md:text-5xl mb-10 text-center">Shop by Category</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { label: "Women", img: featured[0]?.image ?? featured[0]?.image_url ?? "" },
            { label: "Men", img: featured[1]?.image ?? featured[1]?.image_url ?? "" },
          ].map((c) => (
            <Link key={c.label} to="/shop" className="group relative aspect-[5/3] rounded-3xl overflow-hidden">
              <img
                src={c.img || undefined}
                alt={c.label}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent" />
              <div className="absolute bottom-6 left-6 text-background">
                <p className="text-xs tracking-widest uppercase opacity-80">Shop</p>
                <p className="font-display text-3xl">{c.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Product Sections */}
      <ProductSection title="Featured" products={featured} />
      <ProductSection title="New Arrivals" products={newArrivals} />
      <ProductSection title="Bundle Deals" products={bundles} />
      <ProductSection title="On Sale" products={onSale} />

      {/* CTA banner */}
      <section className="container-x pb-24">
        <div className="rounded-3xl p-10 md:p-16 text-center" style={{ background: "var(--gradient-soft)" }}>
          <h2 className="font-display text-3xl md:text-5xl max-w-2xl mx-auto">Found a piece you love?</h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            Order directly through WhatsApp — fast, simple, and personal. Pay securely by bank transfer on confirmation.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <a href={whatsappLink("Hi SupplierAffordable 👋, I'd like to place an order.")} target="_blank" rel="noreferrer" className="btn-primary">Message us on WhatsApp</a>
            <Link to="/contact" className="btn-outline">View payment details</Link>
          </div>
        </div>
      </section>
    </>
  );
}

function ProductSection({ title, products }: { title: string, products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section className="container-x py-16">
        <div className="flex justify-between items-end mb-8">
            <h2 className="font-display text-3xl">{title}</h2>
            <Link to="/shop" className="text-sm font-semibold text-primary hover:underline">View All</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
    </section>
  )
}
