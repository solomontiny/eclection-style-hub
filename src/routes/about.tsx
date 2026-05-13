import { createFileRoute } from "@tanstack/react-router";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — E Style Collection" },
      { name: "description", content: "Lagos-based fashion label curating affordable, elevated styles for women and men." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <section className="container-x py-16 grid lg:grid-cols-2 gap-12 items-center">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">Our story</p>
        <h1 className="font-display text-4xl md:text-6xl mt-2">Style that's accessible — and unmistakably you.</h1>
        <p className="mt-5 text-muted-foreground">
          E Style Collection is a Lagos-based fashion label founded on a simple idea: beautiful clothes shouldn't be out of reach. We curate fresh women's and men's pieces every week — from everyday essentials to standout occasion wear.
        </p>
        <p className="mt-4 text-muted-foreground">
          Every order is personal. We chat with you, confirm fit and availability, and ship across Lagos and Nigeria with care.
        </p>
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { k: "1k+", v: "Happy customers" },
            { k: "Weekly", v: "New arrivals" },
            { k: "Lagos", v: "Same-day delivery" },
          ].map((s) => (
            <div key={s.v} className="rounded-2xl bg-secondary p-4">
              <p className="font-display text-2xl text-primary">{s.k}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.v}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-[var(--shadow-card)]">
        <img src={hero} alt="E Style Collection" className="h-full w-full object-cover" />
      </div>
    </section>
  );
}
