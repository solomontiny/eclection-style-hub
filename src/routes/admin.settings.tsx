import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Play, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for video, 5MB for images
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState({
    store_name: "",
    store_description: "",
    contact_email: "",
    contact_phone: "",
    currency: "NGN",
    shipping_flat_rate: 0,
    tax_percent: 0,
    store_policies: "",
    video_url: "" as string | null,
    video_title: "" as string | null,
    video_description: "" as string | null,
    poster_image_url: "" as string | null,
    is_video_advert_enabled: false as boolean | null,
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);

  useEffect(() => {
    supabase
      .from("shop_settings")
      .select("*")
      .eq("id", "default")
      .single()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        if (data) setSettings({ ...settings, ...data });
        setLoadingSettings(false);
      });
  }, []);

  async function changePassword() {
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Password updated"); setNewPassword(""); }
  }

  async function saveSettings() {
    setBusy(true);
    const { error } = await supabase.from("shop_settings").upsert({ id: "default", ...settings });
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Shop settings saved");
      qc.invalidateQueries({ queryKey: ["shop_settings_video"] });
    }
  }

  async function uploadMedia(
    file: File,
    setUploading: (v: boolean) => void,
    type: "video" | "poster"
  ) {
    const allowedTypes = type === "video" ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
    const maxSize = type === "video" ? MAX_FILE_SIZE : MAX_IMAGE_SIZE;
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Invalid file type for ${type}. Allowed: ${allowedTypes.join(", ")}`);
      return;
    }
    if (file.size > maxSize) {
      toast.error(`File too large. Max ${type === "video" ? "50MB" : "5MB"}.`);
      return;
    }
    setUploading(true);
    try {
      const fileName = `${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/\s+/g, "-")}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from("site-media").upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from("site-media").getPublicUrl(uploadData.path);
      if (type === "video") {
        setSettings((s) => ({ ...s, video_url: publicData.publicUrl }));
      } else {
        setSettings((s) => ({ ...s, poster_image_url: publicData.publicUrl }));
      }
      toast.success(`${type} uploaded successfully`);
    } catch (e) {
      toast.error(`Upload failed: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  function removeVideo() {
    setSettings((s) => ({ ...s, video_url: null }));
    setVideoFile(null);
    toast.success("Video removed");
  }

  function removePoster() {
    setSettings((s) => ({ ...s, poster_image_url: null }));
    setPosterFile(null);
    toast.success("Poster removed");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="font-display text-3xl">Settings</h1><p className="text-sm text-muted-foreground mt-1">Admin profile</p></div>

      <div className="bg-background rounded-2xl border border-border p-6 space-y-4">
        <h2 className="font-display text-lg">Shop settings</h2>
        {loadingSettings ? <p className="text-sm text-muted-foreground">Loading settings…</p> : <>
          <div><Label>Store name</Label><Input value={settings.store_name} onChange={(e) => setSettings({ ...settings, store_name: e.target.value })} /></div>
          <div><Label>Store description</Label><Input value={settings.store_description ?? ""} onChange={(e) => setSettings({ ...settings, store_description: e.target.value })} /></div>
          <div className="grid sm:grid-cols-2 gap-3"><div><Label>Contact email</Label><Input type="email" value={settings.contact_email ?? ""} onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })} /></div><div><Label>Contact phone</Label><Input value={settings.contact_phone ?? ""} onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })} /></div></div>
          <div className="grid sm:grid-cols-3 gap-3"><div><Label>Currency</Label><Input value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value.toUpperCase() })} /></div><div><Label>Shipping flat rate</Label><Input type="number" min="0" value={settings.shipping_flat_rate} onChange={(e) => setSettings({ ...settings, shipping_flat_rate: Number(e.target.value) })} /></div><div><Label>Tax %</Label><Input type="number" min="0" max="100" value={settings.tax_percent} onChange={(e) => setSettings({ ...settings, tax_percent: Number(e.target.value) })} /></div></div>
          <div><Label>Store policies</Label><Input value={settings.store_policies ?? ""} onChange={(e) => setSettings({ ...settings, store_policies: e.target.value })} /></div>
          <div className="pt-4 border-t border-border">
            <h3 className="font-medium mb-2">Homepage Video Advert</h3>
            <div className="flex items-center space-x-2 mb-2">
              <input type="checkbox" id="enabled" checked={!!settings.is_video_advert_enabled} onChange={(e) => setSettings({ ...settings, is_video_advert_enabled: e.target.checked })} />
              <Label htmlFor="enabled">Enable Video Advert section</Label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[200px]"><Label>Video URL</Label><Input value={settings.video_url ?? ""} onChange={(e) => setSettings({ ...settings, video_url: e.target.value })} placeholder="https://..." /></div>
              <div>
                <Label>&nbsp;</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("video-file-input")?.click()} disabled={uploadingVideo}>
                  {uploadingVideo ? "Uploading…" : <><Upload size={14} className="mr-1" /> Video</>}
                </Button>
                <input id="video-file-input" type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setVideoFile(f); uploadMedia(f, setUploadingVideo, "video"); e.target.value = ""; } }} />
              </div>
              {settings.video_url && (
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setSettings((s) => ({ ...s, video_url: null })); setVideoFile(null); }} aria-label="Remove video"><Trash2 size={14} /></Button>
                </div>
              )}
            </div>
            {settings.video_url && (
              <div className="mt-2 rounded-xl overflow-hidden border border-border bg-secondary/30 aspect-video max-h-48 flex items-center justify-center">
                <video src={settings.video_url} controls playsInline muted className="max-h-full max-w-full" poster={settings.poster_image_url || undefined} />
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-3 mt-2">
              <div><Label>Video title</Label><Input value={settings.video_title ?? ""} onChange={(e) => setSettings({ ...settings, video_title: e.target.value })} /></div>
              <div><Label>Video description</Label><Input value={settings.video_description ?? ""} onChange={(e) => setSettings({ ...settings, video_description: e.target.value })} /></div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <div className="flex-1 min-w-[200px]"><Label>Poster Image URL</Label><Input value={settings.poster_image_url ?? ""} onChange={(e) => setSettings({ ...settings, poster_image_url: e.target.value })} placeholder="https://..." /></div>
              <div>
                <Label>&nbsp;</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("poster-file-input")?.click()} disabled={uploadingPoster}>
                  {uploadingPoster ? "Uploading…" : <><Upload size={14} className="mr-1" /> Poster</>}
                </Button>
                <input id="poster-file-input" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPosterFile(f); uploadMedia(f, setUploadingPoster, "poster"); e.target.value = ""; } }} />
              </div>
              {settings.poster_image_url && (
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setSettings((s) => ({ ...s, poster_image_url: null })); setPosterFile(null); }} aria-label="Remove poster"><Trash2 size={14} /></Button>
                </div>
              )}
            </div>
            {settings.poster_image_url && (
              <div className="mt-2 rounded-xl overflow-hidden border border-border bg-secondary/30 max-h-32">
                <img src={settings.poster_image_url} alt="Poster preview" className="h-full max-h-32 w-full object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
          </div>
          <button onClick={saveSettings} disabled={busy} className="btn-primary">{busy ? "Saving…" : "Save shop settings"}</button>
        </>}
      </div>

      <div className="bg-background rounded-2xl border border-border p-6 space-y-4">
        <h2 className="font-display text-lg">Account</h2>
        <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
        <div><Label>User ID</Label><Input value={user?.id ?? ""} disabled className="font-mono text-xs" /></div>
      </div>

      <div className="bg-background rounded-2xl border border-border p-6 space-y-4">
        <h2 className="font-display text-lg">Change password</h2>
        <div><Label>New password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" /></div>
        <button onClick={changePassword} disabled={busy} className="btn-primary">{busy ? "Updating…" : "Update password"}</button>
      </div>
    </div>
  );
}
