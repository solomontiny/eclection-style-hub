import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { slugify } from "@/lib/admin-utils";

export const Route = createFileRoute("/admin/categories")({ component: CategoriesPage });

type Category = { id: string; name: string; slug: string; description: string | null; image_url: string | null };

function CategoriesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Category> | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-categories-full"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  const save = useMutation({
    mutationFn: async (c: Partial<Category>) => {
      const payload = { name: c.name!, slug: c.slug || slugify(c.name!), description: c.description ?? null, image_url: c.image_url ?? null };
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
    mutationFn: async (id: string) => { const { error } = await supabase.from("categories").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-categories-full"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

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
              <p className="text-xs text-muted-foreground">{c.slug}{c.description ? ` — ${c.description}` : ""}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => { setEditing(c); setOpen(true); }} className="p-2 hover:bg-muted rounded"><Pencil className="h-4 w-4" /></button>
              <ConfirmDialog
                trigger={<button className="p-2 hover:bg-muted rounded text-destructive"><Trash2 className="h-4 w-4" /></button>}
                title={`Delete "${c.name}"?`}
                onConfirm={() => del.mutateAsync(c.id)}
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
