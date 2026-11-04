import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/ProductForm";
import { parseColorsString } from "@/lib/colors";
import { uploadMultipleProductImages, deleteProductImages } from "@/lib/image-upload";

export default function EditProduct() {
  const navigate = useNavigate();
  const { id } = useParams({ from: "/admin/edit-product/$id" });
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("products").select("id, name, slug, description, category_id, price, discount_percent, stock, low_stock_threshold, images, status, featured, created_at, updated_at, sku, sale_price, product_type, promotion_status, colors, sizes, color_images").eq("id", id).single().then(({ data }) => setProduct(data));
  }, [id]);

  const handleSubmit = async (data: any, images: { file: File | null; url: string; isPrimary: boolean }[]) => {
    setLoading(true);

    const uploadedUrls: string[] = [];
    const filesToUpload = images.filter((img) => img.file).map((img) => img.file!);
    const keptUrls = images.filter((img) => !img.file).map((img) => img.url);
    
    if (filesToUpload.length > 0) {
      try {
        const results = await uploadMultipleProductImages(filesToUpload);
        uploadedUrls.push(...results.map((r) => r.publicUrl));
      } catch (e) {
        alert("Image upload failed: " + (e as Error).message);
        setLoading(false);
        return;
      }
    }
    
    uploadedUrls.push(...keptUrls);

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

    // Cleanup removed images from storage
    const removedImages = product.images.filter((oldUrl: string) => !uploadedUrls.includes(oldUrl));
    if (removedImages.length > 0) {
      await deleteProductImages(removedImages);
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
