import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/ProductForm";

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

    const { error } = await supabase.from("products").update({
      ...data,
      images: uploadedUrls,
    }).eq("id", id);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    // Cleanup removed images from storage
    if (removedImages.length > 0) {
      await supabase.storage.from("product-images").remove(removedImages);
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
