import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Truck, ShieldCheck, Sparkles } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { PRODUCTS } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { whatsappLink } from "@/lib/contact";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "E Style Collection — Affordable Fashion for Women & Men" },
      { name: "description", content: "Curated women's and men's fashion in Lagos. Order via WhatsApp or bank transfer." },
    ],
  }),
  component: Home,
});

function Home() {
  const featured = PRODUCTS.slice(0, 6);
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="container-x py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-background/70 text-xs font-semibold tracking-widest uppercase text-primary">
              New Season · 2026
            </span>
            <h1 className="mt-5 font-display text-5xl md:text-6xl lg:text-7xl leading-[1.05]">
              Style that <em className="italic text-primary not-italic font-normal" style={{ fontStyle: "italic" }}>feels</em> like you.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-md">
              Affordable, elevated fashion for women and men — handpicked in Lagos and ready to wear.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-primary">Shop the collection <ArrowRight size={16} /></Link>
              <a href={whatsappLink("Hi E Style Collection 👋, I'd like to see what's available.")} target="_blank" rel="noreferrer" className="btn-outline">
                Chat on WhatsApp
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2"><Truck size={16} className="text-primary" /> Lagos-wide delivery</div>
              <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-primary" /> Secure bank transfer</div>
              <div className="flex items-center gap-2"><Sparkles size={16} className="text-primary" /> Fresh drops weekly</div>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-[var(--shadow-soft)]">
              <img src={hero} alt="E Style Collection model in lavender gown" width={1280} height={1600} className="h-full w-full object-cover" />
            </div>
            <div className="hidden md:block absolute -bottom-6 -left-6 bg-background rounded-2xl p-4 shadow-[var(--shadow-card)] max-w-[200px]">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Bestseller</p>
              <p className="font-display text-base mt-1">Violet Evening Gown</p>
              <p className="text-primary font-semibold text-sm mt-1">₦65,000</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured grid */}
      <section className="container-x py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary font-semibold">Featured</p>
            <h2 className="font-display text-3xl md:text-5xl mt-2">This week's edit</h2>
          </div>
          <Link to="/shop" className="hidden sm:inline-flex text-sm font-semibold text-primary hover:underline items-center gap-1">
            See all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Categories split */}
      <section className="container-x pb-20 grid md:grid-cols-2 gap-6">
        {[
          { label: "Women", img: PRODUCTS[2].image },
          { label: "Men", img: PRODUCTS[1].image },
        ].map((c) => (
          <Link key={c.label} to="/shop" className="group relative aspect-[5/3] rounded-3xl overflow-hidden">
            <img src={c.img} alt={c.label} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent" />
            <div className="absolute bottom-6 left-6 text-background">
              <p className="text-xs tracking-widest uppercase opacity-80">Shop</p>
              <p className="font-display text-3xl">{c.label}</p>
            </div>
          </Link>
        ))}
      </section>

      {/* CTA banner */}
      <section className="container-x pb-24">
        <div className="rounded-3xl p-10 md:p-16 text-center" style={{ background: "var(--gradient-soft)" }}>
          <h2 className="font-display text-3xl md:text-5xl max-w-2xl mx-auto">Found a piece you love?</h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            Order directly through WhatsApp — fast, simple, and personal. Pay securely by bank transfer on confirmation.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <a href={whatsappLink("Hi E Style 👋, I'd like to place an order.")} target="_blank" rel="noreferrer" className="btn-primary">Message us on WhatsApp</a>
            <Link to="/contact" className="btn-outline">View payment details</Link>
          </div>
        </div>
      </section>
    </>
  );
}
