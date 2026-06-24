import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  images: string[];
  created_at: string;
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error.message);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>🛒 Admin Products</h1>

      {loading && <p>Loading...</p>}

      {!loading && products.length === 0 && (
        <p>No products found.</p>
      )}

      <table border={1} cellPadding={10} style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Image</th>
            <th>Name</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Date</th>
          </tr>
        </thead>

        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>
                <img
                  src={p.images?.[0] ?? ""}
                  width={50}
                  height={50}
                  style={{ objectFit: "cover" }}
                />
              </td>
              <td>{p.name}</td>
              <td>₦{p.price}</td>
              <td>{p.stock}</td>
              <td>{new Date(p.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}