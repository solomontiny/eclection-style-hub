import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import { Product, getProducts } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/shop")({
  head: () => ({ meta: [{ title: "Shop — Supplier Affordable" }, { name: "description", content: "Browse the latest Supplier Affordable collection." }] }),
  component: Shop,
});

function Shop() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [saleOnly, setSaleOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [page, setPage] = useState(1);
  const { data: products = [], isLoading, isError, refetch } = useQuery<Product[]>({ 
    queryKey: ["products"], 
    queryFn: async () => {
      console.log("Fetching products...");
      const data = await getProducts();
      console.log("Products fetched:", data.length);
      return data;
    },
    staleTime: 30_000 
  });
  const { data: categories = [] } = useQuery({ queryKey: ["store-categories"], queryFn: async () => { const { data, error } = await supabase.from("categories").select("id, name").eq("active", true).order("name"); if (error) throw error; return data ?? []; }, staleTime: 60_000 });

  const filtered = useMemo(() => {
    const result = products.filter((product) => {
      const matchesSearch = !search.trim() || `${product.name} ${product.description ?? ""} ${product.sku ?? ""}`.toLowerCase().includes(search.trim().toLowerCase());
      const matchesCategory = category === "all" || product.category === category;
      const matchesSale = !saleOnly || product.sale_price != null;
      const matchesAvailability = !availableOnly || product.stock > 0;
      return matchesSearch && matchesCategory && matchesSale && matchesAvailability;
    });
    return result.sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "price-low" ? Number(a.sale_price ?? a.price) - Number(b.sale_price ?? b.price) : sort === "price-high" ? Number(b.sale_price ?? b.price) - Number(a.sale_price ?? a.price) : 0);
  }, [products, search, category, sort, saleOnly, availableOnly]);
  const pageSize = 9;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  return <section className="container-x py-16 md:py-24">
    <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Collection</span>
        <h1 className="font-display text-4xl md:text-6xl mt-4">Shop Everything</h1>
        <p className="mt-4 text-muted-foreground">Discover curated pieces from the current Supplier Affordable collection.</p>
    </div>
    
    <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-4 rounded-2xl border border-border shadow-sm mb-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
        <label className="relative col-span-2 md:col-span-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search..." className="input pl-9" /></label>
        <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="input"><option value="all">All categories</option>{categories.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select>
        <select value={sort} onChange={(event) => setSort(event.target.value)} className="input"><option value="newest">Newest</option><option value="name">Name</option><option value="price-low">Price low</option><option value="price-high">Price high</option></select>
        <button type="button" onClick={() => { setSaleOnly((value) => !value); setPage(1); }} className={`input flex items-center justify-center gap-2 ${saleOnly ? "!bg-primary !text-primary-foreground" : ""}`}><SlidersHorizontal size={15} /> {saleOnly ? "Sale only" : "Filters"}</button>
      </div>
      <label className="inline-flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap px-2"><input type="checkbox" checked={availableOnly} onChange={(event) => { setAvailableOnly(event.target.checked); setPage(1); }} /> In stock</label>
    </div>
    {isLoading && <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="animate-pulse"><div className="aspect-[4/5] rounded-2xl bg-muted" /><div className="mt-4 h-5 w-2/3 rounded bg-muted" /></div>)}</div>}
    {isError && <div className="mt-12 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center"><p>We couldn&apos;t load the collection.</p><button type="button" onClick={() => refetch()} className="btn-outline mt-4">Try again</button></div>}
    {!isLoading && !isError && visible.length === 0 && <div className="mt-12 rounded-2xl border border-border p-12 text-center"><h2 className="font-display text-2xl">No products found</h2><p className="mt-2 text-muted-foreground">Try clearing a filter or searching for something else.</p><button type="button" onClick={() => { setSearch(""); setCategory("all"); setSaleOnly(false); setAvailableOnly(false); }} className="btn-outline mt-5">Clear filters</button></div>}
    {!isLoading && !isError && visible.length > 0 && <><div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">{visible.map((product) => <ProductCard key={product.id} product={product} />)}</div>{pageCount > 1 && <div className="mt-12 flex items-center justify-between text-sm"><span>Page {page} of {pageCount}</span><div className="flex gap-2"><button type="button" className="btn-ghost" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button type="button" className="btn-ghost" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>}</>}
  </section>;
}
