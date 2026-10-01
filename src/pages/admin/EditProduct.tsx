import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/ProductForm";
import { parseColorsString } from "@/lib/colors";
import { storagePathsFromUrls, uploadProductImage } from "@/lib/image-upload";

export default function EditProduct() {
  const navigate = useNavigate();
  const { id } = useParams({ from: "/admin/edit-product/$id" });
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("products").select("*").eq("id", id).single().then(({ data }) => setProduct(data));
  }, [id]);

  const handleSubmit = async (data: any, images: { file: File | null; url: string; isPrimary: boolean }[]) => {
    setLoading(true);

    const uploadedUrls: string[] = [];
    const removedImages = product.images.filter((oldUrl: string) => !images.find(img => img.url === oldUrl));

    for (const img of images) {
      if (img.file) {
        // Compressed in the browser and stored under a brand-new path, so the
        // one-year cache lifetime can never serve a stale image.
        const { url } = await uploadProductImage(img.file);
        uploadedUrls.push(url);
      } else {
        uploadedUrls.push(img.url);
      }
    }

    const colorsArr = parseColorsString(data.colors);
    const sizesArr = parseColorsString(data.sizes);
    const colorImages = data.color_images ?? null;

    const { error } = await supabase.from("products").update({
      ...data,
      colors: colorsArr,
      sizes: sizesArr,
      color_images: colorImages,
      images: uploadedUrls,
    }).eq("id", id);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    // Cleanup removed images from storage. remove() needs bucket-relative
    // paths, and the stored references are public URLs.
    const reclaimable = storagePathsFromUrls(removedImages);
    if (reclaimable.length > 0) {
      await supabase.storage.from("product-images").remove(reclaimable);
    }

    setLoading(false);
    alert("Product updated successfully ✅");
    navigate({ to: "/admin/products" });
  };

  if (!product) return <div>Loading...</div>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>✏️ Edit Product</h1>
      <ProductForm initialData={product} onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
