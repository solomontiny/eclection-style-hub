import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/ProductForm";

export default function AddProduct() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any, images: { file: File | null; url: string; isPrimary: boolean }[]) => {
    setLoading(true);

    const uploadedUrls: string[] = [];
    for (const img of images) {
      if (img.file) {
        const { data: uploadData, error } = await supabase.storage
          .from("product-images")
          .upload(`${crypto.randomUUID()}-${img.file.name}`, img.file);
        
        if (error) {
          alert("Image upload failed");
          setLoading(false);
          return;
        }
        uploadedUrls.push(uploadData.path);
      } else {
        uploadedUrls.push(img.url);
      }
    }

    const colorsArr = data.colors
      ? data.colors.split(",").map((c: string) => c.trim()).filter(Boolean)
      : null;

    const baseSlug = data.name.toLowerCase().replace(/\s+/g, "-");
    let productSlug = baseSlug;
    const { data: existing } = await supabase.from("products").select("id").eq("slug", productSlug).maybeSingle();
    if (existing) {
      productSlug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
    }

    const { error } = await supabase.from("products").insert([{
      ...data,
      colors: colorsArr,
      images: uploadedUrls,
      slug: productSlug,
    }]);

    setLoading(false);
    if (error) {
      alert(error.message);
      return;
    }

    alert("Product added successfully ✅");
    navigate({ to: "/admin/products" });
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>➕ Add Product</h1>
      <ProductForm onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}

