import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "@tanstack/react-router";

type Product = {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  stock: number;
  images: string[];
  created_at: string;
  status: "active" | "draft";
  category_id: string | null;
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<keyof Product>("created_at");

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order(sortBy, { ascending: false });

    if (error) console.error(error.message);
    else setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [sortBy]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      (statusFilter === "all" || p.status === statusFilter) &&
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search, statusFilter]);

  const deleteProduct = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) alert(error.message);
    else fetchProducts();
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>🛒 Admin Products</h1>
      <div className="flex gap-4 mb-4">
        <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(val) => setSortBy(val as keyof Product)}>
          <SelectTrigger><SelectValue placeholder="Sort By" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="price">Price</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {loading && <p>Loading...</p>}

      {!loading && (
        <table border={1} cellPadding={10} style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => (
              <tr key={p.id}>
                <td><img src={p.images?.[0] ?? ""} width={50} height={50} style={{ objectFit: "cover" }} /></td>
                <td>{p.name}</td>
                <td>₦{p.price} {p.sale_price && <span className="text-red-500">₦{p.sale_price}</span>}</td>
                <td>{p.stock}</td>
                <td>{p.status}</td>
                <td>
                  <Link to="/admin/edit-product/$id" params={{ id: p.id }}><Button size="sm">Edit</Button></Link>
                  <Button size="sm" variant="destructive" onClick={() => deleteProduct(p.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}