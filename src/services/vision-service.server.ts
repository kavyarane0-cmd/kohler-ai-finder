/**
 * Computer Vision Service — MOCK implementation.
 *
 * ⚠️ This is NOT a trained model. It returns deterministic pseudo-detections
 * derived from the uploaded file's bytes so the end-to-end flow can be demoed.
 *
 * To plug in the real model, implement `VisionService` against your
 * YOLO/FastAPI endpoint and return it from `getVisionService()`. The response
 * contract is intentionally identical:
 *   { object, object_confidence, possible_issue, issue_confidence }
 */
import type { DetectedIssue, DetectedObject, SpaceType, VisionResult } from "@/types/domain";
import { BATHROOM_OBJECTS, KITCHEN_OBJECTS } from "@/types/domain";

export interface VisionRequest {
  /** base64 (no data-url prefix) of the captured/uploaded image. */
  imageBase64: string;
  spaceType: SpaceType;
  /** Optional demo scenario id — forces a specific detection. */
  scenario?: "faucet_leak" | "kitchen_sink" | "toilet_upgrade";
}

export interface VisionService {
  readonly name: string;
  readonly isMock: boolean;
  analyze(req: VisionRequest): Promise<VisionResult>;
}

const ISSUE_BY_OBJECT: Record<DetectedObject, DetectedIssue[]> = {
  bathroom_faucet: ["leakage", "corrosion", "visible_damage"],
  washbasin: ["crack", "visible_damage", "replacement_needed"],
  toilet: ["replacement_needed", "broken_component", "visible_damage"],
  shower: ["visible_damage", "corrosion", "replacement_needed"],
  bathtub: ["visible_damage", "crack", "replacement_needed"],
  kitchen_faucet: ["leakage", "corrosion", "broken_component"],
  kitchen_sink: ["replacement_needed", "crack", "corrosion"],
};

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

class MockVisionService implements VisionService {
  readonly name = "mock-vision-v0 (not a trained model)";
  readonly isMock = true;

  async analyze(req: VisionRequest): Promise<VisionResult> {
    const base = {
      mock: true,
      model: this.name,
    };

    if (req.scenario) {
      const preset: Record<string, VisionResult> = {
        faucet_leak: {
          ...base,
          object: "bathroom_faucet",
          object_confidence: 0.91,
          possible_issue: "leakage",
          issue_confidence: 0.76,
        },
        kitchen_sink: {
          ...base,
          object: "kitchen_sink",
          object_confidence: 0.88,
          possible_issue: "replacement_needed",
          issue_confidence: 0.71,
        },
        toilet_upgrade: {
          ...base,
          object: "toilet",
          object_confidence: 0.93,
          possible_issue: "replacement_needed",
          issue_confidence: 0.68,
        },
      };
      return preset[req.scenario];
    }

    const bytes = req.imageBase64.length;
    if (bytes < 2000) {
      return {
        ...base,
        object: null,
        object_confidence: 0,
        possible_issue: null,
        issue_confidence: 0,
        error: "poor_image_quality",
      };
    }

    const seed = hash(req.imageBase64.slice(0, 4096) + String(bytes));
    const pool = req.spaceType === "kitchen" ? KITCHEN_OBJECTS : BATHROOM_OBJECTS;
    const object = pool[seed % pool.length];
    const issues = ISSUE_BY_OBJECT[object];
    const possible_issue = issues[(seed >> 5) % issues.length];

    const object_confidence = 0.58 + ((seed >> 3) % 40) / 100; // 0.58 – 0.97
    const issue_confidence = 0.42 + ((seed >> 7) % 45) / 100; // 0.42 – 0.86

    return {
      ...base,
      object,
      object_confidence: Number(object_confidence.toFixed(2)),
      possible_issue,
      issue_confidence: Number(issue_confidence.toFixed(2)),
    };
  }
}

const mockService: VisionService = new MockVisionService();

let service: VisionService | null = null;

export function getVisionService(): VisionService {
  return service ?? mockService;
}

/** Registered at request time by the API layer to avoid an import cycle. */
export function setVisionService(next: VisionService) {
  service = next;
}

export function getMockVisionService(): VisionService {
  return mockService;
}
