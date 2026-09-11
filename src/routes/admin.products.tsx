import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect, type ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, X, Upload, ArrowUp, ArrowDown, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { fmtNGN, slugify } from "@/lib/admin-utils";
import type { Product } from "@/lib/products";

export const Route = createFileRoute("/admin/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [open, setOpen] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, active")
        .order("name");

      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (categoryFilter !== "all" && p.category_id !== categoryFilter) return false;
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [products, q, statusFilter, categoryFilter]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "price-low") return Number(a.price) - Number(b.price);
    if (sort === "price-high") return Number(b.price) - Number(a.price);
    return 0;
  }), [filtered, sort]);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() {
    setEditing({
      status: "active",
      price: 0,
      stock: 0,
      discount_percent: 0,
      images: [],
    });
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} of {products.length}
          </p>
        </div>

        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> New product
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search products…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <Select value={categoryFilter} onValueChange={(value) => { setCategoryFilter(value); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="price-low">Price low</SelectItem>
            <SelectItem value="price-high">Price high</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-background rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Product</th>
                <th className="p-3">Price</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    No products.
                  </td>
                </tr>
              ) : (
                paged.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {p.images[0] ? (
                          <img src={p.images[0]} className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted" />
                        )}

                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.sku || p.slug}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3">{fmtNGN(p.sale_price ?? p.price)}{p.sale_price != null && <span className="ml-1 text-xs text-muted-foreground line-through">{fmtNGN(p.price)}</span>}</td>

                    <td className="p-3">
                      <span className={p.stock <= 5 ? "text-amber-600 font-medium" : ""}>
                        {p.stock}
                      </span>
                    </td>

                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full capitalize ${
                          p.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : p.status === "draft"
                            ? "bg-muted text-muted-foreground"
                            : "bg-zinc-200 text-zinc-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => openEdit(p)} className="p-2 hover:bg-muted rounded">
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button onClick={() => supabase.from("products").update({ featured: !p.featured }).eq("id", p.id).then(({ error }) => { if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["admin-products"] }); })} className="p-2 hover:bg-muted rounded" title="Toggle featured">
                          <Star className={`h-4 w-4 ${p.featured ? "fill-primary text-primary" : ""}`} />
                        </button>

                        <ConfirmDialog
                          trigger={
                            <button className="p-2 hover:bg-muted rounded text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          }
                          title={`Delete "${p.name}"?`}
                          onConfirm={() => del.mutateAsync(p.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pageCount > 1 && <div className="flex items-center justify-between text-sm"><span>Page {page} of {pageCount}</span><div className="flex gap-2"><button className="btn-ghost" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button className="btn-ghost" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>}

      <ProductDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        categories={categories as { id: string; name: string }[]}
        onSaved={() => {
          setOpen(false);
          qc.invalidateQueries({ queryKey: ["admin-products"] });
        }}
      />
    </div>
  );
}

// ... existing imports ...
// ... existing types ...

function ProductDialog({
  open,
  onOpenChange,
  initial,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Partial<Product> | null;
  categories: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Product>>(initial ?? {});
  const [uploading, setUploading] = useState(false);
  const { data: allProducts = [] } = useQuery({
    queryKey: ["all-products"],
    queryFn: async () => {
        const { data } = await supabase.from("products").select("id, name, images");
        return data || [];
    }
  });
  const [images, setImages] = useState<{ file: File | null; url: string; isPrimary: boolean }[]>(
    (initial?.images || []).map((url, i) => ({ file: null, url, isPrimary: i === 0 }))
  );

  useEffect(() => {
    if (open) {
      setForm({
        status: "active",
        price: 0,
        stock: 0,
        discount_percent: 0,
        images: [],
        product_type: "standard",
        promotion_status: "regular",
        bundle_items: [],
        ...initial
      });
      setImages((initial?.images || []).map((url, i) => ({ file: null, url, isPrimary: i === 0 })));

      if (initial?.id) {
        supabase.from("bundles")
          .select("child_product_id, quantity, products:child_product_id(id, name)")
          .eq("parent_product_id", initial.id)
          .then(({ data }) => {
            if (data) {
              setForm(prev => ({
                ...prev,
                bundle_items: data.map((item: any) => ({
                    ...item.products,
                    id: item.child_product_id,
                    quantity: item.quantity
                }))
              }));
            }
          });
      }
    }
  }, [open, initial]);

  function set<K extends keyof Product>(k: K, v: Product[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Auto discount calc
  useEffect(() => {
    if (form.price && form.sale_price && form.sale_price < form.price) {
      const discount = Math.round(((form.price - form.sale_price) / form.price) * 100);
      set("discount_percent", discount);
    } else {
      set("discount_percent", 0);
    }
  }, [form.price, form.sale_price]);

  async function save() {
    if (!form.name) {
      toast.error("Name required");
      return;
    }

    setUploading(true);
    const uploadedUrls: string[] = [];
    
    try {
        // Upload new images
        for (const img of images) {
            if (img.file) {
                const fileName = `${Date.now()}-${crypto.randomUUID()}-${img.file.name.replace(/\s+/g, "-")}`;
                const { data: uploadData, error } = await supabase.storage
                  .from("product-images")
                  .upload(fileName, img.file);
                if (error) throw error;
                const { data: publicData } = supabase.storage.from("product-images").getPublicUrl(uploadData.path);
                uploadedUrls.push(publicData.publicUrl);
            } else {
                uploadedUrls.push(img.url);
            }
        }

        const payload = {
            name: form.name,
            slug: form.slug || slugify(form.name),
            description: form.description ?? null,
            category_id: form.category_id || null,
            sku: form.sku?.trim() || null,
            price: Number(form.price || 0),
            sale_price: form.sale_price == null || form.sale_price === 0 ? null : Number(form.sale_price),
            discount_percent: Number(form.discount_percent || 0),
            stock: Number(form.stock || 0),
            images: uploadedUrls,
            status: form.status ?? "draft",
            featured: !!form.featured,
            product_type: form.product_type || "standard",
            promotion_status: form.promotion_status || "regular"
        };

        let result;
        if (form.id) {
            result = await supabase.from("products").update(payload).eq("id", form.id);
        } else {
            result = await supabase.from("products").insert(payload);
        }

        if (result?.error) throw result.error;
        
        // Storage cleanup
        const removedImages = (initial?.images || []).filter(oldUrl => !uploadedUrls.includes(oldUrl));
        if (removedImages.length > 0) {
            const paths = removedImages.map(url => {
                const marker = "/storage/v1/object/public/product-images/";
                return url.includes(marker) ? decodeURIComponent(url.split(marker)[1]) : "";
            }).filter(Boolean);
            if (paths.length > 0) await supabase.storage.from("product-images").remove(paths);
        }

        // Bundle persistence
        if (form.product_type === 'bundle' && form.bundle_items) {
            await supabase.from("bundles").delete().eq("parent_product_id", form.id!);
            await supabase.from("bundles").insert(
                form.bundle_items.map((item: any) => ({
                    parent_product_id: form.id!,
                    child_product_id: item.id,
                    quantity: item.quantity
                }))
            );
        } else if (form.id) {
            await supabase.from("bundles").delete().eq("parent_product_id", form.id);
        }

        toast.success(form.id ? "Product updated" : "Product created");
        onSaved();
    } catch (e) {
        toast.error((e as Error).message);
    } finally {
        setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit product" : "New product"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={form.product_type ?? "standard"} onValueChange={(v) => set("product_type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="bundle">Bundle</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Promotion</Label>
              <Select value={form.promotion_status ?? "regular"} onValueChange={(v) => set("promotion_status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="flash_sale">Flash Sale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>SKU</Label>
              <Input value={form.sku ?? ""} onChange={(e) => set("sku", e.target.value)} />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label>Price (₦)</Label>
              <Input type="number" value={form.price ?? ""} onChange={(e) => set("price", Number(e.target.value) as any)} />
            </div>
            <div>
              <Label>Sale price (₦)</Label>
              <Input type="number" value={form.sale_price ?? ""} onChange={(e) => set("sale_price", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div>
              <Label>Stock</Label>
              <Input type="number" value={form.stock ?? ""} onChange={(e) => set("stock", Number(e.target.value) as any)} />
            </div>
          </div>

// ... inside ProductDialog:
          {form.product_type === 'bundle' && (
             <div className="p-4 border rounded space-y-4">
                <Label>Bundle Items</Label>
                {/* Simplified Bundle logic */}
                <div className="flex gap-2">
                    <Select onValueChange={(v) => {
                        const p = allProducts.find(x => x.id === v);
                        if (p) setForm(prev => ({ ...prev, bundle_items: [...(prev.bundle_items || []), { ...p, quantity: 1 }] }));
                    }}>
                        <SelectTrigger><SelectValue placeholder="Add product" /></SelectTrigger>
                        <SelectContent className="z-[100]">
                           {allProducts.filter(p => p.id !== form.id).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                {(form.bundle_items || []).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                            <span>{item.name}</span>
                            <Input 
                                type="number" 
                                className="w-16 h-8"
                                value={item.quantity} 
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    setForm(prev => ({
                                        ...prev,
                                        bundle_items: prev.bundle_items?.map((it, idx) => idx === i ? { ...it, quantity: val } : it)
                                    }));
                                }}
                            />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setForm(prev => ({ ...prev, bundle_items: prev.bundle_items?.filter((_, idx) => idx !== i) }))}>Remove</Button>
                    </div>
                ))}
             </div>
          )}

          <div>
            <Label>Description</Label>
            <Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={uploading}>{uploading ? "Saving..." : "Save Changes"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}