import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/products";
import { useFavorites } from "@/lib/favorites";
import { ProductCard } from "@/components/ProductCard";
import { Heart, ShoppingBag, ArrowRight } from "lucide-react";
import { useState } from "react";
import { QuickViewModal } from "@/components/QuickViewModal";
import type { Product } from "@/lib/products";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "My Favorites — SupplierAffordable" },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { favorites } = useFavorites();
  const { data: allProducts = [] } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const [quickProduct, setQuickProduct] = useState<Product | null>(null);

  const favoriteProducts = allProducts.filter((p) => favorites.includes(p.id));

  return (
    <div className="container-x py-12 space-y-8">
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
          <Heart size={24} className="fill-primary" />
        </div>
        <h1 className="font-display text-4xl sm:text-5xl text-primary">My Favorites</h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-md">
          Curated items you love. Access your saved pieces anytime.
        </p>
      </div>

      {favoriteProducts.length === 0 ? (
        <div className="py-20 text-center space-y-4 rounded-3xl border border-dashed border-border bg-card/50">
          <Heart size={48} className="mx-auto text-muted-foreground/40" />
          <h2 className="font-display text-2xl">No favorites yet</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Explore our latest collections and click the heart icon on any piece to save it here.
          </p>
          <div className="pt-2">
            <Link to="/shop" className="btn-primary inline-flex items-center gap-2">
              Explore Products <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {favoriteProducts.map((p) => (
            <ProductCard key={p.id} product={p} onQuickPreview={(prod) => setQuickProduct(prod)} />
          ))}
        </div>
      )}

      <QuickViewModal
        product={quickProduct}
        isOpen={!!quickProduct}
        onClose={() => setQuickProduct(null)}
      />
    </div>
  );
}
