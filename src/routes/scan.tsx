import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { analyzeImage } from "@/lib/api.functions";
import { useSession } from "@/lib/session-store";
import {
  BATHROOM_OBJECTS,
  BUDGET_PRESETS,
  FINISH_OPTIONS,
  ISSUE_LABELS,
  KITCHEN_OBJECTS,
  OBJECT_LABELS,
  STYLE_OPTIONS,
  formatINR,
  type DetectedIssue,
  type DetectedObject,
  type SpaceProfile,
  type SpaceType,
  type Unit,
  type VisionResult,
} from "@/types/domain";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Scan your bathroom or kitchen — KOHLER Fit Finder" },
      {
        name: "description",
        content:
          "Enter your space, dimensions and budget, then capture or upload a photo of the fixture you need to replace.",
      },
      { property: "og:title", content: "Scan your bathroom or kitchen" },
      {
        property: "og:description",
        content:
          "Capture a fixture, confirm the possible issue, and get matched KOHLER products for your space and budget.",
      },
    ],
  }),
  component: ScanFlow,
});

type Step = "space" | "dimensions" | "budget" | "preferences" | "capture" | "confirm";

const STEP_ORDER: Step[] = ["space", "dimensions", "budget", "preferences", "capture", "confirm"];

const ISSUE_CHOICES: DetectedIssue[] = [
  "leakage",
  "visible_damage",
  "crack",
  "corrosion",
  "broken_component",
  "replacement_needed",
];

const DEMO_SCENARIOS = [
  {
    id: "faucet_leak" as const,
    title: "Bathroom faucet · possible leakage",
    detail: "₹20,000–₹40,000 · Modern · Polished Chrome",
    space: "bathroom" as SpaceType,
  },
  {
    id: "kitchen_sink" as const,
    title: "Kitchen sink · replacement required",
    detail: "₹40,000–₹75,000 · Contemporary",
    space: "kitchen" as SpaceType,
  },
  {
    id: "toilet_upgrade" as const,
    title: "Toilet · upgrade",
    detail: "₹40,000–₹75,000 · Luxury",
    space: "bathroom" as SpaceType,
  },
];

function StepShell({
  step,
  title,
  subtitle,
  children,
  onBack,
}: {
  step: Step;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack?: () => void;
}) {
  const index = STEP_ORDER.indexOf(step);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Progress value={((index + 1) / STEP_ORDER.length) * 100} className="h-[3px]" />
      <div className="mt-8 animate-rise space-y-2">
        <p className="eyebrow">
          Step {index + 1} of {STEP_ORDER.length}
        </p>
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {subtitle && <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="mt-8 space-y-6">{children}</div>
      {onBack && (
        <Button variant="ghost" className="mt-8 rounded-none px-0" onClick={onBack}>
          ← Back
        </Button>
      )}
    </div>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border p-4 text-left text-sm transition-colors ${
        active
          ? "border-foreground bg-secondary text-foreground"
          : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ScanFlow() {
  const navigate = useNavigate();
  const { profile, setProfile, addScan } = useSession();

  const [step, setStep] = useState<Step>("space");
  const [spaceType, setSpaceType] = useState<SpaceType>("bathroom");
  const [unit, setUnit] = useState<Unit>("ft");
  const [dims, setDims] = useState({ length: "", width: "", height: "", depth: "" });
  const [budget, setBudget] = useState<{ min: number; max: number | null }>({
    min: 20000,
    max: 40000,
  });
  const [customBudget, setCustomBudget] = useState({ min: "", max: "" });
  const [style, setStyle] = useState<string>("No preference");
  const [finish, setFinish] = useState<string>("No preference");

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [chosenObject, setChosenObject] = useState<DetectedObject | null>(null);
  const [chosenIssue, setChosenIssue] = useState<DetectedIssue | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const runAnalysis = useServerFn(analyzeImage);

  useEffect(() => {
    if (profile) {
      setSpaceType(profile.space_type);
      setUnit(profile.unit);
      setBudget({ min: profile.budget_min, max: profile.budget_max });
      setStyle(profile.style ?? "No preference");
      setFinish(profile.finish ?? "No preference");
      setDims({
        length: profile.length?.toString() ?? "",
        width: profile.width?.toString() ?? "",
        height: profile.height?.toString() ?? "",
        depth: profile.countertop_depth?.toString() ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.space_type]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const buildProfile = (): SpaceProfile => ({
    space_type: spaceType,
    length: dims.length ? Number(dims.length) : null,
    width: dims.width ? Number(dims.width) : null,
    height: dims.height ? Number(dims.height) : null,
    countertop_depth: dims.depth ? Number(dims.depth) : null,
    unit,
    budget_min: budget.min,
    budget_max: budget.max,
    style: style === "No preference" ? null : style,
    finish: finish === "No preference" ? null : finish,
  });

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      setCameraOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      toast.error("Camera unavailable", {
        description: "Allow camera access in your browser, or upload a photo instead.",
      });
    }
  }

  function captureFrame() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setImagePreview(canvas.toDataURL("image/jpeg", 0.85));
    setImageName("Camera capture");
    stopCamera();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  }

  async function analyze(scenario?: (typeof DEMO_SCENARIOS)[number]["id"]) {
    setAnalyzing(true);
    setResult(null);
    try {
      const base64 = imagePreview ? imagePreview.split(",")[1] ?? "" : "";
      const res = await runAnalysis({
        data: { imageBase64: base64, spaceType, scenario },
      });
      setResult(res);
      setChosenObject(res.object);
      setChosenIssue(res.possible_issue);
      setStep("confirm");
    } catch {
      toast.error("Analysis failed", { description: "Please try the scan again." });
    } finally {
      setAnalyzing(false);
    }
  }

  function finish_() {
    if (!chosenObject || !chosenIssue) return;
    const nextProfile = buildProfile();
    setProfile(nextProfile);
    addScan({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      space_profile: nextProfile,
      image_name: imageName,
      detected_object: result?.object ?? null,
      object_confidence: result?.object_confidence ?? 0,
      possible_issue: result?.possible_issue ?? null,
      issue_confidence: result?.issue_confidence ?? 0,
      confirmed_issue: chosenIssue,
      created_at: new Date().toISOString(),
    });
    void navigate({
      to: "/recommendations",
      search: { object: chosenObject, issue: chosenIssue },
    });
  }

  if (step === "space") {
    return (
      <StepShell
        step="space"
        title="Which space are we working on?"
        subtitle="This prototype covers KOHLER bathroomware and kitchenware only."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(["bathroom", "kitchen"] as SpaceType[]).map((s) => (
            <Choice key={s} active={spaceType === s} onClick={() => setSpaceType(s)}>
              <span className="block text-lg text-foreground capitalize">{s}</span>
              <span className="mt-1 block text-xs">
                {s === "bathroom"
                  ? "Faucets, washbasins, toilets, showers, bathtubs, accessories"
                  : "Kitchen sinks and kitchen faucets"}
              </span>
            </Choice>
          ))}
        </div>
        <Button className="w-full rounded-none" size="lg" onClick={() => setStep("dimensions")}>
          Continue
        </Button>
      </StepShell>
    );
  }

  if (step === "dimensions") {
    return (
      <StepShell
        step="dimensions"
        title="Your space dimensions"
        subtitle="Used to check published product sizes against your space. Leave a field blank if you don't know it."
        onBack={() => setStep("space")}
      >
        <div className="flex gap-2">
          {(["ft", "in", "cm"] as Unit[]).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u)}
              className={`border px-4 py-2 text-xs uppercase ${
                unit === u ? "border-foreground bg-secondary" : "border-border text-muted-foreground"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="len">Length ({unit})</Label>
            <Input
              id="len"
              inputMode="decimal"
              value={dims.length}
              onChange={(e) => setDims({ ...dims, length: e.target.value })}
              className="rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wid">Width ({unit})</Label>
            <Input
              id="wid"
              inputMode="decimal"
              value={dims.width}
              onChange={(e) => setDims({ ...dims, width: e.target.value })}
              className="rounded-none"
            />
          </div>
          {spaceType === "bathroom" ? (
            <div className="space-y-2">
              <Label htmlFor="hei">Height ({unit})</Label>
              <Input
                id="hei"
                inputMode="decimal"
                value={dims.height}
                onChange={(e) => setDims({ ...dims, height: e.target.value })}
                className="rounded-none"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="dep">Countertop depth ({unit})</Label>
              <Input
                id="dep"
                inputMode="decimal"
                value={dims.depth}
                onChange={(e) => setDims({ ...dims, depth: e.target.value })}
                className="rounded-none"
              />
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Installation clearance is not assumed. Where the price book does not publish a product
          size, the result will say so.
        </p>
        <Button className="w-full rounded-none" size="lg" onClick={() => setStep("budget")}>
          Continue
        </Button>
      </StepShell>
    );
  }

  if (step === "budget") {
    return (
      <StepShell
        step="budget"
        title="What's your budget?"
        subtitle="Prices are the MRP printed in the KOHLER India Price Book 2026."
        onBack={() => setStep("dimensions")}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {BUDGET_PRESETS.map((b) => (
            <Choice
              key={b.label}
              active={budget.min === b.min && budget.max === b.max}
              onClick={() => setBudget({ min: b.min, max: b.max })}
            >
              <span className="text-base text-foreground">{b.label}</span>
            </Choice>
          ))}
        </div>
        <div className="space-y-3 border-t border-border pt-5">
          <p className="eyebrow">Custom budget (₹)</p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Minimum"
              inputMode="numeric"
              value={customBudget.min}
              onChange={(e) => setCustomBudget({ ...customBudget, min: e.target.value })}
              className="rounded-none"
            />
            <Input
              placeholder="Maximum"
              inputMode="numeric"
              value={customBudget.max}
              onChange={(e) => setCustomBudget({ ...customBudget, max: e.target.value })}
              className="rounded-none"
            />
          </div>
          <Button
            variant="outline"
            className="rounded-none"
            onClick={() => {
              const min = Number(customBudget.min || 0);
              const max = customBudget.max ? Number(customBudget.max) : null;
              if (max != null && max <= min) {
                toast.error("Maximum must be greater than minimum");
                return;
              }
              setBudget({ min, max });
              toast.success("Custom budget applied");
            }}
          >
            Apply custom budget
          </Button>
          <p className="text-xs text-muted-foreground">
            Selected: {formatINR(budget.min)} – {budget.max ? formatINR(budget.max) : "no upper limit"}
          </p>
        </div>
        <Button className="w-full rounded-none" size="lg" onClick={() => setStep("preferences")}>
          Continue
        </Button>
      </StepShell>
    );
  }

  if (step === "preferences") {
    return (
      <StepShell
        step="preferences"
        title="Style and finish (optional)"
        subtitle="Preferences are only applied where the price book publishes the matching information."
        onBack={() => setStep("budget")}
      >
        <div className="space-y-3">
          <p className="eyebrow">Style</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STYLE_OPTIONS.map((s) => (
              <Choice key={s} active={style === s} onClick={() => setStyle(s)}>
                {s}
              </Choice>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Note: style is not published in the price book, so it cannot be verified per product.
          </p>
        </div>
        <div className="space-y-3">
          <p className="eyebrow">Finish</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FINISH_OPTIONS.map((f) => (
              <Choice key={f} active={finish === f} onClick={() => setFinish(f)}>
                {f}
              </Choice>
            ))}
          </div>
        </div>
        <Button className="w-full rounded-none" size="lg" onClick={() => setStep("capture")}>
          Continue to scan
        </Button>
      </StepShell>
    );
  }

  if (step === "capture") {
    return (
      <StepShell
        step="capture"
        title="Scan your bathroom or kitchen"
        subtitle="Take a photo of the fixture or issue you're experiencing."
        onBack={() => setStep("preferences")}
      >
        {cameraOn ? (
          <div className="space-y-3">
            <video
              ref={videoRef}
              playsInline
              muted
              className="aspect-[3/4] w-full border border-border object-cover"
            />
            <div className="flex gap-2">
              <Button className="flex-1 rounded-none" size="lg" onClick={captureFrame}>
                Capture
              </Button>
              <Button variant="outline" className="rounded-none" onClick={stopCamera}>
                Cancel
              </Button>
            </div>
          </div>
        ) : imagePreview ? (
          <div className="space-y-3">
            <img
              src={imagePreview}
              alt="Captured fixture preview"
              className="max-h-[420px] w-full border border-border object-contain bg-surface"
            />
            <p className="text-xs text-muted-foreground">{imageName}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                className="flex-1 rounded-none"
                size="lg"
                onClick={() => analyze()}
                disabled={analyzing}
              >
                {analyzing ? <Loader2 className="size-4 animate-spin" /> : null}
                {analyzing ? "Analysing…" : "Confirm image & analyse"}
              </Button>
              <Button
                variant="outline"
                className="rounded-none"
                onClick={() => {
                  setImagePreview(null);
                  setImageName(null);
                }}
              >
                <RefreshCw className="size-4" /> Retake
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button size="lg" className="rounded-none" onClick={openCamera}>
                <Camera className="size-4" /> Open Camera
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-none"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="size-4" /> Upload Image
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={onFile}
            />
            <div className="panel space-y-3 p-5">
              <p className="eyebrow">Use a sample scan</p>
              <p className="text-xs text-muted-foreground">
                Demo scenarios use a mock detector so you can walk the full flow without a photo.
              </p>
              {DEMO_SCENARIOS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  disabled={analyzing}
                  onClick={() => {
                    setSpaceType(d.space);
                    setImageName(`Sample: ${d.title}`);
                    void analyze(d.id);
                  }}
                  className="flex w-full items-center justify-between border border-border p-3 text-left text-sm transition-colors hover:border-foreground/40"
                >
                  <span>
                    <span className="block">{d.title}</span>
                    <span className="text-xs text-muted-foreground">{d.detail}</span>
                  </span>
                  <Wand2 className="size-4 text-accent" />
                </button>
              ))}
            </div>
          </div>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">
          Images are analysed to identify visible fixtures and possible issues. Please avoid
          uploading images containing sensitive personal information. Photos are processed in memory
          and are not stored.
        </p>
      </StepShell>
    );
  }

  // confirm
  const objectPool = spaceType === "kitchen" ? KITCHEN_OBJECTS : BATHROOM_OBJECTS;
  const lowConfidence =
    !result?.object || result.object_confidence < 0.7 || (result.issue_confidence ?? 0) < 0.6;

  return (
    <StepShell
      step="confirm"
      title="Please confirm what you're seeing"
      subtitle="Detection is assistive only — it cannot definitively diagnose plumbing problems."
      onBack={() => setStep("capture")}
    >
      {result?.error === "poor_image_quality" ? (
        <div className="panel space-y-3 p-5">
          <p className="text-sm">
            The image isn't clear enough to analyse. Please take another photo.
          </p>
          <Button className="rounded-none" onClick={() => setStep("capture")}>
            Try another scan
          </Button>
        </div>
      ) : (
        <>
          <div className="panel space-y-4 p-5">
            <p className="eyebrow">
              {result?.mock
                ? "AI detected · demo detector, not a trained model"
                : "AI detected · assistive vision model, always confirm below"}
            </p>
            {result?.object ? (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl">{OBJECT_LABELS[result.object]}</span>
                  <span className="text-sm text-muted-foreground">
                    Confidence {Math.round(result.object_confidence * 100)}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-t border-border pt-3">
                  <span>
                    <span className="eyebrow block">Possible issue</span>
                    <span className="text-lg">
                      {result.possible_issue ? ISSUE_LABELS[result.possible_issue] : "Not determined"}
                    </span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Confidence {Math.round(result.issue_confidence * 100)}%
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm">
                We couldn't identify a supported bathroom or kitchen fixture. Please select it
                below or try another photo.
              </p>
            )}
          </div>

          {lowConfidence && (
            <p className="border-l-2 border-warning bg-surface p-3 text-xs leading-relaxed text-muted-foreground">
              We're not fully confident about the fixture or issue. Please select what you're
              experiencing before we recommend anything.
            </p>
          )}

          <div className="space-y-3">
            <p className="eyebrow">Fixture</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {objectPool.map((o) => (
                <Choice key={o} active={chosenObject === o} onClick={() => setChosenObject(o)}>
                  {OBJECT_LABELS[o]}
                </Choice>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="eyebrow">Is this the issue you're experiencing?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ISSUE_CHOICES.map((i) => (
                <Choice key={i} active={chosenIssue === i} onClick={() => setChosenIssue(i)}>
                  {ISSUE_LABELS[i]}
                </Choice>
              ))}
            </div>
          </div>

          <Button
            size="lg"
            className="w-full rounded-none"
            disabled={!chosenObject || !chosenIssue}
            onClick={finish_}
          >
            Yes, continue to recommendations
          </Button>
          <Button variant="ghost" className="w-full rounded-none" onClick={() => setStep("capture")}>
            No — try another scan
          </Button>
        </>
      )}
    </StepShell>
  );
}
