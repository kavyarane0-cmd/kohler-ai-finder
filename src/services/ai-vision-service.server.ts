
/**
 * Computer Vision Service — Gemini Vision implementation.
 *
 * Uses Google's Gemini API to identify:
 * - The primary bathroom/kitchen fixture
 * - A visibly identifiable issue
 *
 * The service keeps the existing VisionService contract so scan.tsx
 * does not need to be changed.
 */

import { GoogleGenAI } from "@google/genai";
import type {
  DetectedIssue,
  DetectedObject,
  VisionResult,
} from "@/types/domain";
import {
  BATHROOM_OBJECTS,
  KITCHEN_OBJECTS,
} from "@/types/domain";
import type {
  VisionRequest,
  VisionService,
} from "./vision-service.server";

const MODEL = "gemini-2.5-flash";

const ALL_OBJECTS: DetectedObject[] = [
  ...BATHROOM_OBJECTS,
  ...KITCHEN_OBJECTS,
];

const ALL_ISSUES: DetectedIssue[] = [
  "leakage",
  "visible_damage",
  "crack",
  "corrosion",
  "broken_component",
  "replacement_needed",
  "no_visible_issue",
];

const SYSTEM_INSTRUCTION = `
You are a visual inspection assistant for bathroom and kitchen fixtures.

Identify exactly one primary fixture from this allowed list:
${ALL_OBJECTS.join(", ")}

Then identify one visible issue from this allowed list:
${ALL_ISSUES.join(", ")}

Rules:
- Only report what is visibly supported by the image.
- Do not guess hidden plumbing problems.
- Do not guess the brand or product model.
- Return null for object if no supported fixture is clearly visible.
- Return null for possible_issue if no issue can be identified.
- Use confidence values between 0 and 1.
- If the image is blurry, dark, cropped, or otherwise unusable, set unusable to true.
- A fixture being old-looking does not automatically mean it has a defect.
- "replacement_needed" should be used only when the image or context clearly suggests that replacement is appropriate.
- Return JSON only.
`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    object: {
      type: ["string", "null"],
      enum: [...ALL_OBJECTS, null],
    },
    object_confidence: {
      type: "number",
    },
    possible_issue: {
      type: ["string", "null"],
      enum: [...ALL_ISSUES, null],
    },
    issue_confidence: {
      type: "number",
    },
    unusable: {
      type: "boolean",
    },
  },
  required: [
    "object",
    "object_confidence",
    "possible_issue",
    "issue_confidence",
    "unusable",
  ],
  additionalProperties: false,
};

function toDataUrl(imageBase64: string): string {
  if (imageBase64.startsWith("data:")) {
    return imageBase64;
  }

  return `data:image/jpeg;base64,${imageBase64}`;
}

function clamp01(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function getMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);base64,/);

  return match?.[1] ?? "image/jpeg";
}

function removeMarkdownCodeFence(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export class AiVisionService implements VisionService {
  readonly name = `gemini-vision (${MODEL})`;
  readonly isMock = false;

  private readonly client: GoogleGenAI | null;

  constructor(private readonly fallback: VisionService) {
    const key = process.env["GEMINI_API_KEY"];

    this.client = key
      ? new GoogleGenAI({ apiKey: key })
      : null;
  }

  async analyze(req: VisionRequest): Promise<VisionResult> {
    // Keep demo scenarios deterministic.
    if (req.scenario) {
      return this.fallback.analyze(req);
    }

    // Use the mock service if no Gemini key is available.
    if (!this.client) {
      return this.fallback.analyze(req);
    }

    const imageDataUrl = toDataUrl(req.imageBase64);
    const mimeType = getMimeType(imageDataUrl);

    const prompt = `
${SYSTEM_INSTRUCTION}

The image belongs to this space type:
${req.spaceType}

Analyze the supplied image and return the required JSON object.
`;

    try {
      const response = await this.client.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
              {
                inlineData: {
                  mimeType,
                  data: imageDataUrl.split(",")[1] ?? "",
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.1,
        },
      });

      const rawText = response.text?.trim() ?? "";

      if (!rawText) {
        throw new Error("Gemini returned an empty response.");
      }

      const parsed = JSON.parse(
        removeMarkdownCodeFence(rawText),
      ) as {
        object?: string | null;
        object_confidence?: number;
        possible_issue?: string | null;
        issue_confidence?: number;
        unusable?: boolean;
      };

      const base = {
        mock: false,
        model: this.name,
      };

      if (parsed.unusable === true) {
        return {
          ...base,
          object: null,
          object_confidence: 0,
          possible_issue: null,
          issue_confidence: 0,
          error: "poor_image_quality",
        };
      }

      const object =
        parsed.object &&
        ALL_OBJECTS.includes(parsed.object as DetectedObject)
          ? (parsed.object as DetectedObject)
          : null;

      const issue =
        parsed.possible_issue &&
        ALL_ISSUES.includes(parsed.possible_issue as DetectedIssue)
          ? (parsed.possible_issue as DetectedIssue)
          : null;

      return {
        ...base,
        object,
        object_confidence: object
          ? clamp01(parsed.object_confidence)
          : 0,
        possible_issue: object ? issue : null,
        issue_confidence:
          object && issue
            ? clamp01(parsed.issue_confidence)
            : 0,
        ...(object
          ? {}
          : { error: "unsupported_fixture" as const }),
      };
    } catch (error) {
      console.error("Gemini vision analysis failed:", error);

      throw new Error(
        "The image could not be analyzed. Please try another clear photo.",
      );
    }
  }
}