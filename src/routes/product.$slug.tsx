import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Minus, Plus, ShoppingBag } from "lucide-react";
import { getProductBySlug, formatNaira, normalizeProduct } from "@/lib/products";
import { colorToCss } from "@/lib/colors";
import { useCart } from "@/lib/cart";
import { ProductCard } from "@/components/ProductCard";
import { BuyNowDialog } from "@/components/BuyNowDialog";
import { SizeChartDialog } from "@/components/SizeChartDialog";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL", "XXXL"];

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — SupplierAffordable` }] }),
  component: ProductDetails,
});

function ProductDetails() {
  const { slug } = Route.useParams();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("M");
  const [selectedColor, setSelectedColor] = useState<string | undefined>();
  const [selectedImage, setSelectedImage] = useState(0);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => getProductBySlug(slug),
  });

  useEffect(() => {
    if (product && product.colors && product.colors.length > 0) {
      setSelectedColor(product.colors[0]);
    }
  }, [product]);

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
      return (data ?? []).map(normalizeProduct);
    },
  });

  if (isLoading) return <section className="container-x py-24 text-center text-muted-foreground">Loading product…</section>;
  if (isError || !product) return <section className="container-x py-24 text-center"><h1 className="font-display text-3xl">Product unavailable</h1><p className="mt-2 text-muted-foreground">This product may have been unpublished or removed.</p><Link to="/shop" className="btn-primary mt-6 inline-flex">Back to shop</Link></section>;

  const sizes = product.sizes?.length ? product.sizes : DEFAULT_SIZES;
  const images = product.images && product.images.length ? product.images : [product.image_url, product.image].filter(Boolean) as string[];
  const colorImages = product.color_images ?? {};
  const colorSpecificImage = selectedColor ? colorImages[selectedColor] : null;
  const primaryImage = colorSpecificImage ?? images[selectedImage] ?? "";
  const price = product.sale_price ?? product.price;
  const discount = product.sale_price && product.price > 0 ? Math.round((1 - product.sale_price / product.price) * 100) : product.discount_percent;
  const isOutOfStock = product.stock <= 0;
  const isLowStock = !isOutOfStock && product.stock <= (product.low_stock_threshold ?? 5);

  return <section className="container-x py-16 md:py-24">
    <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"><ArrowLeft size={16} /> Back to shop</Link>
    <div className="mt-10 grid lg:grid-cols-2 gap-12 lg:gap-20">
      <div className="space-y-4">
        <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-muted shadow-sm">
          {primaryImage ? <img src={primaryImage} alt={product.name} className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <span className="text-sm text-muted-foreground">No image available</span>}
        </div>
        {product.images && product.images.length > 1 && <div className="grid grid-cols-5 gap-3">{product.images.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => setSelectedImage(index)} className={`aspect-square overflow-hidden rounded-xl border-2 transition-all ${selectedImage === index ? "border-primary shadow-sm" : "border-border hover:border-border/80"}`}>{image ? <img src={image} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" /> : <span className="text-xs text-muted-foreground">No image</span>}</button>)}</div>}
      </div>
      <div className="flex flex-col">
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold">{product.category ?? "Collection"}</p>
        <h1 className="font-display text-4xl md:text-6xl mt-3 leading-tight">{product.name}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {isOutOfStock ? (
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">OUT OF STOCK</span>
          ) : isLowStock ? (
            <span className="inline-flex items-center rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white">LOW STOCK · {product.stock} left</span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">IN STOCK</span>
          )}
        </div>
        <div className="h-px bg-border my-8" />
        <p className="text-muted-foreground leading-8 text-lg">{product.description || "A carefully selected piece from our current collection."}</p>
        
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Select Size</label>
            <SizeChartDialog />
          </div>
          <div className="flex gap-3 mt-3">
            {sizes.map(size => (
              <button 
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={`w-14 h-14 border-2 rounded-xl font-bold transition-all ${selectedSize === size ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {product.colors && product.colors.length > 0 && (
            <div className="mt-8">
            <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Select Colour {selectedColor && `— ${selectedColor}`}</label>
            <div className="flex gap-3 mt-3 flex-wrap">
                {product.colors.map((color: string) => (
                <button 
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-14 h-14 border-2 rounded-full font-bold transition-all flex items-center justify-center ${selectedColor === color ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border hover:border-primary"}`}
                    style={{ backgroundColor: colorToCss(color) }}
                    aria-label={`Select colour ${color}`}
                >
                  {selectedColor === color && <span className="w-3 h-3 rounded-full bg-white/70" />}
                </button>
                ))}
            </div>
            </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <div className="flex items-center rounded-full border border-border">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="p-4 hover:text-primary"><Minus size={18} /></button>
                <span className="w-12 text-center font-bold">{quantity}</span>
                <button type="button" onClick={() => setQuantity((value) => value + 1)} className="p-4 hover:text-primary"><Plus size={18} /></button>
            </div>
            <button type="button" disabled={product.stock === 0} onClick={() => addItem(product, selectedSize, selectedColor, quantity)} className="btn-primary flex-1 justify-center disabled:opacity-50 !py-4 !text-base">Add to cart</button>
        </div>
        <div className="mt-4"><BuyNowDialog product={product} preselectedColor={selectedColor} trigger={<button type="button" className="btn-outline w-full justify-center !py-4 !text-base">Buy now</button>} /></div>
        <p className="mt-8 text-sm text-muted-foreground border-t pt-6">Lagos delivery: Delivery fee is paid directly to the rider upon arrival. It is separate from your online order payment.</p>

        {/* Reviews Section */}
        <div className="mt-12 border-t pt-8">
            <h3 className="font-display text-2xl mb-6">Customer Reviews</h3>
            <p className="text-muted-foreground">No reviews yet. Be the first to review this product.</p>
        </div>
      </div>
    </div>
    {related.length > 0 && <div className="mt-24 border-t pt-20"><h2 className="font-display text-4xl text-center">You may also like</h2><div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">{related.map((item) => <ProductCard key={item.id} product={item as never} />)}</div></div>}
  </section>;
}
