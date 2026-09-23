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
      <section className="container-x py-20">
        <h2 className="font-display text-3xl md:text-5xl mb-10 text-center">Shop by Category</h2>
        <div className="max-w-2xl mx-auto">
          {(categories.length ? categories : []).map((c) => {
            const imgSrc = c.image_url || heroImg;
            return (
              <Link key={c.id} to="/shop" className="group relative aspect-[5/3] rounded-3xl overflow-hidden block">
                <img
                  src={imgSrc}
                  alt={c.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = heroImg; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent" />
                <div className="absolute bottom-6 left-6 text-background">
                  <p className="text-xs tracking-widest uppercase opacity-80">Shop</p>
                  <p className="font-display text-3xl">{c.name}</p>
                </div>
              </Link>
            );
          })}
          {categories.length === 0 && (
            <Link to="/shop" className="group relative aspect-[5/3] rounded-3xl overflow-hidden block">
              <img
                src={heroImg}
                alt="Shop by Category"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent" />
              <div className="absolute bottom-6 left-6 text-background">
                <p className="text-xs tracking-widest uppercase opacity-80">Shop</p>
                <p className="font-display text-3xl">Women</p>
              </div>
            </Link>
          )}
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
