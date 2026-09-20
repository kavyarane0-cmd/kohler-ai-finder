import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark, BookmarkCheck, GitCompare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProductThumb } from "@/components/product-card";
import { getProduct } from "@/lib/api.functions";
import { useSession } from "@/lib/session-store";
import { formatINR } from "@/types/domain";

export const Route = createFileRoute("/products/$sku")({
  head: ({ params }) => ({
    meta: [
      { title: `KOHLER ${params.sku} — product detail` },
      {
        name: "description",
        content: `Price book detail for KOHLER product code ${params.sku}: MRP, finish, installation type and published dimensions.`,
      },
      { property: "og:title", content: `KOHLER ${params.sku}` },
      {
        property: "og:description",
        content: `Price book detail for KOHLER product code ${params.sku}.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductDetail,
});

function ProductDetail() {
  const { sku } = Route.useParams();
  const fetchProduct = useServerFn(getProduct);
  const { saved, compare, toggleSaved, toggleCompare } = useSession();

  const { data: product, isPending } = useQuery({
    queryKey: ["product", sku],
    queryFn: () => fetchProduct({ data: { id: sku } }),
  });

  if (isPending) {
    return <p className="mx-auto max-w-6xl px-4 py-12 text-sm text-muted-foreground">Loading…</p>;
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-16 sm:px-6">
        <h1 className="text-3xl">Product code not found</h1>
        <p className="text-sm text-muted-foreground">
          No record with code {sku} exists in the KOHLER India Price Book 2026 extract.
        </p>
        <Button asChild className="rounded-none px-8">
          <Link to="/products">Back to catalog</Link>
        </Button>
      </div>
    );
  }

  const specs: [string, string][] = [
    ["Product code", product.sku],
    ["Category", product.category],
    ["Subcategory", product.subcategory],
    ["Collection", product.collection ?? "Not published"],
    ["Finish", product.finish ?? "Not published"],
    ["Installation type", product.installation_type ?? "Not published"],
    ["Dimensions", product.dimensions ?? "Not published"],
    ["Material", product.material ?? "Not published"],
    ["Price book page", `p.${product.source_page}`],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Link to="/products" className="eyebrow hover:text-foreground">
        ← Back to catalog
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <ProductThumb product={product} />

        <div className="space-y-6">
          <div className="space-y-2">
            <p className="eyebrow">{product.subcategory}</p>
            <h1 className="text-3xl leading-snug sm:text-4xl">{product.description}</h1>
            <p className="text-2xl">{formatINR(product.price)}</p>
            <p className="text-xs text-muted-foreground">
              MRP as printed in the KOHLER India Price Book 2026 (June Edition), page{" "}
              {product.source_page}. Taxes and installation are not included.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={compare.includes(product.sku) ? "default" : "outline"}
              className="rounded-none"
              onClick={() => {
                if (!toggleCompare(product.sku))
                  toast.error("You can compare up to 3 products at a time.");
              }}
            >
              <GitCompare className="size-4" /> Compare
            </Button>
            <Button variant="ghost" className="rounded-none" onClick={() => toggleSaved(product.sku)}>
              {saved.includes(product.sku) ? (
                <BookmarkCheck className="size-4" />
              ) : (
                <Bookmark className="size-4" />
              )}
              {saved.includes(product.sku) ? "Saved" : "Save"}
            </Button>
          </div>

          <dl className="grid gap-px border border-border bg-border sm:grid-cols-2">
            {specs.map(([label, value]) => (
              <div key={label} className="bg-card p-4">
                <dt className="eyebrow">{label}</dt>
                <dd className="mt-1 text-sm">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            Product images, web links, style and some specifications are not part of the price book
            and are intentionally left blank rather than invented. Confirm installation dimensions
            and availability with a KOHLER dealer or a professional before purchase.
          </p>
        </div>
      </div>
    </div>
  );
}
