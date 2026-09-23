import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play } from "lucide-react";
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

  // Determine the media to display. If the primary media fails to load, fall
  // back gracefully to the poster (or the brand placeholder) so we never show a
  // blank grey area.
  const poster = poster_image_url || heroImg;
  const effectiveVideo = !mediaError && video_url ? video_url : null;
  const showPlaceholder = !effectiveVideo;

  return (
    <section className="container-x py-16">
      <div className="relative rounded-3xl overflow-hidden border border-border bg-background shadow-sm">
        <div className="aspect-video w-full relative bg-secondary/30">
          {showPlaceholder ? (
            <img
              src={poster}
              alt={video_title || "SupplierAffordable style collection"}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => setMediaError(true)}
            />
          ) : (
            <>
              <video
                className="h-full w-full object-cover"
                src={effectiveVideo!}
                controls
                playsInline
                muted
                poster={poster}
                onError={() => setMediaError(true)}
              />
              {!video_url && poster_image_url && (
                <img
                  src={poster_image_url}
                  alt={video_title || "Brand advertisement"}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
            </>
          )}

          {/* Premium play overlay shown when there is a video but no controls visible */}
          {effectiveVideo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="rounded-full bg-primary/80 p-4 text-primary-foreground shadow-lg">
                <Play size={28} />
              </div>
            </div>
          )}
        </div>

        {(video_title || video_description) && (
          <div className="p-6 sm:p-8 border-t border-border">
            {video_title && <h3 className="font-display text-2xl sm:text-3xl text-primary">{video_title}</h3>}
            {video_description && <p className="mt-2 text-base text-muted-foreground">{video_description}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
