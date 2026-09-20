/**
 * Product Service — provider abstraction.
 *
 * The active provider reads the KOHLER India Price Book 2026 (June Edition)
 * uploaded by the project owner. Records are extracted verbatim: SKU (CODE),
 * description and MRP are never modified, and fields absent from the price
 * book (images, URLs, style, material) stay null instead of being invented.
 *
 * Swap in a `KohlerApiProductProvider` later by implementing the same
 * interface and exporting it from `getProductProvider()`.
 */
import rawProducts from "@/data/kohler-price-book.json";
import type { Product, Subcategory } from "@/types/domain";

export interface ProductFilter {
  subcategory?: Subcategory;
  category?: Product["category"];
  minPrice?: number;
  maxPrice?: number | null;
  finish?: string | null;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ProductProvider {
  readonly sourceName: string;
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  searchProducts(query: string): Promise<Product[]>;
  filterProducts(filter: ProductFilter): Promise<Product[]>;
}

interface RawRecord {
  sku: string;
  product_name: string;
  collection: string | null;
  category: string;
  subcategory: string;
  price: number;
  currency: string;
  description: string;
  dimensions: string | null;
  installation_type: string | null;
  finish: string | null;
  material: string | null;
  source_page: number;
}

const CATALOG: Product[] = (rawProducts as RawRecord[]).map((r) => ({
  product_id: r.sku,
  sku: r.sku,
  product_name: r.product_name,
  collection: r.collection,
  category: r.category as Product["category"],
  subcategory: r.subcategory as Subcategory,
  price: r.price,
  currency: "INR",
  description: r.description,
  dimensions: r.dimensions,
  installation_type: r.installation_type,
  finish: r.finish,
  material: r.material,
  source_page: r.source_page,
  product_image: null,
  product_url: null,
  style: null,
}));

class PriceBookProductProvider implements ProductProvider {
  readonly sourceName = "KOHLER India Price Book 2026 (June Edition)";

  async getProducts() {
    return CATALOG;
  }

  async getProductById(id: string) {
    return CATALOG.find((p) => p.product_id === id) ?? null;
  }

  async searchProducts(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return CATALOG;
    return CATALOG.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.collection ?? "").toLowerCase().includes(q),
    );
  }

  async filterProducts(filter: ProductFilter) {
    let list = CATALOG;
    if (filter.search) list = await this.searchProducts(filter.search);
    if (filter.category) list = list.filter((p) => p.category === filter.category);
    if (filter.subcategory) list = list.filter((p) => p.subcategory === filter.subcategory);
    if (typeof filter.minPrice === "number")
      list = list.filter((p) => p.price >= filter.minPrice!);
    if (filter.maxPrice != null) list = list.filter((p) => p.price <= filter.maxPrice!);
    if (filter.finish) list = list.filter((p) => p.finish === filter.finish);
    const offset = filter.offset ?? 0;
    return filter.limit ? list.slice(offset, offset + filter.limit) : list.slice(offset);
  }
}

const provider: ProductProvider = new PriceBookProductProvider();

export function getProductProvider(): ProductProvider {
  return provider;
}

export function catalogStats() {
  const bySubcategory = new Map<string, number>();
  for (const p of CATALOG) {
    bySubcategory.set(p.subcategory, (bySubcategory.get(p.subcategory) ?? 0) + 1);
  }
  return {
    total: CATALOG.length,
    source: provider.sourceName,
    bySubcategory: [...bySubcategory.entries()]
      .map(([subcategory, count]) => ({ subcategory, count }))
      .sort((a, b) => b.count - a.count),
  };
}
