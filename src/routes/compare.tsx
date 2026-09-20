import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductThumb } from "@/components/product-card";
import { getProductsByIds } from "@/lib/api.functions";
import { useSession } from "@/lib/session-store";
import { formatINR, type Product } from "@/types/domain";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare KOHLER products — Fit Finder" },
      {
        name: "description",
        content:
          "Compare up to three KOHLER bathroomware or kitchenware products side by side on price, finish, installation and published dimensions.",
      },
      { property: "og:title", content: "Compare KOHLER products" },
      {
        property: "og:description",
        content: "Side-by-side price book comparison of up to three KOHLER fixtures.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ComparePage,
});

const ROWS: { label: string; get: (p: Product) => string }[] = [
  { label: "Price (MRP)", get: (p) => formatINR(p.price) },
  { label: "SKU", get: (p) => p.sku },
  { label: "Category", get: (p) => p.subcategory },
  { label: "Collection", get: (p) => p.collection ?? "Not published" },
  { label: "Finish", get: (p) => p.finish ?? "Not published" },
  { label: "Installation", get: (p) => p.installation_type ?? "Not published" },
  { label: "Dimensions", get: (p) => p.dimensions ?? "Not published" },
  { label: "Material", get: (p) => p.material ?? "Not published" },
  { label: "Price book page", get: (p) => `p.${p.source_page}` },
];

function ComparePage() {
  const { compare, hydrated, toggleCompare, clearCompare } = useSession();
  const fetchByIds = useServerFn(getProductsByIds);

  const { data: products } = useQuery({
    queryKey: ["compare", compare.join(",")],
    enabled: hydrated && compare.length > 0,
    queryFn: () => fetchByIds({ data: { ids: compare } }),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
      <div className="space-y-2">
        <p className="eyebrow">Compare</p>
        <h1 className="text-3xl sm:text-4xl">Up to three products, side by side</h1>
        <p className="text-sm text-muted-foreground">
          Every value below is reproduced from the KOHLER India Price Book 2026. Blank fields are
          not published in the source.
        </p>
      </div>

      {hydrated && compare.length === 0 && (
        <div className="panel space-y-3 p-6">
          <h2 className="text-xl">Nothing selected yet</h2>
          <p className="text-sm text-muted-foreground">
            Add products from the catalog or your recommendations using the Compare button.
          </p>
          <div className="flex gap-3">
            <Button asChild className="rounded-none px-8">
              <Link to="/products">Browse Catalog</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-none px-8">
              <Link to="/scan">Start Scan</Link>
            </Button>
          </div>
        </div>
      )}

      {products && products.length > 0 && (
        <>
          <div className="overflow-x-auto border border-border">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-40 border-b border-border bg-surface p-4 text-left align-top">
                    <span className="eyebrow">Product</span>
                  </th>
                  {products.map((p) => (
                    <th
                      key={p.sku}
                      className="border-b border-l border-border bg-surface p-4 text-left align-top font-normal"
                    >
                      <div className="space-y-2">
                        <ProductThumb product={p} />
                        <p className="text-sm leading-snug">{p.description}</p>
                        <div className="flex gap-2">
                          <Button asChild size="sm" variant="secondary" className="rounded-none">
                            <Link to="/products/$sku" params={{ sku: p.sku }}>
                              View
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-none"
                            onClick={() => toggleCompare(p.sku)}
                          >
                            <X className="size-3.5" /> Remove
                          </Button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label}>
                    <th className="border-b border-border p-4 text-left align-top">
                      <span className="eyebrow">{row.label}</span>
                    </th>
                    {products.map((p) => (
                      <td
                        key={p.sku}
                        className="border-b border-l border-border p-4 align-top text-muted-foreground"
                      >
                        {row.get(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="outline" className="rounded-none" onClick={clearCompare}>
            Clear comparison
          </Button>
        </>
      )}
    </div>
  );
}
