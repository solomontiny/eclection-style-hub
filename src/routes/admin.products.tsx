import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, X, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { fmtNGN, slugify } from "@/lib/admin-utils";

export const Route = createFileRoute("/admin/products")({ component: ProductsPage });

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  price: number;
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
        .select("id, name")
        .order("name");

      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [products, q, statusFilter]);

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
      status: "draft",
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

        <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                filtered.map((p) => (
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
                          <p className="text-xs text-muted-foreground">{p.slug}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3">{fmtNGN(p.price)}</td>

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
      price: Number(form.price || 0),
      discount_percent: Number(form.discount_percent || 0),
      stock: Number(form.stock || 0),
      images: form.images ?? [],
      status: form.status ?? "draft",
      featured: !!form.featured,
    };

    try {
      if (form.id) {
        await supabase.from("products").update(payload).eq("id", form.id);
        toast.success("Product updated");
      } else {
        await supabase.from("products").insert(payload);
        toast.success("Product created");
      }

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
              <Label>Price (₦)</Label>
              <Input
                type="number"
                value={form.price ?? ""}
                onChange={(e) => set("price", e.target.value as any)}
              />
            </div>

            <div>
              <Label>Discount %</Label>
              <Input
                type="number"
                value={form.discount_percent ?? ""}
                onChange={(e) => set("discount_percent", e.target.value as any)}
              />
            </div>

            <div>
              <Label>Stock</Label>
              <Input
                type="number"
                value={form.stock ?? ""}
                onChange={(e) => set("stock", e.target.value as any)}
              />
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