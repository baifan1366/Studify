export const DEFAULT_TEXT_MODEL = "openrouter/owl-alpha";

export function isVisionModel(model?: string): boolean {
  if (!model) return false;
  if (process.env.OPEN_ROUTER_IMAGE_MODEL && model === process.env.OPEN_ROUTER_IMAGE_MODEL) return true;
  return /(?:vision|[-/]vl(?:[-/:]|$)|pixtral|qwen.*vl|omni)/i.test(model);
}

export function resolveAIModel(requestedModel?: string): string {
  return isVisionModel(requestedModel) ? requestedModel! : DEFAULT_TEXT_MODEL;
}
