import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, Truck, Sparkles, CreditCard, ShoppingBag, Package, Lock, HeadphonesIcon, Award } from "lucide-react";
import heroImg from "@/assets/supplier-affordable-hero.png";
import { Product, getProducts, getCategories } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { VideoAdvert } from "@/components/VideoAdvert";
import { LAGOS_DELIVERY_NOTE } from "@/lib/contact";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SupplierAffordable — Affordable Fashion for Women" },
      { name: "description", content: "Stylish, quality and affordable clothing for women. Shop online and pay securely with card or bank transfer." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["home-categories"],
    queryFn: async () => {
      try {
        return await getCategories();
      } catch {
        return [];
      }
    },
  });

  const featured = products.filter(p => p.featured).slice(0, 4);
  const newArrivals = products.slice(0, 4);
  const bundles = products.filter(p => p.product_type === 'bundle').slice(0, 4);
  const onSale = products.filter(p => p.sale_price && p.sale_price < p.price).slice(0, 4);

  // Map each category id to a representative product image (used as a polished
  // fallback when a category has no image of its own).
  const categoryProductImage = (() => {
    const map = new Map<string, string>();
    products.forEach((p) => {
      if (p.category_id && !map.has(p.category_id) && p.images?.[0]) {
        map.set(p.category_id, p.images[0]);
      }
    });
    return map;
  })();

  return (
    <>
      <section className="relative h-[60vh] min-h-[400px] sm:h-[75vh] sm:min-h-[550px] w-full overflow-hidden">
        <img
          src={heroImg}
          alt="SupplierAffordable fashion collection"
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="container-x relative h-full flex flex-col justify-center items-center pb-24 text-center">
          <h1 className="font-display text-4xl md:text-6xl text-white mb-6 drop-shadow-lg">Elevate Your Style</h1>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/shop" className="btn-primary !bg-white !text-black hover:!bg-white/90 !px-10 !py-4 !text-lg !font-bold">
              Shop Collection
            </Link>
          </div>
        </div>
      </section>

      <VideoAdvert />

      {/* Shop by Category */}
      <section className="container-x py-16">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-display text-3xl md:text-4xl">Shop by Category</h2>
          <Link to="/shop" className="text-sm font-semibold text-primary hover:underline">View all →</Link>
        </div>
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-6">
            {(categories.length ? categories : []).map((c) => {
              const imgSrc = c.image_url || categoryProductImage.get(c.id);
              return (
                <Link
                  key={c.id}
                  to="/shop"
                  aria-label={`Shop ${c.name}`}
                  className="group relative flex shrink-0 w-[160px] sm:w-[200px] md:w-auto overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative aspect-[3/4] w-full">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={c.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          const t = e.currentTarget as HTMLImageElement;
                          if (t.src !== heroImg) t.src = heroImg;
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 via-secondary to-accent/10">
                        <ShoppingBag className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-background">
                    <p className="font-display text-lg drop-shadow-sm font-medium">{c.name}</p>
                  </div>
                </Link>
              );
            })}
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground">No categories available yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* Product Sections */}
      <ProductSection title="Featured" products={featured} />
      <ProductSection title="New Arrivals" products={newArrivals} />
      <ProductSection title="Bundle Deals" products={bundles} />
      <ProductSection title="On Sale" products={onSale} />

      {/* Trust Section */}
      <section className="container-x py-20 bg-secondary/30">
        <div className="grid md:grid-cols-2 gap-10">
            {[
                { title: "✦ New Styles & Collections Regularly" },
                { title: "✦ Fast & Reliable Delivery" },
            ].map((i, idx) => (
                <div key={idx} className="text-center flex flex-col items-center">
                    <h3 className="font-display text-xl">{i.title}</h3>
                </div>
            ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container-x py-20">
        <h2 className="font-display text-3xl text-center mb-16">How it works</h2>
        <div className="grid md:grid-cols-4 gap-8">
            {[
                { icon: Sparkles, title: "Browse", text: "Explore our latest collections" },
                { icon: ShoppingBag, title: "Select", text: "Pick your favorite pieces" },
                { icon: CreditCard, title: "Pay", text: "Secure checkout via Paystack" },
                { icon: Package, title: "Receive", text: "Get your order delivered" },
            ].map((i, idx) => (
                <div key={idx} className="text-center relative">
                    <div className="mb-6 mx-auto w-16 h-16 rounded-full bg-background border flex items-center justify-center text-primary shadow-sm">
                        <i.icon size={24} />
                    </div>
                    <h3 className="font-display text-lg mb-1">{i.title}</h3>
                    <p className="text-sm text-muted-foreground">{i.text}</p>
                    {idx < 3 && <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t border-dashed border-border" />}
                </div>
            ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="container-x pb-24">
        <div className="rounded-3xl p-10 md:p-16 text-center" style={{ background: "var(--gradient-soft)" }}>
          <h2 className="font-display text-3xl md:text-5xl max-w-2xl mx-auto">Found a piece you love?</h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Pick your size, add it to your cart and pay securely online with your card or bank transfer via Paystack — no messaging needed.
          </p>
          <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">{LAGOS_DELIVERY_NOTE}</p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Link to="/shop" className="btn-primary">Shop now</Link>
            <Link to="/contact" className="btn-outline">Customer care</Link>
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
