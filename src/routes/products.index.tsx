import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/product-card";
import { getCatalogStats, listProducts } from "@/lib/api.functions";
import { useSession } from "@/lib/session-store";
import { BUDGET_PRESETS } from "@/types/domain";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [
      { title: "KOHLER catalog — bathroomware & kitchenware" },
      {
        name: "description",
        content:
          "Browse KOHLER bathroom faucets, washbasins, toilets, showers, bathtubs, kitchen faucets and sinks from the India Price Book 2026.",
      },
      { property: "og:title", content: "KOHLER catalog — bathroomware & kitchenware" },
      {
        property: "og:description",
        content: "Search and filter the KOHLER India Price Book 2026 by category and price band.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const [search, setSearch] = useState("");
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [band, setBand] = useState<number | null>(null);

  const fetchStats = useServerFn(getCatalogStats);
  const fetchProducts = useServerFn(listProducts);
  const { saved, compare, toggleSaved, toggleCompare } = useSession();

  const { data: stats } = useQuery({ queryKey: ["catalog-stats"], queryFn: () => fetchStats() });

  const preset = band != null ? BUDGET_PRESETS[band] : null;
  const { data, isPending } = useQuery({
    queryKey: ["products", search, subcategory, band],
    queryFn: () =>
      fetchProducts({
        data: {
          search: search || undefined,
          subcategory: subcategory ?? undefined,
          minPrice: preset?.min,
          maxPrice: preset?.max ?? null,
          limit: 48,
        },
      }),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
      <div className="space-y-2">
        <p className="eyebrow">Catalog</p>
        <h1 className="text-3xl sm:text-4xl">KOHLER bathroomware &amp; kitchenware</h1>
        <p className="text-sm text-muted-foreground">
          {stats ? `${stats.total.toLocaleString("en-IN")} records · ${stats.source}` : "Loading…"}
        </p>
      </div>

      <div className="space-y-4 border border-border bg-surface p-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product code, description or collection"
          className="rounded-none bg-background"
        />
        <div className="flex flex-wrap gap-2">
          <Chip active={subcategory === null} onClick={() => setSubcategory(null)}>
            All categories
          </Chip>
          {(stats?.bySubcategory ?? []).map((row) => (
            <Chip
              key={row.subcategory}
              active={subcategory === row.subcategory}
              onClick={() => setSubcategory(row.subcategory)}
            >
              {row.subcategory} ({row.count})
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <Chip active={band === null} onClick={() => setBand(null)}>
            Any price
          </Chip>
          {BUDGET_PRESETS.map((p, i) => (
            <Chip key={p.label} active={band === i} onClick={() => setBand(i)}>
              {p.label}
            </Chip>
          ))}
        </div>
      </div>

      {isPending && <p className="text-sm text-muted-foreground">Loading products…</p>}

      {data && (
        <>
          <p className="text-xs text-muted-foreground">
            Showing {data.items.length} record{data.items.length === 1 ? "" : "s"}
            {data.items.length === 48 ? " (first 48 matches)" : ""}.
          </p>
          {data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No price book record matches these filters.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((product) => (
                <ProductCard
                  key={product.sku}
                  product={product}
                  saved={saved.includes(product.sku)}
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
        </>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      size="sm"
      variant={active ? "default" : "outline"}
      className="rounded-none text-xs font-normal"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
