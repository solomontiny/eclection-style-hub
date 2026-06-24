import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";

export default function AddProduct() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrls, setImageUrls] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name || !price || !stock || !imageUrls) {
      alert("Fill all fields");
      return;
    }

    setLoading(true);

    const images = imageUrls.split(",").map(u => u.trim()).filter(Boolean);
    const productSlug = slug || name.toLowerCase().replace(/\s+/g, "-");

    const { error } = await supabase.from("products").insert([
      {
        name,
        slug: productSlug,
        price: Number(price),
        stock: Number(stock),
        images: images,
        status: "draft",
        category_id: null,
        description: null,
        discount_percent: 0,
        featured: false,
      },
    ]);

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

      <input
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <br /><br />

      <input
        placeholder="Slug (optional)"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
      />
      <br /><br />

      <input
        placeholder="Price"
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <br /><br />

      <input
        placeholder="Stock"
        type="number"
        value={stock}
        onChange={(e) => setStock(e.target.value)}
      />
      <br /><br />

      <label>
        Image URLs (comma separated):
        <textarea
          value={imageUrls}
          onChange={(e) => setImageUrls(e.target.value)}
          rows={3}
          style={{ width: "100%" }}
        />
      </label>
      <br /><br />

      <button onClick={handleAdd} disabled={loading}>
        {loading ? "Adding..." : "Add Product"}
      </button>
    </div>
  );
}
