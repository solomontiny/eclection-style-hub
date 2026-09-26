import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/ProductForm";
import { parseColorsString } from "@/lib/colors";
import { generateUniqueSlug } from "@/lib/slug";

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

    const colorsArr = parseColorsString(data.colors);
    const sizesArr = parseColorsString(data.sizes);
    const colorImages = data.color_images ?? null;

    // Generate a unique, URL-safe slug. The DB unique constraint is the
    // final guard; this just avoids hitting it in the common case.
    const productSlug = await generateUniqueSlug(supabase, data.name);

    const { error } = await supabase.from("products").insert([{
      ...data,
      colors: colorsArr,
      sizes: sizesArr,
      color_images: colorImages,
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

