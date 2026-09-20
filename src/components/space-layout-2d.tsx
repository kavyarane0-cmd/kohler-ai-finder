import type { ProductConfiguration } from "@/types/domain";
import { formatINR } from "@/types/domain";

interface SpaceLayout2DProps {
  configuration: ProductConfiguration;
  spaceType: "bathroom" | "kitchen";
  length: number | null;
  width: number | null;
  height?: number | null;
  countertopDepth?: number | null;
  unit: "ft" | "in" | "cm";
}

const CATEGORY_LABELS: Record<string, string> = {
  Toilets: "Toilet",
  Washbasins: "Washbasin",
  "Bathroom Faucets": "Faucet",
  Showers: "Shower",
  Bathtubs: "Bathtub",
  "Kitchen Sinks": "Kitchen Sink",
  "Kitchen Faucets": "Kitchen Faucet",
};

interface LayoutPosition {
  left: string;
  top: string;
  width: string;
  height: string;
}

interface ProductFootprint {
  widthMm: number;
  depthMm: number;
}

function convertToMm(value: number, unit: "ft" | "in" | "cm") {
  if (unit === "ft") return value * 304.8;
  if (unit === "in") return value * 25.4;
  return value * 10;
}

function parseProductDimensions(
  dimensions: string | null,
): ProductFootprint | null {
  if (!dimensions) return null;

  const numbers = dimensions
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number);

  if (!numbers || numbers.length < 2) return null;

  const width = numbers[0];
  const depth = numbers[1];

  if (width == null || depth == null) return null;

  return {
    widthMm: width,
    depthMm: depth,
  };
}

function getProductFootprintStyle(
  productDimensions: string | null,
  roomLength: number,
  roomWidth: number,
  unit: "ft" | "in" | "cm",
  fallback: LayoutPosition,
) {
  const footprint = parseProductDimensions(productDimensions);

  if (!footprint) {
    return {
      width: fallback.width,
      height: fallback.height,
    };
  }

  const roomLengthMm = convertToMm(roomLength, unit);
  const roomWidthMm = convertToMm(roomWidth, unit);

  if (roomLengthMm <= 0 || roomWidthMm <= 0) {
    return {
      width: fallback.width,
      height: fallback.height,
    };
  }

  const widthPercent =
    (footprint.widthMm / roomLengthMm) * 100;

  const depthPercent =
    (footprint.depthMm / roomWidthMm) * 100;

  return {
    width: `${Math.min(Math.max(widthPercent, 8), 45)}%`,
    height: `${Math.min(Math.max(depthPercent, 8), 40)}%`,
  };
}

function getLayoutPositions(
  spaceType: "bathroom" | "kitchen",
  itemCount: number,
): LayoutPosition[] {
  if (spaceType === "kitchen") {
    const kitchenPositions: LayoutPosition[] = [
      {
        left: "10%",
        top: "12%",
        width: "32%",
        height: "25%",
      },
      {
        left: "58%",
        top: "12%",
        width: "32%",
        height: "25%",
      },
      {
        left: "10%",
        top: "48%",
        width: "80%",
        height: "20%",
      },
    ];

    return kitchenPositions.slice(0, itemCount);
  }

const bathroomPositions: LayoutPosition[] = [
  // Toilet — top left
  {
    left: "8%",
    top: "12%",
    width: "24%",
    height: "27%",
  },

  // Washbasin — top right
  {
    left: "68%",
    top: "12%",
    width: "24%",
    height: "23%",
  },

  // Shower — middle right
  {
    left: "66%",
    top: "48%",
    width: "26%",
    height: "32%",
  },

  // Bathtub — bottom/centre
  {
    left: "32%",
    top: "48%",
    width: "28%",
    height: "32%",
  },

  // Faucet — optional additional fixture
  {
    left: "10%",
    top: "48%",
    width: "18%",
    height: "20%",
  },
];

  return bathroomPositions.slice(0, itemCount);
}

function getCategoryStyle(category: string) {
  switch (category) {
    case "Toilets":
      return {
        backgroundColor: "hsl(200 80% 92%)",
        borderColor: "hsl(200 60% 55%)",
      };

    case "Washbasins":
      return {
        backgroundColor: "hsl(180 55% 91%)",
        borderColor: "hsl(180 50% 50%)",
      };

    case "Bathroom Faucets":
      return {
        backgroundColor: "hsl(45 90% 91%)",
        borderColor: "hsl(45 70% 50%)",
      };

    case "Showers":
      return {
        backgroundColor: "hsl(215 75% 92%)",
        borderColor: "hsl(215 60% 55%)",
      };

    case "Bathtubs":
      return {
        backgroundColor: "hsl(270 55% 93%)",
        borderColor: "hsl(270 45% 60%)",
      };

    case "Kitchen Sinks":
      return {
        backgroundColor: "hsl(160 55% 91%)",
        borderColor: "hsl(160 50% 48%)",
      };

    case "Kitchen Faucets":
      return {
        backgroundColor: "hsl(25 85% 92%)",
        borderColor: "hsl(25 70% 52%)",
      };

    default:
      return {
        backgroundColor: "hsl(0 0% 96%)",
        borderColor: "hsl(0 0% 65%)",
      };
  }
}

function getCategoryShape(category: string) {
  switch (category) {
    case "Toilets":
      return "rounded-[45%]";

    case "Washbasins":
      return "rounded-t-[45%] rounded-b-lg";

    case "Bathtubs":
      return "rounded-[2rem]";

    case "Showers":
      return "rounded-full";

    case "Bathroom Faucets":
      return "rounded-full";

    case "Kitchen Sinks":
      return "rounded-xl";

    case "Kitchen Faucets":
      return "rounded-full";

    default:
      return "rounded-lg";
  }
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "Toilets":
      return (
        <div className="relative h-10 w-8">
          {/* Toilet bowl */}
          <div className="absolute bottom-0 left-1/2 h-7 w-7 -translate-x-1/2 rounded-[45%] border-2 border-current" />

          {/* Toilet tank */}
          <div className="absolute left-1/2 top-0 h-3 w-6 -translate-x-1/2 rounded-sm border-2 border-current bg-background/40" />
        </div>
      );

    case "Washbasins":
      return (
        <div className="relative h-8 w-12">
          {/* Basin */}
          <div className="absolute bottom-0 left-1/2 h-6 w-12 -translate-x-1/2 rounded-b-[50%] rounded-t-lg border-2 border-current" />

          {/* Faucet */}
          <div className="absolute left-1/2 top-[-3px] h-3 w-1 -translate-x-1/2 border-l-2 border-current" />
        </div>
      );

    case "Bathroom Faucets":
      return (
        <div className="relative h-8 w-8">
          {/* Faucet base */}
          <div className="absolute bottom-1 left-1/2 h-2 w-5 -translate-x-1/2 rounded-full border-2 border-current" />

          {/* Faucet neck */}
          <div className="absolute bottom-2 left-1/2 h-4 w-3 -translate-x-1/2 rounded-t-full border-2 border-current border-b-0" />

          {/* Water outlet */}
          <div className="absolute right-0 top-1 h-1 w-3 border-t-2 border-current" />
        </div>
      );

    case "Showers":
      return (
        <div className="relative h-10 w-10">
          {/* Shower head */}
          <div className="absolute left-1/2 top-1 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-current" />

          {/* Shower pipe */}
          <div className="absolute left-1/2 top-5 h-4 -translate-x-1/2 border-l-2 border-current" />

          {/* Drain */}
          <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border border-current" />
        </div>
      );

    case "Bathtubs":
      return (
        <div className="relative h-10 w-20">
          {/* Tub */}
          <div className="absolute inset-0 rounded-[2rem] border-2 border-current" />

          {/* Inner tub */}
          <div className="absolute inset-2 rounded-[1.5rem] border border-current/50" />

          {/* Drain */}
          <div className="absolute bottom-2 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border border-current" />
        </div>
      );

    case "Kitchen Sinks":
      return (
        <div className="relative h-9 w-14">
          {/* Sink */}
          <div className="absolute inset-0 rounded-xl border-2 border-current" />

          {/* Basin */}
          <div className="absolute left-1/2 top-1/2 h-5 w-8 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-current/60" />

          {/* Drain */}
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-current" />
        </div>
      );

    case "Kitchen Faucets":
      return (
        <div className="relative h-9 w-9">
          {/* Faucet base */}
          <div className="absolute bottom-0 left-1/2 h-2 w-5 -translate-x-1/2 rounded-full border-2 border-current" />

          {/* Tall neck */}
          <div className="absolute bottom-1 left-1/2 h-7 w-4 -translate-x-1/2 rounded-t-full border-2 border-current border-b-0" />

          {/* Spout */}
          <div className="absolute right-0 top-2 h-1 w-4 border-t-2 border-current" />
        </div>
      );

    default:
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-current text-[9px] font-semibold">
          ?
        </div>
      );
  }
}

export function SpaceLayout2D({
  configuration,
  spaceType,
  length,
  width,
  height,
  countertopDepth,
  unit,
}: SpaceLayout2DProps) {
  const roomLength = length ?? 10;
  const roomWidth = width ?? 10;

  const items = configuration.items;

  const positions = getLayoutPositions(
    spaceType,
    items.length,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="eyebrow">2D space plan</p>

        <h3 className="mt-1 text-xl">
          {spaceType === "bathroom"
            ? "Bathroom floor plan"
            : "Kitchen floor plan"}
        </h3>

        {/* ALL DIMENSIONS */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="border border-border p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Length
            </p>
            <p className="mt-1 text-sm font-medium">
              {roomLength} {unit}
            </p>
          </div>

          <div className="border border-border p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Width
            </p>
            <p className="mt-1 text-sm font-medium">
              {roomWidth} {unit}
            </p>
          </div>

          {height != null && (
            <div className="border border-border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Height
              </p>
              <p className="mt-1 text-sm font-medium">
                {height} {unit}
              </p>
            </div>
          )}

          {spaceType === "kitchen" && countertopDepth != null && (
            <div className="border border-border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Counter depth
              </p>
              <p className="mt-1 text-sm font-medium">
                {countertopDepth} {unit}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floor plan */}
      <div className="overflow-x-auto px-10 py-10">
        <div
        className="relative mx-auto min-h-[360px] min-w-[560px] max-w-4xl border-2 border-foreground/70 bg-background"
        style={{
            aspectRatio: `${roomLength} / ${roomWidth}`,
        }}
        aria-label={`${spaceType} 2D floor plan`}
>
          {/* Top dimension */}
          <div className="absolute left-1/2 top-[-32px] -translate-x-1/2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>←</span>
              <span>
                {roomLength} {unit}
              </span>
              <span>→</span>
            </div>
          </div>

          {/* Left dimension */}
          <div className="absolute left-[-65px] top-1/2 -translate-y-1/2 -rotate-90">
            <div className="flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground">
              <span>←</span>
              <span>
                {roomWidth} {unit}
              </span>
              <span>→</span>
            </div>
          </div>

          {/* Room walls */}
          <div className="absolute inset-5 border-2 border-border">
            {/* Floor grid */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
                backgroundSize: "10% 10%",
              }}
            />

            {/* Kitchen counter / wall zone */}
            {spaceType === "kitchen" && (
              <div className="absolute left-0 right-0 top-0 h-8 border-b-2 border-border bg-muted/40">
                <span className="absolute left-3 top-2 text-[9px] uppercase tracking-wider text-muted-foreground">
                  Counter / Worktop
                </span>
              </div>
            )}

            {/* Door / Entry - placed in bottom-left so it doesn't overlap */}
            <div className="absolute bottom-0 left-6 h-2 w-20 translate-y-[2px] bg-background">
              <div className="absolute left-0 top-0 h-20 w-20 rounded-tr-full border-r border-t border-border" />

              <span className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap text-[9px] uppercase tracking-wider text-muted-foreground">
                Entry
              </span>
            </div>

            {/* Products */}
            {items.map((item, index) => {
              const categoryPositionMap: Record<string, LayoutPosition> = {
  Toilets: {
    left: "8%",
    top: "12%",
    width: "24%",
    height: "27%",
  },

  Washbasins: {
    left: "68%",
    top: "12%",
    width: "24%",
    height: "23%",
  },

  "Bathroom Faucets": {
    left: "10%",
    top: "48%",
    width: "18%",
    height: "20%",
  },

  Showers: {
    left: "66%",
    top: "48%",
    width: "26%",
    height: "32%",
  },

  Bathtubs: {
    left: "32%",
    top: "48%",
    width: "28%",
    height: "32%",
  },

  "Kitchen Sinks": {
    left: "10%",
    top: "48%",
    width: "35%",
    height: "22%",
  },

  "Kitchen Faucets": {
    left: "58%",
    top: "48%",
    width: "25%",
    height: "22%",
  },
};

const position =
  categoryPositionMap[item.category] ??
  positions[index % positions.length]!;

const footprintStyle = getProductFootprintStyle(
  item.product.dimensions,
  roomLength,
  roomWidth,
  unit,
  position,
);

              const category = item.category;

              const categoryStyle =
                getCategoryStyle(category);

              return (
                <div
                  key={item.product.sku}
                  className={`absolute flex flex-col items-center justify-center border-2 p-2 text-center shadow-sm transition-transform hover:z-10 hover:scale-[1.04] ${getCategoryShape(
                    category,
                  )}`}
                  style={{
                    left: position.left,
                    top: position.top,
                    width: footprintStyle.width,
                    height: footprintStyle.height,
                    backgroundColor:
                      categoryStyle.backgroundColor,
                    borderColor: categoryStyle.borderColor,
                  }}
                  title={`${item.product.product_name} — ${item.product.sku}`}
                >
                  {/* Fixture symbol */}
                 <div
                    className="flex items-center justify-center text-foreground"
                    style={{
                        color: categoryStyle.borderColor,
                    }}
            >
                    {getCategoryIcon(category)}
                </div>

                  <p className="mt-1 text-[10px] font-medium">
                    {CATEGORY_LABELS[category] ?? category}
                  </p>

                  <p className="mt-1 max-w-full truncate text-[9px] text-muted-foreground">
                    {item.product.product_name}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Room label */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            {spaceType}
          </div>
        </div>
      </div>

      {/* Color legend */}
      <div>
        <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
          Layout legend
        </p>

        <div className="flex flex-wrap gap-3">
          {items.map((item) => {
            const style = getCategoryStyle(item.category);

            return (
              <div
                key={`color-${item.product.sku}`}
                className="flex items-center gap-2 text-xs"
              >
                <span
                  className="h-3 w-3 rounded-sm border"
                  style={{
                    backgroundColor: style.backgroundColor,
                    borderColor: style.borderColor,
                  }}
                />

                <span>
                  {CATEGORY_LABELS[item.category] ??
                    item.category}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Product list */}
      <div>
        <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
          Selected products
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={`legend-${item.product.sku}`}
              className="flex items-center justify-between gap-4 border border-border p-3"
            >
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {CATEGORY_LABELS[item.category] ??
                    item.category}
                </p>

                <p className="truncate text-sm font-medium">
                  {item.product.product_name}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {item.product.sku}
                </p>
              </div>

              <p className="shrink-0 text-sm">
                {formatINR(item.product.price)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
        Conceptual 2D placement based on the entered room
        dimensions. Exact installation positions, plumbing
        connections and clearance requirements should be verified
        by a qualified professional.
      </p>
    </div>
  );
}