import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — E Style Collection" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async ({ location }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } as never });
    }
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      throw redirect({ to: "/" });
    }
  },
  component: AdminHome,
});

function AdminHome() {
  const { user, signOut } = useAuth();

  return (
    <section className="container-x py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">Admin</p>
          <h1 className="font-display text-4xl">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Signed in as {user?.email}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/" className="btn-secondary">View store</Link>
          <button onClick={() => signOut()} className="btn-ghost">Sign out</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[
          { title: "Products", desc: "Manage catalog, prices, sizes.", coming: true },
          { title: "Orders", desc: "Review, fulfil, and track orders.", coming: true },
          { title: "Customers", desc: "View customer accounts.", coming: true },
          { title: "Coupons", desc: "Create discount codes.", coming: true },
          { title: "Banners & content", desc: "Edit homepage banners.", coming: true },
          { title: "Reports", desc: "Sales analytics and exports.", coming: true },
        ].map((c) => (
          <div key={c.title} className="card-elegant p-5">
            <h3 className="font-display text-xl">{c.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{c.desc}</p>
            {c.coming && (
              <span className="inline-block mt-3 text-[11px] uppercase tracking-widest text-primary">
                Coming next
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-dashed border-border p-6 bg-muted/30">
        <h2 className="font-display text-xl mb-2">Foundation ready</h2>
        <p className="text-sm text-muted-foreground">
          Auth, role-based access, and the admin shell are live. Next slices will fill in each card above —
          one shippable feature per message. Let me know which area to build first.
        </p>
      </div>
    </section>
  );
}
