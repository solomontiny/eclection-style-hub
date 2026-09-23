import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { slugify } from "@/lib/admin-utils";

export const Route = createFileRoute("/admin/categories")({ component: CategoriesPage });

type Category = { id: string; name: string; slug: string; description: string | null; image_url: string | null; active: boolean; product_count?: number };

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function CategoriesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-categories-full"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*, products(count)").order("name");
      if (error) throw error;
      return (data ?? []).map((category) => ({ ...category, product_count: (category.products as { count: number }[] | undefined)?.[0]?.count ?? 0 })) as Category[];
    },
  });

  const save = useMutation({
    mutationFn: async (c: Partial<Category>) => {
      const payload = { name: c.name!, slug: c.slug || slugify(c.name!), description: c.description ?? null, image_url: c.image_url ?? null, active: c.active ?? true };
      if (c.id) {
        const { error } = await supabase.from("categories").update(payload).eq("id", c.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); setOpen(false); qc.invalidateQueries({ queryKey: ["admin-categories-full"] }); qc.invalidateQueries({ queryKey: ["admin-categories"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (category: Category) => {
      if ((category.product_count ?? 0) > 0) throw new Error("Reassign or remove this category's products before deleting it.");
      const { error } = await supabase.from("categories").delete().eq("id", category.id); if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-categories-full"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function uploadCategoryImage(file: File) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Allowed: JPEG, PNG, WebP");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("File too large. Max 5MB.");
      return;
    }
    setUploadingImage(true);
    try {
      const fileName = `${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/\s+/g, "-")}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from("site-media").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from("site-media").getPublicUrl(uploadData.path);
      setEditing((prev) => ({ ...prev, image_url: publicData.publicUrl }));
      toast.success("Category image uploaded");
    } catch (e) {
      toast.error(`Upload failed: ${(e as Error).message}`);
    } finally {
      setUploadingImage(false);
    }
  }

  function removeCategoryImage() {
    setEditing((prev) => ({ ...prev, image_url: null }));
    toast.success("Category image removed");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div><h1 className="font-display text-3xl">Categories</h1><p className="text-sm text-muted-foreground mt-1">{data.length} total</p></div>
        <button onClick={() => { setEditing({}); setOpen(true); }} className="btn-primary flex items-center gap-2"><Plus className="h-4 w-4" /> New</button>
      </div>

      <div className="bg-background rounded-2xl border border-border divide-y divide-border">
        {isLoading ? <p className="p-6 text-center text-muted-foreground text-sm">Loading…</p> :
         data.length === 0 ? <p className="p-6 text-center text-muted-foreground text-sm">No categories yet.</p> :
         data.map((c) => (
          <div key={c.id} className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.slug} · {c.product_count ?? 0} products{c.description ? ` — ${c.description}` : ""}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => { setEditing(c); setOpen(true); }} className="p-2 hover:bg-muted rounded"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => save.mutate({ ...c, active: !c.active })} className="px-2 text-xs text-muted-foreground">{c.active ? "Active" : "Inactive"}</button>
              <ConfirmDialog
                trigger={<button className="p-2 hover:bg-muted rounded text-destructive"><Trash2 className="h-4 w-4" /></button>}
                title={`Delete "${c.name}"?`}
                onConfirm={() => del.mutateAsync(c)}
              />
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} category</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={editing?.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label>Slug</Label><Input value={editing?.slug ?? ""} placeholder="auto" onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={editing?.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing?.active ?? true} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active in shop</label>
            <div>
              <Label>Category Image</Label>
              <div className="flex items-center gap-3 mt-1">
                {editing?.image_url ? (
                  <img src={editing.image_url} alt="Category preview" className="h-16 w-16 object-cover rounded border" onError={(e) => { (e.currentTarget as HTMLImageElement).src = ""; }} />
                ) : (
                  <div className="h-16 w-16 rounded border border-dashed border-border bg-muted flex items-center justify-center"><ImageIcon size={20} className="text-muted-foreground" /></div>
                )}
                <div className="flex flex-col gap-1">
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImageFile(f); uploadCategoryImage(f); e.target.value = ""; } }} />
                  <Button type="button" variant="outline" size="sm" onClick={() => { const el = document.querySelector('input[type="file"]') as HTMLInputElement | null; el?.click(); }} disabled={uploadingImage}>
                    {uploadingImage ? "Uploading…" : <><Upload size={14} className="mr-1" /> {editing?.image_url ? "Replace" : "Upload"}</>}
                  </Button>
                  {editing?.image_url && (
                    <Button type="button" variant="ghost" size="sm" onClick={removeCategoryImage} className="text-destructive">Remove</Button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button onClick={() => editing?.name && save.mutate(editing)} className="btn-primary">Save</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
