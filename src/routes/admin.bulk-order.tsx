import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Package, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { fmtNGN, slugify } from "@/lib/admin-utils";
import { colorsToString, parseColorsString, colorToCss } from "@/lib/colors";
import type { Product } from "@/lib/products";

export const Route = createFileRoute("/admin/bulk-order")({
  component: BulkOrderAdminPage,
});

function BulkOrderAdminPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [open, setOpen] = useState(false);

  const { data: bundles = [], isLoading } = useQuery({
    queryKey: ["admin-bulk-order-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("product_type", "bundle")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
  });

  const filtered = useMemo(() => {
    return bundles.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (q && !b.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [bundles, q, statusFilter]);

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
      await supabase.from("bundles").delete().eq("parent_product_id", id);
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bulk order item deleted successfully");
      qc.invalidateQueries({ queryKey: ["admin-bulk-order-products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() {
    setEditing({
      status: "active",
      price: 60000,
      stock: 100,
      discount_percent: 0,
      images: [],
      product_type: "bundle",
      bundle_items: [],
    });
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing({ ...p, product_type: "bundle" });
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Bulk Order</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage wholesale items and custom bundle offerings ({filtered.length} of {bundles.length})
          </p>
        </div>

        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> New bulk item
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search bulk order items…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

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
                <th className="p-3">Bulk Item</th>
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
                    Loading bulk order items…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    No bulk order items found.
                  </td>
                </tr>
              ) : (
                paged.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted grid place-items-center text-muted-foreground"><Package size={16} /></div>
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
                        <button onClick={() => openEdit(p)} className="p-2 hover:bg-muted rounded" title="Edit bulk item">
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button onClick={() => supabase.from("products").update({ featured: !p.featured }).eq("id", p.id).then(({ error }) => { if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["admin-bulk-order-products"] }); })} className="p-2 hover:bg-muted rounded" title="Toggle featured">
                          <Star className={`h-4 w-4 ${p.featured ? "fill-primary text-primary" : ""}`} />
                        </button>

                        <ConfirmDialog
                          trigger={
                            <button className="p-2 hover:bg-muted rounded text-destructive" title="Delete bulk item">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          }
                          title={`Delete bulk item "${p.name}"?`}
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

      <BulkItemDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onSaved={() => {
          setOpen(false);
          qc.invalidateQueries({ queryKey: ["admin-bulk-order-products"] });
        }}
      />
    </div>
  );
}

function BulkItemDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Partial<Product> | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Product>>(initial ?? {});
  const [colorsText, setColorsText] = useState("");
  const [sizesText, setSizesText] = useState("");
  const [colorImages, setColorImages] = useState<Record<string, string>>({});
  const [uploadingColor, setUploadingColor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [images, setImages] = useState<{ file: File | null; url: string; isPrimary: boolean }[]>(
    (initial?.images || []).map((url, i) => ({ file: null, url, isPrimary: i === 0 }))
  );

  useEffect(() => {
    if (open) {
      setForm({
        status: "active",
        price: 60000,
        stock: 100,
        discount_percent: 0,
        images: [],
        product_type: "bundle",
        ...initial
      });
      setImages((initial?.images || []).map((url, i) => ({ file: null, url, isPrimary: i === 0 })));
      setColorsText(colorsToString(initial?.colors));
      setSizesText(Array.isArray(initial?.sizes) ? initial.sizes.join(", ") : "S, M, L, XL, XXL, XXXL");
      setColorImages((initial?.color_images as Record<string, string>) ?? {});
    }
  }, [open, initial]);

  function set<K extends keyof Product>(k: K, v: Product[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    if (!form.name) {
      toast.error("Item name is required");
      return;
    }

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
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
        sku: form.sku?.trim() || null,
        price: Number(form.price || 60000),
        sale_price: form.sale_price == null || form.sale_price === 0 ? null : Number(form.sale_price),
        discount_percent: Number(form.discount_percent || 0),
        stock: Number(form.stock || 100),
        images: uploadedUrls,
        status: form.status ?? "active",
        featured: !!form.featured,
        product_type: "bundle",
        promotion_status: "regular",
        colors: parseColorsString(colorsText),
        sizes: parseColorsString(sizesText),
        color_images: Object.keys(colorImages).length > 0 ? colorImages : null
      };

      let result;
      if (form.id) {
        result = await supabase.from("products").update(payload).eq("id", form.id);
      } else {
        result = await supabase.from("products").insert(payload);
      }

      if (result?.error) throw result.error;

      toast.success(form.id ? "Bulk item updated successfully" : "Bulk item created successfully");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const colorNames = parseColorsString(colorsText) ?? [];

  const handleColorImageUpload = async (colorName: string, file: File) => {
    setUploadingColor(colorName);
    try {
      const fileName = `${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/\s+/g, "-")}`;
      const { data: uploadData, error } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);
      if (error) throw error;
      const { data: publicData } = supabase.storage.from("product-images").getPublicUrl(uploadData.path);
      setColorImages((prev) => ({ ...prev, [colorName]: publicData.publicUrl }));
      toast.success(`Image uploaded for ${colorName}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploadingColor(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit Bulk Order Item" : "New Bulk Order Item"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Item Name *</Label>
              <Input
                value={form.name ?? ""}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Custom 10-Piece Wholesale Bundle"
              />
            </div>
            <div>
              <Label>SKU</Label>
              <Input
                value={form.sku ?? ""}
                onChange={(e) => set("sku", e.target.value)}
                placeholder="e.g. BULK-10"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label>Bundle Price (₦)</Label>
              <Input
                type="number"
                min="0"
                value={form.price ?? 60000}
                onChange={(e) => set("price", Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Sale Price (₦)</Label>
              <Input
                type="number"
                min="0"
                value={form.sale_price ?? ""}
                onChange={(e) => set("sale_price", e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div>
              <Label>Stock</Label>
              <Input
                type="number"
                min="0"
                value={form.stock ?? 100}
                onChange={(e) => set("stock", Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe the bulk offering..."
              rows={3}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={form.status ?? "active"} onValueChange={(v) => set("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="featured_bundle"
                checked={!!form.featured}
                onChange={(e) => set("featured", e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="featured_bundle">Featured on Storefront</Label>
            </div>
          </div>

          <div>
            <Label>Colours (comma-separated)</Label>
            <Input
              value={colorsText}
              onChange={(e) => setColorsText(e.target.value)}
              placeholder="Black, White, Red, Blue"
            />
          </div>

          <div>
            <Label>Sizes (comma-separated)</Label>
            <Input
              value={sizesText}
              onChange={(e) => setSizesText(e.target.value)}
              placeholder="S, M, L, XL, XXL, XXXL"
            />
          </div>

          {colorNames.length > 0 && (
            <div className="space-y-2 border border-border/60 rounded-xl p-4 bg-muted/20">
              <Label className="text-xs uppercase font-semibold text-muted-foreground">Colour Specific Images</Label>
              <div className="grid sm:grid-cols-2 gap-3">
                {colorNames.map((col) => (
                  <div key={col} className="flex items-center gap-3 bg-background border border-border p-2 rounded-lg">
                    <span className="w-5 h-5 rounded-full border border-border shrink-0" style={{ backgroundColor: colorToCss(col) }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{col}</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id={`color-img-${col}`}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleColorImageUpload(col, f);
                        }}
                      />
                      <label htmlFor={`color-img-${col}`} className="text-[11px] text-primary cursor-pointer hover:underline">
                        {uploadingColor === col ? "Uploading..." : colorImages[col] ? "Change image" : "Upload image"}
                      </label>
                    </div>
                    {colorImages[col] && (
                      <img src={colorImages[col]} alt={col} className="h-9 w-9 rounded object-cover border border-border" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="mb-2 block">Item Images</Label>
            <ImageUploader
              images={images}
              onChange={setImages}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" onClick={save} disabled={uploading}>
              {uploading ? "Saving..." : form.id ? "Update Item" : "Create Item"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
