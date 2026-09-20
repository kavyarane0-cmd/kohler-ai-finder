/**
 * Product Configuration Service
 *
 * Builds multi-product bathroom/kitchen configurations from
 * the KOHLER Price Book 2026.
 *
 * The service:
 * - Uses only products from the existing price-book provider.
 * - Generates combinations appropriate to the detected space.
 * - Respects the user's total budget.
 * - Reuses the existing recommendation engine.
 * - Does not claim physical compatibility when dimensions are unknown.
 */

import {
  OBJECT_TO_SUBCATEGORY,
  formatINR,
  type DetectedObject,
  type Product,
  type ProductConfiguration,
  type RecommendationRequest,
  type ReasonLine,
  type Subcategory,
} from "@/types/domain";

import { getProductProvider } from "./product-provider.server";
import { recommendProducts } from "./recommendation-service.server";

/**
 * Categories that can form a complete bathroom configuration.
 *
 * We intentionally use only categories that currently exist
 * in domain.ts / the KOHLER catalogue.
 */
const BATHROOM_CONFIGURATIONS: Subcategory[][] = [
  [
    "Toilets",
    "Washbasins",
    "Bathroom Faucets",
  ],
  [
    "Toilets",
    "Washbasins",
    "Bathroom Faucets",
    "Showers",
  ],
  [
    "Toilets",
    "Washbasins",
    "Bathroom Faucets",
    "Bathtubs",
  ],
];

/**
 * Kitchen configuration.
 */
const KITCHEN_CONFIGURATIONS: Subcategory[][] = [
  [
    "Kitchen Sinks",
    "Kitchen Faucets",
  ],
];

/**
 * Maximum number of products considered from each category.
 *
 * Keeping this small prevents thousands of combinations.
 */
const PRODUCTS_PER_CATEGORY = 5;

/**
 * Extract the first two usable dimensions from a product.
 */
function getDimensions(product: Product): number[] {
  if (!product.dimensions) {
    return [];
  }

  const values = product.dimensions.match(
    /\d+(?:\.\d+)?/g,
  );

  if (!values) {
    return [];
  }

  return values
    .map(Number)
    .filter(
      (value) =>
        Number.isFinite(value) &&
        value > 0,
    );
}

/**
 * Determine whether the product has published dimensions.
 */
function hasPublishedDimensions(product: Product): boolean {
  return getDimensions(product).length >= 2;
}

/**
 * Check whether two products have the same published finish.
 */
function hasMatchingFinish(
  products: Product[],
): boolean {
  const finishes = products
    .map((product) =>
      product.finish?.trim().toLowerCase(),
    )
    .filter(Boolean);

  if (finishes.length < 2) {
    return false;
  }

  return finishes.every(
    (finish) => finish === finishes[0],
  );
}

/**
 * Calculate how well a configuration matches the requested finish.
 */
function finishScore(
  products: Product[],
  requestedFinish: string | null,
): number {
  if (
    !requestedFinish ||
    requestedFinish === "No preference"
  ) {
    return 10;
  }

  const requested =
    requestedFinish.toLowerCase();

  const matching = products.filter(
    (product) =>
      product.finish?.toLowerCase() ===
      requested,
  );

  if (matching.length === products.length) {
    return 10;
  }

  if (matching.length >= products.length / 2) {
    return 6;
  }

  if (matching.length > 0) {
    return 3;
  }

  return 0;
}

/**
 * Calculate a configuration score.
 *
 * This is intentionally transparent rather than pretending
 * to be an ML confidence score.
 */
function calculateConfigurationScore(
  products: Product[],
  totalPrice: number,
  request: RecommendationRequest,
): number {
  const budgetMax =
    request.space_profile.budget_max;

  let score = 0;

  /**
   * Budget.
   */
  if (
    budgetMax == null ||
    totalPrice <= budgetMax
  ) {
    score += 40;
  } else {
    score += Math.max(
      0,
      40 -
        ((totalPrice - budgetMax) /
          Math.max(budgetMax, 1)) *
          80,
    );
  }

  /**
   * Finish.
   */
  score +=
    finishScore(
      products,
      request.space_profile.finish,
    ) * 2;

  /**
   * Catalogue completeness.
   */
  const withDimensions =
    products.filter(
      hasPublishedDimensions,
    ).length;

  score +=
    (withDimensions /
      products.length) *
    20;

  /**
   * Matching collection gets a small bonus.
   *
   * This encourages visually coordinated products
   * when the catalogue contains collection information.
   */
  const collections = products
    .map((product) =>
      product.collection
        ?.trim()
        .toLowerCase(),
    )
    .filter(Boolean);

  if (
    collections.length >= 2 &&
    new Set(collections).size === 1
  ) {
    score += 20;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(score),
    ),
  );
}

/**
 * Build explanation lines for a configuration.
 */
function buildReasons(
  products: Product[],
  totalPrice: number,
  request: RecommendationRequest,
): ReasonLine[] {
  const reasons: ReasonLine[] = [];

  const {
    budget_min,
    budget_max,
    finish,
  } = request.space_profile;
const detectedCategory =
  OBJECT_TO_SUBCATEGORY[request.detected_object];
  if (
  products.some(
    (product) =>
      product.subcategory === detectedCategory,
  )
) {
  reasons.push({
    ok: true,
    text: `Configuration includes the detected ${detectedCategory} category for your ${request.confirmed_issue.replaceAll("_", " ")}`,
  });
}
  if (
    budget_max == null ||
    totalPrice <= budget_max
  ) {
    reasons.push({
      ok: true,
      text: `Complete configuration costs ${formatINR(
        totalPrice,
      )} within your budget`,
    });
  } else {
    reasons.push({
      ok: false,
      text: `Configuration costs ${formatINR(
        totalPrice,
      )}, above your maximum budget`,
    });
  }

  if (totalPrice >= budget_min) {
    reasons.push({
      ok: true,
      text: `Total price meets your minimum budget of ${formatINR(
        budget_min,
      )}`,
    });
  }

  if (
    finish &&
    finish !== "No preference"
  ) {
    const matching = products.filter(
      (product) =>
        product.finish?.toLowerCase() ===
        finish.toLowerCase(),
    );

    if (matching.length > 0) {
      reasons.push({
        ok: true,
        text: `${matching.length} of ${products.length} selected products match the preferred finish`,
      });
    } else {
      reasons.push({
        ok: "unknown",
        text: "No selected product has a published exact finish match",
      });
    }
  }

  const productsWithDimensions = products.filter(
  hasPublishedDimensions,
);

const missingDimensions = products.filter(
  (product) => !hasPublishedDimensions(product),
);

if (productsWithDimensions.length === products.length) {
  reasons.push({
    ok: true,
    text: `Published dimensions are available for all ${products.length} selected products and can be checked against your ${request.space_profile.space_type} dimensions`,
  });
} else {
  reasons.push({
    ok: "unknown",
    text: `${missingDimensions.length} selected product(s) do not have complete published dimensions and require professional dimensional verification`,
  });
}

  if (missingDimensions.length === 0) {
    reasons.push({
      ok: true,
      text: "Published dimensions are available for all selected products",
    });
  } else {
    reasons.push({
      ok: "unknown",
      text: `${missingDimensions.length} selected product(s) require professional dimensional verification`,
    });
  }

  const collections = products
    .map((product) =>
      product.collection,
    )
    .filter(Boolean);

  if (
    collections.length >= 2 &&
    new Set(collections).size === 1
  ) {
    reasons.push({
      ok: true,
      text: `Products share the ${collections[0]} collection`,
    });
  }

  return reasons;
}

/**
 * Generate combinations recursively.
 */
function generateCombinations(
  productGroups: Product[][],
  index = 0,
  current: Product[] = [],
): Product[][] {
  if (index >= productGroups.length) {
    return [current];
  }

  const currentGroup = productGroups[index];

  if (!currentGroup) {
    return [];
  }

  const results: Product[][] = [];

  for (const product of currentGroup) {
    results.push(
      ...generateCombinations(
        productGroups,
        index + 1,
        [...current, product],
      ),
    );
  }

  return results;
}

/**
 * Return the categories appropriate to the detected fixture.
 */
function getConfigurationCategories(
  detectedObject: DetectedObject,
  spaceType: "bathroom" | "kitchen",
): Subcategory[][] {
  if (spaceType === "kitchen") {
    return KITCHEN_CONFIGURATIONS;
  }

  /**
   * Bathroom:
   *
   * Always generate configurations around the detected
   * bathroom fixture.
   *
   * We currently offer several configuration sizes rather
   * than forcing a bathtub/shower into every package.
   */
  const detectedCategory =
    OBJECT_TO_SUBCATEGORY[
      detectedObject
    ];

  return BATHROOM_CONFIGURATIONS.map(
    (configuration) => {
      if (
        configuration.includes(
          detectedCategory,
        )
      ) {
        return configuration;
      }

      return [
        detectedCategory,
        ...configuration.filter(
          (category) =>
            category !== "Toilets" &&
            category !== "Washbasins" &&
            category !==
              "Bathroom Faucets",
        ),
      ];
    },
  );
}

export async function generateConfigurations(
  request: RecommendationRequest,
): Promise<ProductConfiguration[]> {
  const provider =
    getProductProvider();

  const allProducts =
    await provider.getProducts();

  const categorySets =
    getConfigurationCategories(
      request.detected_object,
      request.space_profile.space_type,
    );

  /**
   * Get the user's individual recommendations first.
   *
   * This means our configuration engine benefits from
   * the filtering logic we already built.
   */
  const primaryRecommendations =
    await recommendProducts(
      request,
    );

  const detectedCategory =
    OBJECT_TO_SUBCATEGORY[
      request.detected_object
    ];

  /**
   * Build candidate pools for each category.
   */
  const configurations: ProductConfiguration[] =
    [];

  for (const categories of categorySets) {
    const groups: Product[][] = [];

    let validConfiguration = true;

    for (const category of categories) {
      let candidates =
        allProducts.filter(
          (product) =>
            product.subcategory ===
            category,
        );

      /**
       * For the detected category, prioritize products
       * that survived the intelligent recommendation engine.
       */
      if (
        category ===
        detectedCategory
      ) {
        const recommended =
          primaryRecommendations.recommendations.map(
            (recommendation) =>
              recommendation.product,
          );

        const recommendedIds =
          new Set(
            recommended.map(
              (product) =>
                product.product_id,
            ),
          );

        candidates.sort(
          (a, b) => {
            const aRecommended =
              recommendedIds.has(
                a.product_id,
              );

            const bRecommended =
              recommendedIds.has(
                b.product_id,
              );

            if (
              aRecommended !==
              bRecommended
            ) {
              return aRecommended
                ? -1
                : 1;
            }

            return (
              a.price - b.price
            );
          },
        );
      } else {
        /**
         * For supporting categories:
         *
         * Prefer products in the requested budget range,
         * then products with matching finish.
         */
        candidates.sort(
          (a, b) => {
            const aFinish =
              request.space_profile.finish &&
              request.space_profile.finish !==
                "No preference" &&
              a.finish?.toLowerCase() ===
                request.space_profile.finish.toLowerCase();

            const bFinish =
              request.space_profile.finish &&
              request.space_profile.finish !==
                "No preference" &&
              b.finish?.toLowerCase() ===
                request.space_profile.finish.toLowerCase();

            if (
              aFinish !== bFinish
            ) {
              return aFinish
                ? -1
                : 1;
            }

            const max =
              request.space_profile
                .budget_max;

            if (max != null) {
              const aWithin =
                a.price <= max;

              const bWithin =
                b.price <= max;

              if (
                aWithin !==
                bWithin
              ) {
                return aWithin
                  ? -1
                  : 1;
              }
            }

            return (
              a.price - b.price
            );
          },
        );
      }

      candidates =
        candidates.slice(
          0,
          PRODUCTS_PER_CATEGORY,
        );

      if (
        candidates.length === 0
      ) {
        validConfiguration =
          false;
        break;
      }

      groups.push(candidates);
    }

    if (!validConfiguration) {
      continue;
    }

    /**
     * Generate the Cartesian product of candidate groups.
     */
    const combinations =
      generateCombinations(
        groups,
      );

    for (const products of combinations) {
      const totalPrice =
        products.reduce(
          (total, product) =>
            total + product.price,
          0,
        );

      const budgetMax =
        request.space_profile
          .budget_max;

      /**
       * Do not return configurations that exceed
       * a specified maximum budget.
       */
      if (
        budgetMax != null &&
        totalPrice > budgetMax
      ) {
        continue;
      }

      const score =
        calculateConfigurationScore(
          products,
          totalPrice,
          request,
        );

const configurationType =
  products.length <= 2
    ? "Essential"
    : products.length === 3
      ? "Complete"
      : "Premium";

configurations.push({
  items: products.map(
    (product) => ({
      category:
        product.subcategory,
      product,
    }),
  ),
  total_price: totalPrice,
  budget_remaining:
    budgetMax == null
      ? 0
      : Math.max(
          0,
          budgetMax - totalPrice,
        ),
  match_score: score,
  reasons: buildReasons(
    products,
    totalPrice,
    request,
  ),
  configuration_type:
    configurationType,
});
    }
  }

  /**
   * Remove duplicate configurations.
   */
  const unique =
    new Map<
      string,
      ProductConfiguration
    >();

  for (const configuration of configurations) {
    const key =
      configuration.items
        .map(
          (item) =>
            item.product.product_id,
        )
        .sort()
        .join("|");

    const existing =
      unique.get(key);

    if (
      !existing ||
      configuration.match_score >
        existing.match_score
    ) {
      unique.set(
        key,
        configuration,
      );
    }
  }

  /**
   * Return the strongest configurations.
   *
   * We return multiple configurations rather than
   * collapsing everything into one "best" package.
   */
  return [
    ...unique.values(),
  ]
    .sort((a, b) => {
      if (
        b.match_score !==
        a.match_score
      ) {
        return (
          b.match_score -
          a.match_score
        );
      }

      return (
        a.total_price -
        b.total_price
      );
    })
    .slice(0, 3);
}