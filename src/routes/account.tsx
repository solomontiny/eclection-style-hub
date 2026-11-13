import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Package, Camera, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtDate, fmtNGN } from "@/lib/admin-utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fallbackToOriginalImage, getResponsiveImageProps } from "@/lib/responsive-images";
import {
  countUnreadCustomerNotifications,
  customerNotificationPageQueryKey,
  customerOrderPageQueryKey,
  fetchCustomerNotificationPage,
  fetchCustomerOrderPage,
  markCustomerNotificationRead,
} from "@/lib/customer-account-queries.mjs";

export const Route = createFileRoute("/account")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/login", search: { redirect: "/account" } });
  },
  component: AccountPage,
});

function AccountPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [olderNotificationCursors, setOlderNotificationCursors] = useState<{ createdAt: string; id: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["account-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("display_name, phone, created_at, avatar_url").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const ordersQuery = useQuery({
    queryKey: customerOrderPageQueryKey(user?.id),
    enabled: !!user?.id,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: () => fetchCustomerOrderPage({ client: supabase, userId: user!.id }),
  });
  const orders = ordersQuery.data?.items ?? [];

  const notificationsQuery = useQuery({
    queryKey: customerNotificationPageQueryKey(user?.id),
    enabled: !!user?.id,
    staleTime: 15_000,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    queryFn: () => fetchCustomerNotificationPage({ client: supabase, userId: user!.id }),
  });
  const olderNotificationQueries = useQueries({
    queries: olderNotificationCursors.map((cursor) => ({
      queryKey: customerNotificationPageQueryKey(user?.id, cursor),
      enabled: !!user?.id,
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      queryFn: () => fetchCustomerNotificationPage({ client: supabase, userId: user!.id, cursor }),
    })),
  });
  const notificationPages = [notificationsQuery.data, ...olderNotificationQueries.map((query) => query.data)].filter(
    (page): page is NonNullable<typeof notificationsQuery.data> => !!page,
  );
  const notifications = notificationPages.flatMap((page) => page.items);
  const lastNotificationPage = notificationPages.at(-1);
  const unreadNotifications = countUnreadCustomerNotifications(notifications);
  const avatarImageProps = profile?.avatar_url
    ? getResponsiveImageProps(profile.avatar_url, {
        sizes: "96px",
        widths: [100, 200],
        fallbackWidth: 100,
        fallbackHeight: 100,
      })
    : null;

  const markNotificationRead = async (notificationId: string) => {
    const { error } = await supabase.rpc("mark_customer_notification_read", {
      p_notification_id: notificationId,
    });
    if (error) {
      toast.error(error.message || "Could not update notification.");
      return;
    }
    qc.setQueriesData<{ items: { id: string; is_read: boolean }[]; nextCursor: { createdAt: string; id: string } | null }>(
      { queryKey: ["customer-notifications", user?.id] },
      (page) => markCustomerNotificationRead(page, notificationId),
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB.");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/profile-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("customer-profiles").upload(filePath, file, { upsert: true, cacheControl: "public, max-age=31536000, immutable" });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("customer-profiles").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
      if (updateError) throw updateError;

      toast.success("Profile picture updated successfully!");
      qc.invalidateQueries({ queryKey: ["account-profile", user.id] });
    } catch (err) {
      console.error("Profile picture upload failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to upload profile picture.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <section className="container-x py-12 md:py-16 max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-8 border-b border-border">
        <div className="relative group">
          <Avatar className="h-24 w-24 border-2 border-primary/20 shadow-md">
            <AvatarImage
              src={avatarImageProps?.src}
              srcSet={avatarImageProps?.srcSet || undefined}
              sizes={avatarImageProps?.sizes}
              width={avatarImageProps?.width}
              height={avatarImageProps?.height}
              loading="lazy"
              decoding="async"
              onError={fallbackToOriginalImage}
              alt={profile?.display_name ?? "Profile"}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
              {profile?.display_name ? profile.display_name.charAt(0).toUpperCase() : <User className="h-10 w-10" />}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 transition"
            title="Upload profile picture"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">Your account</p>
          <h1 className="font-display text-3xl md:text-4xl mt-1">Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your orders and profile picture.</p>
          <div className="mt-3 flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading…" : "Change photo"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Email</p>
          <p className="mt-2 font-medium">{user?.email}</p>
        </div>
        <div className="rounded-2xl border border-border p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Member since</p>
          <p className="mt-2 font-medium">{profile?.created_at ? fmtDate(profile.created_at) : "—"}</p>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl">Notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">{unreadNotifications} unread in loaded notifications</p>
        {notificationsQuery.isLoading ? (
          <p className="mt-5 text-muted-foreground">Loading notifications…</p>
        ) : notificationsQuery.error ? (
          <p className="mt-5 text-red-500 text-sm">Could not load notifications.</p>
        ) : notifications.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-border p-8 text-center">
            <p className="text-muted-foreground">No notifications yet.</p>
          </div>
        ) : (
          <div className="mt-5 divide-y divide-border rounded-2xl border border-border overflow-hidden">
            {notifications.map((notification) => {
              const orderNumber = Array.isArray(notification.orders)
                ? notification.orders[0]?.order_number
                : notification.orders?.order_number;
              return (
                <div key={notification.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">
                      {notification.title}
                      {!notification.is_read && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-primary align-middle" />}
                    </p>
                    {notification.message && <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>}
                    {orderNumber && (
                      <Link to="/account/orders" className="text-xs text-primary underline mt-1 block">
                        View order {orderNumber}
                      </Link>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{fmtDate(notification.created_at)}</p>
                    {!notification.is_read && (
                      <button
                        type="button"
                        onClick={() => markNotificationRead(notification.id)}
                        className="text-xs text-primary underline mt-1"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {lastNotificationPage?.nextCursor && (
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            disabled={olderNotificationQueries.some((query) => query.isLoading)}
            onClick={() => {
              const failedQuery = olderNotificationQueries.find((query) => query.isError);
              if (failedQuery) {
                void failedQuery.refetch();
                return;
              }
              const cursor = lastNotificationPage.nextCursor;
              if (cursor && !olderNotificationCursors.some((item) => item.id === cursor.id && item.createdAt === cursor.createdAt)) {
                setOlderNotificationCursors((current) => [...current, cursor]);
              }
            }}
          >
            {olderNotificationQueries.some((query) => query.isLoading)
              ? "Loading…"
              : olderNotificationQueries.some((query) => query.isError)
                ? "Retry loading notifications"
                : "Load older notifications"}
          </Button>
        )}
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl">Order history</h2>
        {ordersQuery.isLoading ? (
          <p className="mt-5 text-muted-foreground">Loading orders…</p>
        ) : orders.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-border p-8 text-center">
            <Package className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">Your orders will appear here.</p>
          </div>
        ) : (
          <div className="mt-5 divide-y divide-border rounded-2xl border border-border overflow-hidden">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/20">
                <div>
                  <p className="font-medium">{order.order_number}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(order.created_at)} · Payment: <span className="capitalize">{order.payment_status}</span></p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">{fmtNGN(Number(order.total))}</p>
                  <p className="text-xs capitalize text-muted-foreground">Order status: {order.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {!ordersQuery.isLoading && (
          <Link to="/account/orders" className="mt-4 inline-block text-sm text-primary underline">
            View all orders
          </Link>
        )}
      </div>
    </section>
  );
}
