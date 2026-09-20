import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/scan", label: "Scan" },
  { to: "/products", label: "Catalog" },
  { to: "/compare", label: "Compare" },
  { to: "/dashboard", label: "Dashboard" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-[0.22em] uppercase">Kohler</span>
          <span className="eyebrow hidden sm:inline">Fit Finder</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="transition-colors hover:text-foreground [&.active]:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="rounded-none px-5 tracking-wide">
            <Link to="/scan">Start Scan</Link>
          </Button>
        </div>
      </div>
      <nav className="flex items-center gap-5 overflow-x-auto border-t border-border/60 px-4 py-2 text-xs text-muted-foreground md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="whitespace-nowrap transition-colors [&.active]:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/70 bg-surface">
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-10 text-xs leading-relaxed text-muted-foreground sm:px-6">
        <p className="font-medium text-foreground">Prototype notice</p>
        <p>
          Product records are extracted from the KOHLER India Price Book 2026 (June Edition)
          supplied by the project owner. Prices, product codes and descriptions are reproduced as
          printed and may change without notice. Fields not published in the price book (images,
          product pages, styles, installation dimensions) are shown as “not published” and are
          never generated.
        </p>
        <p>
          Uploaded photos are examined by an assistive AI vision model; the built-in sample scans
          use a labelled demo detector. Always confirm findings and installation dimensions with a qualified
          professional.
        </p>
        <p>
          Images are analysed to identify visible fixtures and possible issues. Please avoid
          uploading images containing sensitive personal information. Images are processed in
          memory and are not stored.
        </p>
      </div>
    </footer>
  );
}
