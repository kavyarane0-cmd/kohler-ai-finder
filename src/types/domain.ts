/**
 * Shared domain types for the KOHLER AI Recommendation prototype.
 * These mirror the logical entities described in the project brief so a
 * FastAPI backend / database can adopt the same contract later.
 */

export type SpaceType = "bathroom" | "kitchen";

export type Unit = "ft" | "in" | "cm";

/** Object classes the (future) YOLO model is expected to emit. */
export type DetectedObject =
  | "bathroom_faucet"
  | "washbasin"
  | "toilet"
  | "shower"
  | "bathtub"
  | "kitchen_faucet"
  | "kitchen_sink";

/** Issue classes the (future) model is expected to emit. */
export type DetectedIssue =
  | "leakage"
  | "visible_damage"
  | "crack"
  | "corrosion"
  | "broken_component"
  | "replacement_needed"
  | "no_visible_issue";

export type Subcategory =
  | "Bathroom Faucets"
  | "Washbasins"
  | "Toilets"
  | "Showers"
  | "Bathtubs"
  | "Bathroom Accessories"
  | "Kitchen Faucets"
  | "Kitchen Sinks";

export interface Product {
  /** Stable id (equals SKU in this price-book-backed provider). */
  product_id: string;
  sku: string;
  product_name: string;
  collection: string | null;
  category: "Bathroomware" | "Kitchenware";
  subcategory: Subcategory;
  price: number;
  currency: "INR";
  description: string;
  /** Raw dimension string as printed in the price book, when present. */
  dimensions: string | null;
  installation_type: string | null;
  finish: string | null;
  material: string | null;
  /** Page of the source price book the record was extracted from. */
  source_page: number;
  /** Not available in the price book — intentionally never fabricated. */
  product_image: null;
  product_url: null;
  style: null;
}

export interface SpaceProfile {
  space_type: SpaceType;
  length: number | null;
  width: number | null;
  height: number | null;
  countertop_depth: number | null;
  unit: Unit;
  budget_min: number;
  budget_max: number | null;
  style: string | null;
  finish: string | null;
}

export interface VisionResult {
  object: DetectedObject | null;
  object_confidence: number;
  possible_issue: DetectedIssue | null;
  issue_confidence: number;
  /** Set when the service cannot analyse the image at all. */
  error?: "poor_image_quality" | "unsupported_fixture";
  /** Always true for the mock service — the real model must set false. */
  mock: boolean;
  model: string;
}

export interface Scan {
  id: string;
  space_profile: SpaceProfile;
  image_name: string | null;
  detected_object: DetectedObject | null;
  object_confidence: number;
  possible_issue: DetectedIssue | null;
  issue_confidence: number;
  confirmed_issue: DetectedIssue | null;
  created_at: string;
}

export interface ReasonLine {
  ok: boolean | "unknown";
  text: string;
}

export interface Recommendation {
  product: Product;
  match_score: number;
  reasons: ReasonLine[];
  /** True when product data cannot establish physical fit. */
  needs_professional_verification: boolean;
}

export interface RecommendationRequest {
  detected_object: DetectedObject;
  confirmed_issue: DetectedIssue;
  space_profile: SpaceProfile;
}

export const OBJECT_LABELS: Record<DetectedObject, string> = {
  bathroom_faucet: "Bathroom Faucet",
  washbasin: "Washbasin",
  toilet: "Toilet",
  shower: "Shower",
  bathtub: "Bathtub",
  kitchen_faucet: "Kitchen Faucet",
  kitchen_sink: "Kitchen Sink",
};

export const ISSUE_LABELS: Record<DetectedIssue, string> = {
  leakage: "Leakage",
  visible_damage: "Visible damage",
  crack: "Crack",
  corrosion: "Corrosion",
  broken_component: "Broken component",
  replacement_needed: "Replacement required",
  no_visible_issue: "No visible issue",
};

export const OBJECT_TO_SUBCATEGORY: Record<DetectedObject, Subcategory> = {
  bathroom_faucet: "Bathroom Faucets",
  washbasin: "Washbasins",
  toilet: "Toilets",
  shower: "Showers",
  bathtub: "Bathtubs",
  kitchen_faucet: "Kitchen Faucets",
  kitchen_sink: "Kitchen Sinks",
};

export const BATHROOM_OBJECTS: DetectedObject[] = [
  "bathroom_faucet",
  "washbasin",
  "toilet",
  "shower",
  "bathtub",
];

export const KITCHEN_OBJECTS: DetectedObject[] = ["kitchen_faucet", "kitchen_sink"];

export const STYLE_OPTIONS = [
  "Modern",
  "Minimal",
  "Contemporary",
  "Classic",
  "Luxury",
  "No preference",
] as const;

export const FINISH_OPTIONS = [
  "Polished Chrome",
  "Matte Black",
  "Brushed Nickel",
  "Brushed Bronze",
  "French Gold",
  "Rose Gold",
  "No preference",
] as const;

export const BUDGET_PRESETS = [
  { label: "₹10,000 – ₹20,000", min: 10000, max: 20000 },
  { label: "₹20,000 – ₹40,000", min: 20000, max: 40000 },
  { label: "₹40,000 – ₹75,000", min: 40000, max: 75000 },
  { label: "₹75,000 – ₹1,50,000", min: 75000, max: 150000 },
  { label: "₹1,50,000+", min: 150000, max: null },
] as const;

export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}
export interface ConfigurationItem {
  category: Subcategory;
  product: Product;
}

export interface ProductConfiguration {
  items: ConfigurationItem[];
  total_price: number;
  budget_remaining: number;
  match_score: number;
  reasons: ReasonLine[];
  configuration_type?:"Essential"|"Complete"|"Premium"
}