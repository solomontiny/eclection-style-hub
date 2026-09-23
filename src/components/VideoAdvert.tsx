import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Play, ShoppingBag } from "lucide-react";
import heroImg from "@/assets/supplier-affordable-hero.png";

type VideoSettings = {
  video_url: string | null;
  video_title: string | null;
  video_description: string | null;
  poster_image_url: string | null;
  is_video_advert_enabled: boolean | null;
};

export function VideoAdvert() {
  const [mediaError, setMediaError] = useState(false);

  const { data: settings } = useQuery<VideoSettings>({
    queryKey: ["shop_settings_video"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_settings")
        .select("video_url, video_title, video_description, poster_image_url, is_video_advert_enabled")
        .eq("id", "default")
        .single();
      if (error) throw error;
      return data as VideoSettings;
    },
  });

  if (!settings || !settings.is_video_advert_enabled) return null;

  const { video_url, video_title, video_description, poster_image_url } = settings;

  // Fallback chain: configured poster -> brand hero asset.
  const poster = poster_image_url || heroImg;
  const hasVideo = !!video_url && !mediaError;

  const title = video_title || "Style That Speaks Volumes";
  const description =
    video_description ||
    "Curated pieces for every occasion — quality fabrics, premium fits, and prices that welcome you back for more.";

  return (
    <section className="container-x py-8">
      <div className="grid grid-cols-1 gap-6 overflow-hidden rounded-3xl border border-border bg-card shadow-sm md:h-80 md:grid-cols-[1fr_1.1fr]">
        <div className="relative flex items-center justify-center bg-secondary/20">
          <div className="relative aspect-video w-full max-w-[520px]">
            {hasVideo ? (
              <video
                className="h-full w-full rounded-2xl object-cover"
                src={video_url!}
                controls
                playsInline
                muted
                poster={poster}
                onError={() => setMediaError(true)}
              />
            ) : (
              <img
                src={poster}
                alt={title}
                className="h-full w-full rounded-2xl object-cover"
                loading="lazy"
                onError={(event) => {
                  const target = event.currentTarget as HTMLImageElement;
                  if (target.src !== heroImg) target.src = heroImg;
                }}
              />
            )}
            {hasVideo && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="rounded-full bg-primary/80 p-3 text-primary-foreground shadow-lg">
                  <Play size={24} />
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 p-2 text-center md:items-start md:text-left">
          <h3 className="font-display text-3xl text-primary md:text-4xl">{title}</h3>
          <p className="max-w-md text-muted-foreground">{description}</p>
          <Link
            to="/shop"
            className="btn-primary inline-flex items-center gap-2 whitespace-nowrap"
          >
            <ShoppingBag size={16} />
            Shop the Collection
          </Link>
        </div>
      </div>
    </section>
  );
}
