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
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";
import { colorsToString, parseColorsString, colorToCss } from "@/lib/colors";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category_id: z.string().min(1, "Category is required"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  sale_price: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  status: z.enum(["active", "draft"]),
  colors: z.string().optional(),
  sizes: z.string().optional(),
  color_images: z.record(z.string()).nullable().optional(),
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
  const [colorImages, setColorImages] = useState<Record<string, string>>(
    (initialData?.color_images as Record<string, string>) ?? {}
  );
  const [uploadingColor, setUploadingColor] = useState<string | null>(null);

  const initialColors = Array.isArray(initialData?.colors)
    ? colorsToString(initialData.colors)
    : (typeof initialData?.colors === "string" ? initialData.colors : "");

  const initialSizes = Array.isArray(initialData?.sizes)
    ? initialData.sizes.join(", ")
    : (typeof initialData?.sizes === "string" ? initialData.sizes : "");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...(initialData ?? { status: "active" }),
      colors: initialColors,
      sizes: initialSizes,
    },
  });

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  const colorsText = form.watch("colors");
  const colorNames = parseColorsString(colorsText) ?? [];

  const handleColorImageUpload = async (colorName: string, file: File) => {
    setUploadingColor(colorName);
    try {
      const fileName = `${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/\s+/g, "-")}`;
      const { data: uploadData, error } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (error) {
        alert("Image upload failed: " + error.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(uploadData.path);

      setColorImages((prev) => ({ ...prev, [colorName]: publicUrl }));
    } finally {
      setUploadingColor(null);
    }
  };

  const removeColorImage = (colorName: string) => {
    setColorImages((prev) => {
      const next = { ...prev };
      delete next[colorName];
      return next;
    });
  };

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit(
      { ...data, color_images: Object.keys(colorImages).length > 0 ? colorImages : null },
      images
    );
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

      <div>
        <Label>Colors (comma-separated)</Label>
        <Input
          {...form.register("colors")}
          placeholder="e.g. Black, White, Red"
          maxLength={500}
        />
      </div>

      <div>
        <Label>Sizes (comma-separated)</Label>
        <Input
          {...form.register("sizes")}
          placeholder="e.g. S, M, L, XL, XXL, XXXL"
          maxLength={500}
        />
      </div>

      {colorNames.length > 0 && (
        <div className="space-y-3">
          <Label>Colour Images</Label>
          <p className="text-xs text-muted-foreground">Upload an image for each colour variant.</p>
          {colorNames.map((colorName) => (
            <div key={colorName} className="flex items-center gap-4 p-4 border border-border rounded-lg">
              <div
                className="w-8 h-8 rounded-full border-2 border-border flex-shrink-0"
                style={{ backgroundColor: colorToCss(colorName) }}
              />
              <span className="w-24 text-sm font-medium">{colorName}</span>
              {colorImages[colorName] ? (
                <div className="flex items-center gap-2">
                  <img src={colorImages[colorName]} alt={colorName} className="w-16 h-16 object-cover rounded border" />
                  <button
                    type="button"
                    onClick={() => removeColorImage(colorName)}
                    className="p-1 hover:bg-muted rounded"
                    aria-label={`Remove ${colorName} image`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center w-16 h-16 border-2 border-dashed border-border rounded cursor-pointer hover:border-primary">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleColorImageUpload(colorName, file);
                      e.target.value = "";
                    }}
                    disabled={uploadingColor === colorName}
                  />
                  <Upload size={16} className="text-muted-foreground" />
                </label>
              )}
            </div>
          ))}
        </div>
      )}

      <ImageUploader images={images} setImages={setImages} />

      <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Product"}</Button>
    </form>
  );
}
