/**
 * Server functions = the API surface of the prototype.
 * They mirror the eventual FastAPI routes one-for-one:
 *   POST /api/analyze-image  -> analyzeImage
 *   POST /api/recommendations -> getRecommendations
 *   GET  /api/products        -> listProducts
 *   GET  /api/products/{id}   -> getProduct
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getProductProvider, catalogStats } from "@/services/product-provider.server";
import { recommendProducts } from "@/services/recommendation-service.server";
import { generateConfigurations } from "@/services/configuration-service.server";
import type { DetectedIssue, DetectedObject, SpaceProfile } from "@/types/domain";

const spaceProfileSchema = z.object({
  space_type: z.enum(["bathroom", "kitchen"]),
  length: z.number().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  countertop_depth: z.number().nullable(),
  unit: z.enum(["ft", "in", "cm"]),
  budget_min: z.number(),
  budget_max: z.number().nullable(),
  style: z.string().nullable(),
  finish: z.string().nullable(),
});

export const analyzeImage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        imageBase64: z.string(),
        spaceType: z.enum(["bathroom", "kitchen"]),
        scenario: z.enum(["faucet_leak", "kitchen_sink", "toilet_upgrade"]).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    // Images are analysed in-memory only and never persisted.
    const { AiVisionService } = await import("@/services/ai-vision-service.server");
    const { getMockVisionService } = await import("@/services/vision-service.server");
    const mock = getMockVisionService();
    const req = {
      imageBase64: data.imageBase64,
      spaceType: data.spaceType,
      ...(data.scenario ? { scenario: data.scenario } : {}),
    };
    try {
      return await new AiVisionService(mock).analyze(req);
    } catch (error) {
      console.error("AI vision failed, falling back to mock detector:", error);
      return mock.analyze(req);
    }
  });

export const getRecommendations = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        detected_object: z.string(),
        confirmed_issue: z.string(),
        space_profile: spaceProfileSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) =>
    recommendProducts({
      detected_object: data.detected_object as DetectedObject,
      confirmed_issue: data.confirmed_issue as DetectedIssue,
      space_profile: data.space_profile as SpaceProfile,
    }),
  );
export const getConfigurations = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        detected_object: z.string(),
        confirmed_issue: z.string(),
        space_profile: spaceProfileSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) =>
    generateConfigurations({
      detected_object: data.detected_object as DetectedObject,
      confirmed_issue: data.confirmed_issue as DetectedIssue,
      space_profile: data.space_profile as SpaceProfile,
    }),
  );

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z
      .object({
        subcategory: z.string().optional(),
        search: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().nullable().optional(),
        limit: z.number().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    const provider = getProductProvider();
    const items = await provider.filterProducts({
      subcategory: data.subcategory as never,
      search: data.search,
      minPrice: data.minPrice,
      maxPrice: data.maxPrice ?? undefined,
      limit: data.limit ?? 48,
    });
    return { items, stats: catalogStats() };
  });

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => getProductProvider().getProductById(data.id));

export const getProductsByIds = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ ids: z.array(z.string()) }).parse(data))
  .handler(async ({ data }) => {
    const provider = getProductProvider();
    const items = await Promise.all(data.ids.map((id) => provider.getProductById(id)));
    return items.filter((p): p is NonNullable<typeof p> => p != null);
  });

export const getCatalogStats = createServerFn({ method: "GET" }).handler(async () =>
  catalogStats(),
);
