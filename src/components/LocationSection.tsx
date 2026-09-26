import { MapPin, Navigation } from "lucide-react";

/**
 * Homepage location/map section.
 *
 * Uses only the business location already present in the project
 * ("Lagos, Nigeria" — referenced in the footer, About page, and root meta).
 * No street address is invented. The map is loaded lazily so it never blocks
 * the initial page render.
 */
export function LocationSection() {
  const location = "Lagos, Nigeria";
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

  return (
    <section className="container-x py-16" aria-label="Our location">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Our Location</p>
          <h2 className="font-display text-3xl md:text-4xl mt-1">Based in the heart of Lagos</h2>
          <p className="mt-3 text-muted-foreground max-w-md">
            SupplierAffordable is a Nigerian fashion brand operating from Lagos.
            We serve customers across Nigeria and ship nationwide with reliable
            dispatch and logistics partners.
          </p>
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{location}</span>
            </div>
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
            >
              <Navigation className="h-4 w-4" /> Get directions
            </a>
          </div>
        </div>
        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-border bg-muted">
          <iframe
            title="SupplierAffordable location map"
            src={`https://www.google.com/maps?q=${encodeURIComponent(location)}&output=embed`}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            aria-label="Map showing Lagos, Nigeria"
          />
        </div>
      </div>
    </section>
  );
}