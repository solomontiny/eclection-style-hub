import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Minus, Plus, ShoppingBag } from "lucide-react";
import { getProductBySlug, formatNaira } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { ProductCard } from "@/components/ProductCard";
import { BuyNowDialog } from "@/components/BuyNowDialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Supplier Affordable` }] }),
  component: ProductDetails,
});

function ProductDetails() {
  const { slug } = Route.useParams();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => getProductBySlug(slug),
  });

  useEffect(() => {
    if (!product) return;
    try {
      const previous = JSON.parse(localStorage.getItem("esc:recent-products") || "[]") as string[];
      localStorage.setItem("esc:recent-products", JSON.stringify([product.id, ...previous.filter((id) => id !== product.id)].slice(0, 8)));
    } catch {}
  }, [product]);

  const { data: related = [] } = useQuery({
    queryKey: ["related-products", product?.category_id, product?.id],
    enabled: !!product,
    queryFn: async () => {
      const query = supabase.from("products").select("*, category:categories(name, active)").eq("status", "active").neq("id", product!.id).limit(4);
      const { data, error } = product?.category_id ? await query.eq("category_id", product.category_id) : await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <section className="container-x py-24 text-center text-muted-foreground">Loading product…</section>;
  if (isError || !product) return <section className="container-x py-24 text-center"><h1 className="font-display text-3xl">Product unavailable</h1><p className="mt-2 text-muted-foreground">This product may have been unpublished or removed.</p><Link to="/shop" className="btn-primary mt-6 inline-flex">Back to shop</Link></section>;

  const images = product.images.length ? product.images : [""];
  const price = product.sale_price ?? product.price;
  const discount = product.sale_price && product.price > 0 ? Math.round((1 - product.sale_price / product.price) * 100) : product.discount_percent;

  return <section className="container-x py-10 md:py-16">
    <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft size={16} /> Back to shop</Link>
    <div className="mt-8 grid lg:grid-cols-2 gap-10 lg:gap-16">
      <div className="space-y-3">
        <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-muted grid place-items-center">
          {images[selectedImage] ? <img src={images[selectedImage]} alt={product.name} className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <span className="text-sm text-muted-foreground">No image available</span>}
        </div>
        {images.length > 1 && <div className="grid grid-cols-5 gap-2">{images.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => setSelectedImage(index)} className={`aspect-square overflow-hidden rounded-lg border ${selectedImage === index ? "border-primary" : "border-border"}`}>{image ? <img src={image} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" /> : <span className="text-xs text-muted-foreground">No image</span>}</button>)}</div>}
      </div>
      <div className="max-w-xl">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">{product.category ?? "Collection"}</p>
        <h1 className="font-display text-4xl md:text-5xl mt-2">{product.name}</h1>
        <div className="mt-5 flex items-baseline gap-3"><span className="font-display text-3xl text-primary">{formatNaira(price)}</span>{product.sale_price != null && <span className="text-muted-foreground line-through">{formatNaira(product.price)}</span>}{discount > 0 && <span className="text-xs font-semibold text-emerald-700">-{discount}%</span>}</div>
        <p className="mt-6 whitespace-pre-line text-muted-foreground leading-7">{product.description || "A carefully selected piece from our current collection."}</p>
        <p className={`mt-6 text-sm font-semibold ${product.stock > 0 ? "text-emerald-700" : "text-amber-700"}`}>{product.stock > 0 ? `${product.stock} available` : "Currently out of stock"}</p>
        <div className="mt-6 flex items-center gap-4"><div className="flex items-center rounded-full border border-border"><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="p-3"><Minus size={16} /></button><span className="w-8 text-center">{quantity}</span><button type="button" onClick={() => setQuantity((value) => value + 1)} className="p-3"><Plus size={16} /></button></div><button type="button" disabled={product.stock === 0} onClick={() => addItem(product, "M", quantity)} className="btn-primary flex-1 justify-center disabled:opacity-50"><ShoppingBag size={16} /> Add to cart</button></div>
        <div className="mt-3"><BuyNowDialog product={product} trigger={<button type="button" className="btn-outline w-full justify-center">Buy now on WhatsApp</button>} /></div>
      </div>
    </div>
    {related.length > 0 && <div className="mt-20"><h2 className="font-display text-3xl">You may also like</h2><div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">{related.map((item) => <ProductCard key={item.id} product={item as never} />)}</div></div>}
  </section>;
}
