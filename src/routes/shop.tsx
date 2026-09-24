import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { Product, getProducts } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { QuickViewModal } from "@/components/QuickViewModal";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/shop")({
  head: () => ({ meta: [{ title: "Shop — SupplierAffordable" }, { name: "description", content: "Browse the latest SupplierAffordable collection." }] }),
  component: Shop,
});

function Shop() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [saleOnly, setSaleOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  const { data: products = [], isLoading, isError, refetch } = useQuery<Product[]>({ 
    queryKey: ["products"], 
    queryFn: async () => {
      const data = await getProducts();
      return data;
    },
    staleTime: 30_000 
  });

  const { data: categories = [] } = useQuery({ 
    queryKey: ["store-categories"], 
    queryFn: async () => { 
      const { data, error } = await supabase.from("categories").select("id, name").eq("active", true).order("name"); 
      if (error) throw error; 
      return data ?? []; 
    }, 
    staleTime: 60_000 
  });

  const filtered = useMemo(() => {
    const result = products.filter((product) => {
      const matchesSearch = !search.trim() || `${product.name} ${product.description ?? ""} ${product.sku ?? ""}`.toLowerCase().includes(search.trim().toLowerCase());
      const matchesCategory = category === "all" || product.category === category;
      const matchesSale = !saleOnly || product.sale_price != null;
      return matchesSearch && matchesCategory && matchesSale;
    });
    return result.sort((a, b) => 
      sort === "name" 
        ? a.name.localeCompare(b.name) 
        : sort === "price-low" 
        ? Number(a.sale_price ?? a.price) - Number(b.sale_price ?? b.price) 
        : sort === "price-high" 
        ? Number(b.sale_price ?? b.price) - Number(a.sale_price ?? a.price) 
        : 0
    );
  }, [products, search, category, sort, saleOnly]);

  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <section className="container-x py-10 md:py-20">
      {/* Promotional Announcement Strip */}
      <div className="mb-8 rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3 flex items-center justify-center gap-2 text-center text-xs md:text-sm font-semibold text-primary">
        <Sparkles size={16} className="shrink-0" />
        <span>Nationwide delivery available · Lagos orders: delivery fee paid to rider upon arrival</span>
      </div>

      {/* Header */}
      <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Supplier Affordable</span>
        <h1 className="font-display text-3xl sm:text-4xl md:text-6xl mt-2">Curated Collection</h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">Explore our complete inventory of premium apparel, accessories, and bundles.</p>
      </div>
      
      {/* Search & Filter Toolbar */}
      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            value={search} 
            onChange={(event) => { setSearch(event.target.value); setPage(1); }} 
            placeholder="Search by product name, style, or SKU..." 
            className="input pl-10 pr-10" 
          />
          {search && (
            <button type="button" onClick={() => { setSearch(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Horizontally Scrollable Category Pills (Mobile-first inspiration layout) */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none items-center">
          <button 
            type="button" 
            onClick={() => { setCategory("all"); setPage(1); }} 
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${category === "all" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"}`}
          >
            All Products
          </button>
          {categories.map((item) => (
            <button 
              key={item.id} 
              type="button" 
              onClick={() => { setCategory(item.name); setPage(1); }} 
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${category === item.name ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"}`}
            >
              {item.name}
            </button>
          ))}
        </div>

        {/* Sort & Sale Filter Row */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">Showing <span className="font-bold text-foreground">{filtered.length}</span> products</p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="input text-xs py-2">
              <option value="newest">Sort by: Newest</option>
              <option value="name">Sort by: Name</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
            <button 
              type="button" 
              onClick={() => { setSaleOnly((value) => !value); setPage(1); }} 
              className={`input text-xs py-2 px-4 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${saleOnly ? "!bg-primary !text-primary-foreground !border-primary" : ""}`}
            >
              <SlidersHorizontal size={14} /> {saleOnly ? "Sale Only" : "Sale Filter"}
            </button>
          </div>
        </div>
      </div>

      {/* States */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="aspect-[4/5] rounded-2xl bg-muted" />
              <div className="mt-3 h-4 w-3/4 rounded bg-muted" />
              <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-12 text-center">
          <p className="text-destructive font-medium">We couldn&apos;t load the collection at this time.</p>
          <button type="button" onClick={() => refetch()} className="btn-outline mt-4 text-xs">Try again</button>
        </div>
      )}

      {!isLoading && !isError && visible.length === 0 && (
        <div className="rounded-2xl border border-border p-12 text-center bg-card">
          <h2 className="font-display text-2xl">No products found</h2>
          <p className="mt-2 text-sm text-muted-foreground">Try clearing your filters, changing category, or searching for something else.</p>
          <button type="button" onClick={() => { setSearch(""); setCategory("all"); setSaleOnly(false); }} className="btn-outline mt-5 text-xs">Clear all filters</button>
        </div>
      )}

      {/* Product Grid (2 columns on mobile, responsive up to 4 columns on desktop) */}
      {!isLoading && !isError && visible.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} onQuickPreview={setPreviewProduct} />
            ))}
          </div>

          {pageCount > 1 && (
            <div className="mt-16 flex items-center justify-between border-t border-border pt-6 text-sm">
              <span className="text-muted-foreground">Page {page} of {pageCount}</span>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost text-xs" disabled={page === 1} onClick={() => setPage((v) => v - 1)}>Previous</button>
                <button type="button" className="btn-ghost text-xs" disabled={page === pageCount} onClick={() => setPage((v) => v + 1)}>Next</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick View Preview Modal (Preserves Grid) */}
      <QuickViewModal product={previewProduct} isOpen={!!previewProduct} onClose={() => setPreviewProduct(null)} />
    </section>
  );
}
