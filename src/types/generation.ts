import { z } from "zod";

export const generatePostSchema = z.object({
  projectId: z.string().min(1),
  postTitle: z.string().min(3),
  topic: z.string().min(3),
  objective: z.string().min(3),
  audience: z.string().min(3),
  cta: z.string().min(2),
  mode: z.enum(["minimal_twitter", "viral_bold", "hybrid"]),
  slideCount: z.number().int().min(5).max(10).default(7),
  storyFrameCount: z.number().int().min(3).max(5).default(3),
  generateStories: z.boolean().default(true),
});

export type GeneratePostInput = z.infer<typeof generatePostSchema>;

export type CopyBlock = {
  headline: string;
  supporting: string;
  cta: string;
};

export type LayoutBlock = CopyBlock & {
  x: number;
  y: number;
  width: number;
  height: number;
};
