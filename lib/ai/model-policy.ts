export const DEFAULT_TEXT_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";
export type AIModelMode = "fast" | "normal" | "thinking";

export function resolveModelForMode(mode: AIModelMode): string {
  if (mode === "fast") {
    return process.env.OPEN_ROUTER_MODEL || "liquid/lfm-2.5-1.2b-instruct:free";
  }

  if (mode === "thinking") {
    return (
      process.env.OPEN_ROUTER_REASONING_MODEL ||
      process.env.OPENROUTER_MODEL_THINKING ||
      process.env.OPEN_ROUTER_TOOL_CALLING_MODEL ||
      DEFAULT_TEXT_MODEL
    );
  }

  return (
    process.env.OPEN_ROUTER_NORMAL_MODEL ||
    process.env.OPENROUTER_MODEL_NORMAL ||
    process.env.OPEN_ROUTER_TOOL_CALLING_MODEL ||
    DEFAULT_TEXT_MODEL
  );
}

export function isVisionModel(model?: string): boolean {
  if (!model) return false;
  if (process.env.OPEN_ROUTER_IMAGE_MODEL && model === process.env.OPEN_ROUTER_IMAGE_MODEL) return true;
  return /(?:vision|[-/]vl(?:[-/:]|$)|pixtral|qwen.*vl|omni)/i.test(model);
}

export function resolveAIModel(requestedModel?: string): string {
  return requestedModel || DEFAULT_TEXT_MODEL;
}
