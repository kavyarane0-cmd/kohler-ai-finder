import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR, type Product, type ReasonLine } from "@/types/domain";

function Spec({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-0.5">
      <p className="eyebrow">{label}</p>
      <p className="text-sm text-foreground">{value ?? "Not published"}</p>
    </div>
  );
}

export function ProductThumb({ product }: { product: Product }) {
  const imagePath = `/products/${product.sku}.jpeg`;

  return (
    <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-muted">
      <img
        src={imagePath}
        alt={product.product_name}
        className="h-full w-full object-contain"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}
interface Props {
  product: Product;
  matchScore?: number;
  reasons?: ReasonLine[];
  saved?: boolean;
  comparing?: boolean;
  onSave?: () => void;
  onCompare?: () => void;
}

export function ProductCard({
  product,
  matchScore,
  reasons,
  saved,
  comparing,
  onSave,
  onCompare,
}: Props) {
  return (
    <article className="panel flex flex-col overflow-hidden transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="relative">
        <ProductThumb product={product} />
        {matchScore != null && (
          <div className="absolute top-3 left-3 bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
            {matchScore}% match
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-1">
          <p className="eyebrow">{product.subcategory}</p>
          <h3 className="text-lg leading-snug">{product.description}</h3>
          <p className="text-xs text-muted-foreground">SKU {product.sku}</p>
        </div>

        <p className="text-xl">{formatINR(product.price)}</p>

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
          <Spec label="Finish" value={product.finish} />
          <Spec label="Installation" value={product.installation_type} />
          <Spec label="Dimensions" value={product.dimensions} />
          <Spec label="Collection" value={product.collection} />
        </div>

        {reasons && reasons.length > 0 && (
          <div className="space-y-1.5 border-t border-border pt-3">
            <p className="eyebrow">Why this product?</p>
            <ul className="space-y-1">
              {reasons.map((r, i) => (
                <li key={i} className="flex gap-2 text-xs leading-relaxed">
                  <span
                    className={
                      r.ok === true
                        ? "text-success"
                        : r.ok === false
                          ? "text-destructive"
                          : "text-warning"
                    }
                  >
                    {r.ok === true ? "✓" : r.ok === false ? "✕" : "!"}
                  </span>
                  <span className="text-muted-foreground">{r.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <Button asChild size="sm" variant="secondary" className="rounded-none">
            <Link to="/products/$sku" params={{ sku: product.sku }}>
              View Product
            </Link>
          </Button>
          {onCompare && (
            <Button
              size="sm"
              variant={comparing ? "default" : "outline"}
              className="rounded-none"
              onClick={onCompare}
            >
              <GitCompare className="size-3.5" /> Compare
            </Button>
          )}
          {onSave && (
            <Button size="sm" variant="ghost" className="rounded-none" onClick={onSave}>
              {saved ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
              {saved ? "Saved" : "Save"}
            </Button>
          )}
        </div>

        <Badge variant="outline" className="w-fit rounded-none text-[10px] font-normal">
          Source: Price Book 2026 · p.{product.source_page}
        </Badge>
      </div>
    </article>
  );
}
