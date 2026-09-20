import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, ScanLine, SlidersHorizontal, Sparkles } from "lucide-react";
import heroBathroom from "@/assets/hero-bathroom.jpg";
import heroKitchen from "@/assets/hero-kitchen.jpg";
import { Button } from "@/components/ui/button";
import { getCatalogStats } from "@/lib/api.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KOHLER Fit Finder — See it. Scan it. Find the right fit." },
      {
        name: "description",
        content:
          "Use AI to identify your bathroom or kitchen fixture and discover KOHLER products suited to your space and budget.",
      },
      { property: "og:title", content: "KOHLER Fit Finder" },
      {
        property: "og:description",
        content:
          "Scan a fixture, confirm the possible issue, and get KOHLER bathroomware and kitchenware matched to your space and budget.",
      },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    icon: SlidersHorizontal,
    title: "Tell us your space",
    body: "Bathroom or kitchen, dimensions in feet, inches or centimetres, and the budget you have in mind.",
  },
  {
    icon: Camera,
    title: "Scan the fixture",
    body: "Use your phone camera or upload a photo of the faucet, basin, toilet, shower or sink.",
  },
  {
    icon: ScanLine,
    title: "Confirm what you see",
    body: "The detector suggests a fixture and a possible issue. You confirm it before anything is recommended.",
  },
  {
    icon: Sparkles,
    title: "Get matched products",
    body: "A rule-based engine scores KOHLER price book products against category, budget, size and finish.",
  },
];

function Landing() {
  const fetchStats = useServerFn(getCatalogStats);
  const { data: stats } = useQuery({ queryKey: ["catalog-stats"], queryFn: () => fetchStats() });

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="animate-rise space-y-7">
            <p className="eyebrow">Bathroomware &amp; Kitchenware · India</p>
            <h1 className="text-[2.6rem] leading-[1.05] sm:text-6xl">
              See it. Scan it.
              <br />
              Find the right fit.
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
              Use AI to identify your bathroom or kitchen fixture and discover KOHLER products
              suited to your space and budget.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-none px-8 tracking-wide">
                <Link to="/scan">Start Scan</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-none px-8">
                <Link to="/products">Browse Products</Link>
              </Button>
            </div>
            <dl className="grid max-w-md grid-cols-3 gap-6 border-t border-border pt-6">
              <div>
                <dt className="eyebrow">Catalog records</dt>
                <dd className="text-2xl">{stats ? stats.total.toLocaleString("en-IN") : "—"}</dd>
              </div>
              <div>
                <dt className="eyebrow">Categories</dt>
                <dd className="text-2xl">{stats ? stats.bySubcategory.length : "—"}</dd>
              </div>
              <div>
                <dt className="eyebrow">Price book</dt>
                <dd className="text-2xl">2026</dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <img
              src={heroBathroom}
              alt="Wall-hung washbasin with a slim chrome faucet in a calm stone bathroom"
              width={1600}
              height={1200}
              className="w-full object-cover"
            />
            <img
              src={heroKitchen}
              alt="Undermount kitchen sink with a pull-down faucet on a stone countertop"
              width={1200}
              height={1200}
              loading="lazy"
              className="absolute -bottom-8 -left-6 hidden w-40 border-8 border-background object-cover shadow-[var(--shadow-lift)] sm:block lg:w-48"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-2 max-w-2xl text-3xl sm:text-4xl">
          Four steps from a photo to a shortlist you can defend.
        </h2>
        <div className="mt-10 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="space-y-3 bg-card p-6">
              <s.icon className="size-5 text-accent" />
              <p className="eyebrow">Step {i + 1}</p>
              <h3 className="text-xl">{s.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4">
            <p className="eyebrow">What the catalog covers</p>
            <h2 className="text-3xl sm:text-4xl">Only KOHLER bathroomware and kitchenware.</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every record is extracted from the KOHLER India Price Book 2026 (June Edition). Codes,
              descriptions and MRP are reproduced exactly as printed. Nothing outside bathroomware
              and kitchenware is included, and no product data is invented.
            </p>
          </div>
          <ul className="grid gap-px self-start border border-border bg-border sm:grid-cols-2">
            {(stats?.bySubcategory ?? []).map((row) => (
              <li key={row.subcategory} className="flex items-baseline justify-between bg-card p-4">
                <span className="text-sm">{row.subcategory}</span>
                <span className="text-sm text-muted-foreground">{row.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-3xl sm:text-4xl">Standing in the bathroom right now?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          The scan flow is built mobile-first. Open the camera, capture the fixture, and get a
          shortlist before you leave the room.
        </p>
        <Button asChild size="lg" className="mt-7 rounded-none px-10 tracking-wide">
          <Link to="/scan">Start Scan</Link>
        </Button>
      </section>
    </div>
  );
}
