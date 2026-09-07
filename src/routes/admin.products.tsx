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
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { fmtNGN, slugify } from "@/lib/admin-utils";

export const Route = createFileRoute("/admin/products")({ component: ProductsPage });

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  sku: string | null;
  price: number;
  sale_price: number | null;
  discount_percent: number;
  stock: number;
  images: string[];
  status: "draft" | "active" | "archived";
  featured: boolean;
};

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

  useEffect(() => {
    if (open) setForm(initial ?? {});
  }, [open, initial]);

  function set<K extends keyof Product>(k: K, v: Product[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const { data, error } = await supabase.storage.from("product-images").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (error) throw error;

      const path = data?.path ?? fileName;
      const { data: publicData } = supabase.storage.from("product-images").getPublicUrl(path);
      const url = publicData.publicUrl;

      setForm((current) => ({
        ...current,
        images: [...(current.images ?? []), url],
      }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function removeImage(index: number) {
    const image = form.images?.[index];
    const marker = "/storage/v1/object/public/product-images/";
    const path = image?.includes(marker) ? decodeURIComponent(image.split(marker)[1]) : "";
    if (path) {
      const { error } = await supabase.storage.from("product-images").remove([path]);
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    setForm((current) => ({
      ...current,
      images: (current.images ?? []).filter((_, i) => i !== index),
    }));
  }

  async function save() {
    if (!form.name) {
      toast.error("Name required");
      return;
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
      images: form.images ?? [],
      status: form.status ?? "draft",
      featured: !!form.featured,
    };

    try {
      let result;
      if (form.id) {
        result = await supabase.from("products").update(payload).eq("id", form.id);
        toast.success("Product updated");
      } else {
        result = await supabase.from("products").insert(payload);
        toast.success("Product created");
      }

      if (result?.error) throw result.error;
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
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
              <Label>SKU</Label>
              <Input value={form.sku ?? ""} onChange={(e) => set("sku", e.target.value)} placeholder="Optional SKU" />
            </div>
            <div>
              <Label>Price (₦)</Label>
              <Input
                type="number"
                value={form.price ?? ""}
                onChange={(e) => set("price", Number(e.target.value) as Product["price"])}
              />
            </div>

            <div>
              <Label>Discount %</Label>
              <Input
                type="number"
                value={form.discount_percent ?? ""}
                onChange={(e) => set("discount_percent", Number(e.target.value) as Product["discount_percent"])}
              />
            </div>

            <div>
              <Label>Sale price (₦)</Label>
              <Input type="number" min="0" value={form.sale_price ?? ""} onChange={(e) => set("sale_price", e.target.value ? Number(e.target.value) : null)} />
            </div>

            <div>
              <Label>Stock</Label>
              <Input
                type="number"
                value={form.stock ?? ""}
                onChange={(e) => set("stock", Number(e.target.value) as Product["stock"])}
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select
                value={form.category_id ?? "none"}
                onValueChange={(value) => set("category_id", value === "none" ? null : (value as Product["category_id"]))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={form.status ?? "draft"}
                onValueChange={(value) => set("status", value as Product["status"])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={!!form.featured}
              onCheckedChange={(checked) => set("featured", (checked === true) as Product["featured"])}
            />
            <Label className="cursor-pointer">Featured product</Label>
          </div>

          <div>
            <Label>Images</Label>
            <div className="mt-2 flex flex-col gap-3">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground hover:bg-muted/50">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading…" : "Upload image"}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              </label>

              {(form.images ?? []).length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(form.images ?? []).map((image, index) => (
                    <div key={`${image}-${index}`} className="relative overflow-hidden rounded-lg border border-border">
                      <img src={image} alt={`Product ${index + 1}`} className="h-32 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 shadow"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 flex gap-1">
                        {index > 0 && <button type="button" onClick={() => setForm((current) => { const images = [...(current.images ?? [])]; [images[index - 1], images[index]] = [images[index], images[index - 1]]; return { ...current, images }; })} className="rounded bg-background/80 p-1.5 shadow"><ArrowUp className="h-4 w-4" /></button>}
                        {index < (form.images?.length ?? 0) - 1 && <button type="button" onClick={() => setForm((current) => { const images = [...(current.images ?? [])]; [images[index], images[index + 1]] = [images[index + 1], images[index]]; return { ...current, images }; })} className="rounded bg-background/80 p-1.5 shadow"><ArrowDown className="h-4 w-4" /></button>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No images yet.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => onOpenChange(false)} className="btn-ghost">
              Cancel
            </button>
            <button onClick={save} className="btn-primary">
              Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}