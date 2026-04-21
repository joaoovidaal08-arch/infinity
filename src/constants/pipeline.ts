export const PIPELINE_STEPS = [
  "planning",
  "copy_generated",
  "layout_generated",
  "rendering",
  "validating",
  "completed",
] as const;

export type PipelineStep = (typeof PIPELINE_STEPS)[number];

export const STEP_QUEUE_NAMES = {
  planning: "planner",
  copy_generated: "copy",
  layout_generated: "layout",
  rendering: "render",
  validating: "validate",
  completed: "variants",
} as const;
