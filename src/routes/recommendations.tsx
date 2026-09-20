import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { SpaceLayout2D } from "@/components/space-layout-2d";
import {
  getRecommendations,
  getConfigurations,
} from "@/lib/api.functions";
import { useSession } from "@/lib/session-store";
import { ISSUE_LABELS, OBJECT_LABELS, formatINR } from "@/types/domain";

export const Route = createFileRoute("/recommendations")({
  head: () => ({
    meta: [
      { title: "Your KOHLER matches — Fit Finder" },
      {
        name: "description",
        content:
          "Ranked KOHLER bathroomware and kitchenware matched to your confirmed fixture issue, space and budget, with the reasoning behind each score.",
      },
      { property: "og:title", content: "Your KOHLER matches" },
      {
        property: "og:description",
        content:
          "See which KOHLER price book products fit your space and budget, and exactly why each one scored.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecommendationsPage,
});

function RecommendationsPage() {
  const { scans, profile, saved, compare, hydrated, toggleSaved, toggleCompare } = useSession();
  const scan = scans[0];
  const run = useServerFn(getRecommendations);
  const runConfigurations = useServerFn(getConfigurations);

  const ready = Boolean(scan?.detected_object && scan?.confirmed_issue && profile);

  const { data, isPending, isError } = useQuery({
    queryKey: ["recommendations", scan?.id],
    enabled: hydrated && ready,
    queryFn: () =>
      run({
        data: {
          detected_object: scan!.detected_object!,
          confirmed_issue: scan!.confirmed_issue!,
          space_profile: profile!,
        },
      }),
  });
  const {
  data: configurations,
  isPending: configurationsPending,
  isError: configurationsError,
} = useQuery({
  queryKey: ["configurations", scan?.id],
  enabled: hydrated && ready,
  queryFn: () =>
    runConfigurations({
      data: {
        detected_object: scan!.detected_object!,
        confirmed_issue: scan!.confirmed_issue!,
        space_profile: profile!,
      },
    }),
});

  if (!hydrated) {
    return <Shell><p className="text-sm text-muted-foreground">Loading your scan…</p></Shell>;
  }

  if (!ready) {
    return (
      <Shell>
        <h1 className="text-3xl sm:text-4xl">No confirmed scan yet</h1>
        <p className="max-w-lg text-sm text-muted-foreground">
          Recommendations are generated from a scan you have confirmed. Start a scan, or browse the
          price book catalog directly.
        </p>
        <div className="flex gap-3">
          <Button asChild className="rounded-none px-8">
            <Link to="/scan">Start Scan</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-none px-8">
            <Link to="/products">Browse Catalog</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-3">
        <p className="eyebrow">Step 4 · Recommendations</p>
        <h1 className="text-3xl sm:text-4xl">
          {OBJECT_LABELS[scan!.detected_object!]} ·{" "}
          {ISSUE_LABELS[scan!.confirmed_issue!].toLowerCase()}
        </h1>
        <dl className="grid gap-px border border-border bg-border sm:grid-cols-4">
          <Fact label="Space" value={profile!.space_type === "kitchen" ? "Kitchen" : "Bathroom"} />
          <Fact
            label="Budget"
            value={`${formatINR(profile!.budget_min)} – ${
              profile!.budget_max ? formatINR(profile!.budget_max) : "no cap"
            }`}
          />
          <Fact
            label="Dimensions"
            value={
              profile!.length && profile!.width
                ? `${profile!.length} × ${profile!.width} ${profile!.unit}`
                : "Not provided"
            }
          />
          <Fact label="Finish" value={profile!.finish ?? "No preference"} />
        </dl>
      </div>

      {isPending && <p className="text-sm text-muted-foreground">Scoring the price book…</p>}
      {isError && (
        <p className="text-sm text-destructive">
          The recommendation engine could not run. Please try the scan again.
        </p>
      )}

      {data && (
        <>
          <p className="text-xs text-muted-foreground">
            {data.categoryMatches} price book records in this category were scored out of{" "}
            {data.considered} total. Scoring: category/issue 40, budget 20, size 20, style 10,
            finish 10.
          </p>

          {data.recommendations.length === 0 ? (
            <div className="panel space-y-3 p-6">
              <h2 className="text-xl">No product cleared the match threshold</h2>
              <p className="text-sm text-muted-foreground">
                Nothing in this category scored above 55 against your budget and space. Widen the
                budget band on the scan, or browse the full category in the catalog.
              </p>
              <Button asChild variant="outline" className="rounded-none">
                <Link to="/products">Browse Catalog</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.recommendations.map((rec) => (
                <ProductCard
                  key={rec.product.sku}
                  product={rec.product}
                  matchScore={rec.match_score}
                  reasons={rec.reasons}
                  saved={saved.includes(rec.product.sku)}
                  comparing={compare.includes(rec.product.sku)}
                  onSave={() => toggleSaved(rec.product.sku)}
                  onCompare={() => {
                    if (!toggleCompare(rec.product.sku))
                      toast.error("You can compare up to 3 products at a time.");
                  }}
                />
              ))}
            </div>
          )}

          {configurationsPending && (
  <div className="panel p-6">
    <p className="text-sm text-muted-foreground">
      Building complete product configurations…
    </p>
  </div>
)}

{configurationsError && (
  <div className="panel p-6">
    <p className="text-sm text-destructive">
      Complete configurations could not be generated.
    </p>
  </div>
)}

{configurations && configurations.length > 0 && (
  <section className="space-y-5 border-t border-border pt-8">
    <div className="space-y-2">
      <p className="eyebrow">Complete configuration</p>
      <h2 className="text-2xl sm:text-3xl">
        Build your {profile!.space_type}
      </h2>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Product combinations generated from the KOHLER price book and your
        confirmed space, finish and budget requirements.
      </p>
    </div>

    <div className="space-y-8">
      {configurations.map((configuration, index) => (
        <div
          key={configuration.items
            .map((item) => item.product.sku)
            .join("-")}
          className="panel flex flex-col gap-5 p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">
                Configuration {index + 1}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {configuration.match_score}% configuration match
              </p>
            </div>

            <div className="text-right">
              <p className="text-lg font-medium">
                {formatINR(configuration.total_price)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatINR(configuration.budget_remaining)} remaining
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {configuration.items.map((item) => (
              <div
                key={item.product.sku}
                className="border-t border-border pt-3"
              >
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {item.category}
                </p>
                <p className="mt-1 text-sm font-medium">
                  {item.product.product_name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.product.sku}
                </p>
                <p className="mt-1 text-sm">
                  {formatINR(item.product.price)}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            {configuration.reasons.map((reason, reasonIndex) => (
              <p
                key={`${reason.text}-${reasonIndex}`}
                className="text-xs leading-relaxed text-muted-foreground"
              >
                {reason.ok === true ? "✓" : reason.ok === false ? "!" : "•"}{" "}
                {reason.text}
              </p>
            ))}
          </div>
                              <div className="border-t border-border pt-5">
                      <SpaceLayout2D
                        configuration={configuration}
                        spaceType={profile!.space_type}
                        length={profile!.length}
                        width={profile!.width}
                        unit={profile!.unit}
                      />
                    </div>
        </div>
      ))}
    </div>
  </section>
)}

          {compare.length > 1 && (
            <Button asChild className="rounded-none px-8">
              <Link to="/compare">Compare {compare.length} selected</Link>
            </Button>
          )}



          <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            Detection is assistive and must be confirmed by you, never a diagnosis. Installation
            dimensions that the price book does not publish cannot be verified here — confirm fit
            with a professional before purchase.
          </p>
        </>
      )}
    </Shell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card p-4">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">{children}</div>
  );
}
