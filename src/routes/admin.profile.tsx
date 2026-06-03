import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/profile")({ component: ProfilePage });

type ProfileRow = {
  display_name: string | null;
  phone: string | null;
};

function ProfilePage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");

  const { data: profile, isLoading } = useQuery<ProfileRow | null>({
    queryKey: ["admin-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("display_name, phone").eq("user_id", user!.id).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!isLoading && profile) {
      setDisplayName(profile.display_name ?? "");
      setPhone(profile.phone ?? "");
      setEmail(user?.email ?? "");
    }
  }, [isLoading, profile, user?.email]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No authenticated user");

      const profilePayload = {
        display_name: displayName || null,
        phone: phone || null,
      };

      const { error: profileError } = await supabase.from("profiles").update(profilePayload).eq("user_id", user.id);
      if (profileError) throw profileError;

      if (email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({ email });
        if (authError) throw authError;
      }
    },
    onSuccess: () => {
      toast.success("Profile updated");
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-3xl">Admin profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your administrator profile.</p>
      </div>

      <div className="bg-background rounded-2xl border border-border p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Admin name" />
          </div>
          <div>
            <Label>Role</Label>
            <Input value="admin" disabled />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">User ID</p>
            <p className="text-xs font-mono text-muted-foreground">{user?.id ?? "—"}</p>
          </div>
          <button onClick={() => mutation.mutate()} disabled={mutation.status === "loading"} className="btn-primary">
            {mutation.status === "loading" ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
