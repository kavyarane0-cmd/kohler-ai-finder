import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { getProductsByIds } from "@/lib/api.functions";
import { useSession } from "@/lib/session-store";
import { ISSUE_LABELS, OBJECT_LABELS, formatINR } from "@/types/domain";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — KOHLER Fit Finder" },
      {
        name: "description",
        content:
          "Review your saved KOHLER products, your space profile and every fixture scan you have confirmed.",
      },
      { property: "og:title", content: "Your KOHLER Fit Finder dashboard" },
      {
        property: "og:description",
        content: "Saved products, space profile and scan history in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { profile, scans, saved, compare, hydrated, toggleSaved, toggleCompare } = useSession();
  const fetchByIds = useServerFn(getProductsByIds);

  const { data: savedProducts } = useQuery({
    queryKey: ["saved", saved.join(",")],
    enabled: hydrated && saved.length > 0,
    queryFn: () => fetchByIds({ data: { ids: saved } }),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-12 sm:px-6">
      <div className="space-y-2">
        <p className="eyebrow">Dashboard</p>
        <h1 className="text-3xl sm:text-4xl">Your space, scans and saved products</h1>
        <p className="text-sm text-muted-foreground">
          Everything here is stored only in this browser. Uploaded photos are never saved.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl">Space profile</h2>
        {profile ? (
          <dl className="grid gap-px border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">
            <Fact label="Space" value={profile.space_type === "kitchen" ? "Kitchen" : "Bathroom"} />
            <Fact
              label="Dimensions"
              value={
                profile.length && profile.width
                  ? `${profile.length} × ${profile.width} ${profile.unit}`
                  : "Not provided"
              }
            />
            <Fact
              label="Budget"
              value={`${formatINR(profile.budget_min)} – ${
                profile.budget_max ? formatINR(profile.budget_max) : "no cap"
              }`}
            />
            <Fact label="Style" value={profile.style ?? "No preference"} />
            <Fact label="Finish" value={profile.finish ?? "No preference"} />
          </dl>
        ) : (
          <EmptyState text="No space profile yet. Run a scan to create one." />
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl">Scan history</h2>
          <Button asChild size="sm" className="rounded-none">
            <Link to="/scan">New scan</Link>
          </Button>
        </div>
        {scans.length === 0 ? (
          <EmptyState text="No scans recorded yet." />
        ) : (
          <ul className="grid gap-px border border-border bg-border">
            {scans.map((scan) => (
              <li
                key={scan.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-card p-4"
              >
                <div>
                  <p className="text-sm">
                    {scan.detected_object ? OBJECT_LABELS[scan.detected_object] : "Unidentified"} ·{" "}
                    {scan.confirmed_issue
                      ? ISSUE_LABELS[scan.confirmed_issue]
                      : "Issue not confirmed"}
                  </p>
                  <p className="eyebrow mt-1">
                    {new Date(scan.created_at).toLocaleString("en-IN")} ·{" "}
                    {Math.round(scan.object_confidence * 100)}% detection confidence
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {scan.space_profile.space_type === "kitchen" ? "Kitchen" : "Bathroom"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl">Saved products</h2>
          {compare.length > 1 && (
            <Button asChild size="sm" variant="outline" className="rounded-none">
              <Link to="/compare">Compare {compare.length} selected</Link>
            </Button>
          )}
        </div>
        {saved.length === 0 ? (
          <EmptyState text="Nothing saved yet — use the Save button on any product." />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(savedProducts ?? []).map((product) => (
              <ProductCard
                key={product.sku}
                product={product}
                saved
                comparing={compare.includes(product.sku)}
                onSave={() => toggleSaved(product.sku)}
                onCompare={() => {
                  if (!toggleCompare(product.sku))
                    toast.error("You can compare up to 3 products at a time.");
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
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

function EmptyState({ text }: { text: string }) {
  return <p className="border border-border bg-surface p-6 text-sm text-muted-foreground">{text}</p>;
}
