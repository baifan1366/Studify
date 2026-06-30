export const DEFAULT_TEXT_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

export function isVisionModel(model?: string): boolean {
  if (!model) return false;
  if (process.env.OPEN_ROUTER_IMAGE_MODEL && model === process.env.OPEN_ROUTER_IMAGE_MODEL) return true;
  return /(?:vision|[-/]vl(?:[-/:]|$)|pixtral|qwen.*vl|omni)/i.test(model);
}

export function resolveAIModel(requestedModel?: string): string {
  return isVisionModel(requestedModel) ? requestedModel! : DEFAULT_TEXT_MODEL;
}
