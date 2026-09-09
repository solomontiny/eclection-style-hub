import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { getCategories } from "@/lib/products";
import { ImageUploader } from "./ImageUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category_id: z.string().min(1, "Category is required"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  sale_price: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  status: z.enum(["active", "draft"]),
}).refine(data => !data.sale_price || data.sale_price <= data.price, {
  message: "Sale price cannot exceed regular price",
  path: ["sale_price"],
});

type FormValues = z.infer<typeof schema>;

interface ProductFormProps {
  initialData?: any;
  onSubmit: (data: FormValues, images: { file: File | null; url: string; isPrimary: boolean }[]) => void;
  loading?: boolean;
}

export function ProductForm({ initialData, onSubmit, loading }: ProductFormProps) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [images, setImages] = useState<{ file: File | null; url: string; isPrimary: boolean }[]>(
    initialData?.images?.map((url: string, index: number) => ({ file: null, url, isPrimary: index === 0 })) || []
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialData || { status: "active" },
  });

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit(data, images);
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input {...form.register("name")} placeholder="Product Name" />
      <Textarea {...form.register("description")} placeholder="Description" />
      
      <Select onValueChange={(val) => form.setValue("category_id", val)} defaultValue={initialData?.category_id}>
        <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
        <SelectContent>
          {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="flex gap-4">
        <Input {...form.register("price")} placeholder="Regular Price" type="number" />
        <Input {...form.register("sale_price")} placeholder="Sale Price (Optional)" type="number" />
        <Input {...form.register("stock")} placeholder="Stock" type="number" />
      </div>

      <div className="flex items-center gap-2">
        <label>Active</label>
        <Switch checked={form.watch("status") === "active"} onCheckedChange={(checked) => form.setValue("status", checked ? "active" : "draft")} />
      </div>

      <ImageUploader images={images} setImages={setImages} />

      <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Product"}</Button>
    </form>
  );
}
