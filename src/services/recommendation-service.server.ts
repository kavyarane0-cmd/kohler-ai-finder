/**
 * Recommendation Service
 *
 * Ranks KOHLER products from the 2026 price book against:
 * - detected fixture
 * - confirmed issue
 * - budget
 * - available space
 * - preferred finish
 *
 * The service intentionally avoids recommending accessories when the user
 * needs a primary fixture replacement.
 */

import { getProductProvider } from "./product-provider.server";

import {
  ISSUE_LABELS,
  OBJECT_TO_SUBCATEGORY,
  formatINR,
  type Product,
  type Recommendation,
  type RecommendationRequest,
  type ReasonLine,
  type SpaceProfile,
} from "@/types/domain";

const MM_PER_UNIT: Record<SpaceProfile["unit"], number> = {
  ft: 304.8,
  in: 25.4,
  cm: 10,
};

/**
 * Product terms that usually describe accessories, spare parts,
 * installation parts or maintenance items rather than the main fixture.
 */
const ACCESSORY_TERMS = [
  "cleaner",
  "cleaning",
  "strainer",
  "drain pipe",
  "drain",
  "wire rack",
  "rack",
  "waste",
  "waste kit",
  "trap",
  "seal",
  "seal kit",
  "spare",
  "replacement part",
  "repair kit",
  "cartridge",
  "aerator",
  "hose",
  "connector",
  "adapter",
  "bracket",
  "mounting kit",
  "cover",
  "filter",
  "insert",
  "basket",
];

/**
 * Terms that indicate a primary bathroom/kitchen fixture.
 */
const PRIMARY_PRODUCT_TERMS = [
  "toilet",
  "bidet",
  "basin",
  "sink",
  "faucet",
  "tap",
  "shower",
  "thermostatic",
  "vanity",
  "bathtub",
  "bath",
  "urinal",
  "cabinet",
  "mirror",
  "lavatory",
];

function getSearchText(product: Product): string {
  return [
    product.product_name,
    product.description,
    product.subcategory,
    product.collection ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function isAccessory(product: Product): boolean {
  const text = getSearchText(product);

  return ACCESSORY_TERMS.some((term) => text.includes(term));
}

function isPrimaryProduct(product: Product): boolean {
  const text = getSearchText(product);

  return PRIMARY_PRODUCT_TERMS.some((term) => text.includes(term));
}

function getDimensions(product: Product): number[] {
  if (!product.dimensions) return [];

  const values = product.dimensions.match(/\d+(?:\.\d+)?/g);

  if (!values) return [];

  return values
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);
}

function getFootprintInMm(product: Product): {
  first: number;
  second: number;
} | null {
  const dimensions = getDimensions(product);

  if (dimensions.length < 2) return null;

  const first = dimensions[0];
  const second = dimensions[1];

  if (first === undefined || second === undefined) {
    return null;
  }

  return {
    first: first * 25.4,
    second: second * 25.4,
  };
}

function getAvailableSpaceInMm(profile: SpaceProfile): {
  length: number | null;
  width: number | null;
} {
  const multiplier = MM_PER_UNIT[profile.unit];

  return {
    length:
      profile.length == null ? null : profile.length * multiplier,
    width:
      profile.width == null ? null : profile.width * multiplier,
  };
}

function fitsInSpace(
  product: Product,
  profile: SpaceProfile,
): boolean | "unknown" {
  const footprint = getFootprintInMm(product);

  if (!footprint) {
    return "unknown";
  }

  const available = getAvailableSpaceInMm(profile);

  if (available.length == null || available.width == null) {
    return "unknown";
  }

  /**
   * For kitchens, countertop depth is a more useful constraint
   * for sinks/faucets than the entire room width.
   */
  if (
    profile.space_type === "kitchen" &&
    profile.countertop_depth != null
  ) {
    const countertopDepth =
      profile.countertop_depth * MM_PER_UNIT[profile.unit];

    const fitsCountertop =
      footprint.first <= available.length &&
      footprint.second <= countertopDepth;

    const fitsRotated =
      footprint.second <= available.length &&
      footprint.first <= countertopDepth;

    return fitsCountertop || fitsRotated;
  }

  const normalFit =
    footprint.first <= available.length &&
    footprint.second <= available.width;

  const rotatedFit =
    footprint.second <= available.length &&
    footprint.first <= available.width;

  return normalFit || rotatedFit;
}

function budgetScore(product: Product, profile: SpaceProfile): number {
  const min = profile.budget_min;
  const max = profile.budget_max;

  if (max == null) {
    if (product.price >= min) return 20;

    const difference = min - product.price;

    return Math.max(0, 20 - (difference / Math.max(min, 1)) * 20);
  }

  if (product.price >= min && product.price <= max) {
    return 20;
  }

  if (product.price < min) {
    const difference = min - product.price;

    return Math.max(0, 20 - (difference / Math.max(min, 1)) * 10);
  }

  const difference = product.price - max;

  return Math.max(0, 20 - (difference / Math.max(max, 1)) * 40);
}

function sizeScore(
  product: Product,
  profile: SpaceProfile,
): {
  score: number;
  reason: ReasonLine;
  exclude: boolean;
} {
  const fit = fitsInSpace(product, profile);

  if (fit === true) {
    return {
      score: 20,
      reason: {
        ok: true,
        text: "Published product dimensions fit the available space",
      },
      exclude: false,
    };
  }

  if (fit === false) {
    return {
      score: 0,
      reason: {
        ok: false,
        text: "Published product dimensions exceed the available space",
      },
      exclude: true,
    };
  }

  return {
    score: 10,
    reason: {
      ok: "unknown",
      text: "Product dimensions are not sufficient to verify physical fit",
    },
    exclude: false,
  };
}

function finishScore(
  product: Product,
  requestedFinish: string | null,
): {
  score: number;
  reason: ReasonLine;
} {
  if (!requestedFinish || requestedFinish === "No preference") {
    return {
      score: 10,
      reason: {
        ok: "unknown",
        text: "No specific finish was requested",
      },
    };
  }

  const productFinish = product.finish?.trim().toLowerCase();
  const requested = requestedFinish.trim().toLowerCase();

  if (!productFinish) {
    return {
      score: 5,
      reason: {
        ok: "unknown",
        text: "The price book does not publish a finish for this product",
      },
    };
  }

  if (productFinish === requested) {
    return {
      score: 10,
      reason: {
        ok: true,
        text: `Finish matches your preference: ${requestedFinish}`,
      },
    };
  }

  return {
    score: 2,
    reason: {
      ok: false,
      text: `Published finish is ${product.finish}, not ${requestedFinish}`,
    },
  };
}

function issueScore(
  product: Product,
  request: RecommendationRequest,
): {
  score: number;
  reason: ReasonLine;
} {
  const targetSubcategory =
    OBJECT_TO_SUBCATEGORY[request.detected_object];

  if (product.subcategory === targetSubcategory) {
    return {
      score: 40,
      reason: {
        ok: true,
        text: `${OBJECT_LABELS_FOR_PRODUCT(request.detected_object)} category matches the scanned fixture`,
      },
    };
  }

  return {
    score: 0,
    reason: {
      ok: false,
      text: `Product category does not match the scanned fixture`,
    },
  };
}

function OBJECT_LABELS_FOR_PRODUCT(
  object: RecommendationRequest["detected_object"],
): string {
  const labels: Record<
    RecommendationRequest["detected_object"],
    string
  > = {
    bathroom_faucet: "Bathroom faucet",
    washbasin: "Washbasin",
    toilet: "Toilet",
    shower: "Shower",
    bathtub: "Bathtub",
    kitchen_faucet: "Kitchen faucet",
    kitchen_sink: "Kitchen sink",
  };

  return labels[object];
}

function buildReasons(
  product: Product,
  request: RecommendationRequest,
  size: {
    score: number;
    reason: ReasonLine;
    exclude: boolean;
  },
  finish: {
    score: number;
    reason: ReasonLine;
  },
  budgetPoints: number,
): ReasonLine[] {
  const reasons: ReasonLine[] = [];

  const issue = issueScore(product, request);

  reasons.push(issue.reason);

  if (budgetPoints >= 18) {
    reasons.push({
      ok: true,
      text: `Price ${formatINR(product.price)} is within your selected budget`,
    });
  } else if (budgetPoints >= 10) {
    reasons.push({
      ok: "unknown",
      text: `Price ${formatINR(product.price)} is close to your selected budget`,
    });
  } else {
    reasons.push({
      ok: false,
      text: `Price ${formatINR(product.price)} is outside your preferred budget range`,
    });
  }

  reasons.push(size.reason);
  reasons.push(finish.reason);

  if (request.confirmed_issue) {
    reasons.push({
      ok: true,
      text: `Recommendation is based on confirmed issue: ${
        ISSUE_LABELS[request.confirmed_issue]
      }`,
    });
  }

  return reasons;
}

export async function recommendProducts(
  request: RecommendationRequest,
): Promise<{
  recommendations: Recommendation[];
  considered: number;
  categoryMatches: number;
}> {
  const provider = getProductProvider();

  const all = await provider.getProducts();

  const targetSubcategory =
    OBJECT_TO_SUBCATEGORY[request.detected_object];

  /**
   * First restrict the catalog to the correct fixture category.
   */
  const categoryProducts = all.filter(
    (product) => product.subcategory === targetSubcategory,
  );

  /**
   * For replacement recommendations, prefer actual primary fixtures
   * instead of accessories such as drain pipes, cleaners or racks.
   */
  let candidates = categoryProducts.filter(
    (product) => !isAccessory(product) && isPrimaryProduct(product),
  );

  /**
   * If the price book contains no products that match our primary-product
   * heuristics, fall back to non-accessory products in the category.
   */
  if (candidates.length === 0) {
    candidates = categoryProducts.filter(
      (product) => !isAccessory(product),
    );
  }

  const scored: Recommendation[] = [];

  for (const product of candidates) {
    const size = sizeScore(product, request.space_profile);

    /**
     * A product that clearly exceeds the available footprint should
     * not appear in the recommendation list.
     */
    if (size.exclude) {
      continue;
    }

    const issue = issueScore(product, request);

    const budgetPoints = budgetScore(
      product,
      request.space_profile,
    );

    const finish = finishScore(
      product,
      request.space_profile.finish,
    );

    /**
     * Score:
     * category / issue = 40
     * budget = 20
     * size = 20
     * finish = 10
     * style/data availability = 10
     */
    let score =
      issue.score +
      budgetPoints +
      size.score +
      finish.score;

    /**
     * Style is not published in the current price book.
     * Give a neutral 5/10 instead of inventing style information.
     */
    score += 5;

    score = Math.round(Math.max(0, Math.min(100, score)));

    const reasons = buildReasons(
      product,
      request,
      size,
      finish,
      budgetPoints,
    );

    scored.push({
      product,
      match_score: score,
      reasons,
      needs_professional_verification:
        size.score === 10 ||
        product.dimensions == null,
    });
  }

  /**
   * Highest score first.
   *
   * If scores are equal:
   * 1. Prefer products within the budget.
   * 2. Then prefer the lower-priced product.
   */
  scored.sort((a, b) => {
    if (b.match_score !== a.match_score) {
      return b.match_score - a.match_score;
    }

    const max = request.space_profile.budget_max;

    if (max != null) {
      const aWithin = a.product.price <= max;
      const bWithin = b.product.price <= max;

      if (aWithin !== bWithin) {
        return aWithin ? -1 : 1;
      }
    }

    return a.product.price - b.product.price;
  });

  /**
   * Only show reasonably strong matches.
   */
  const recommendations = scored
    .filter((recommendation) => recommendation.match_score >= 55)
    .slice(0, 5);

  return {
    recommendations,
    considered: all.length,
    categoryMatches: categoryProducts.length,
  };
}