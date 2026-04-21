import crypto from "node:crypto";
import { GenerationStatus, StepStatus } from "../../generated/prisma/enums";
import { CREATIVE_RULES } from "../constants/creative";
import { GeneratePostInput } from "../types/generation";
import { prisma } from "./prisma";
import { generationQueue } from "./queue";

export async function createGenerationJob(input: GeneratePostInput) {
  const post = await prisma.post.create({
    data: {
      projectId: input.projectId,
      title: input.postTitle,
      status: GenerationStatus.queued,
    },
  });

  const job = await prisma.generationJob.create({
    data: {
      postId: post.id,
      creativeMode: input.mode,
      status: GenerationStatus.queued,
      inputSnapshot: input,
    },
  });

  await generationQueue.add(
    "pipeline",
    {
      jobId: job.id,
      step: "planning",
      input,
    },
    {
      attempts: 4,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  );

  return { postId: post.id, generationJobId: job.id };
}

export async function saveStepProgress(
  generationJobId: string,
  step: string,
  status: StepStatus,
  payload: unknown,
  attempt = 1,
) {
  const inputHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");

  await prisma.generationStep.upsert({
    where: {
      jobId_stepName_attempt: {
        jobId: generationJobId,
        stepName: step,
        attempt,
      },
    },
    create: {
      jobId: generationJobId,
      stepName: step,
      status,
      inputHash,
      outputRef: `${generationJobId}/${step}`,
      attempt,
    },
    update: {
      status,
      inputHash,
      outputRef: `${generationJobId}/${step}`,
    },
  });
}

export function buildCreativeTokens(mode: keyof typeof CREATIVE_RULES) {
  const rule = CREATIVE_RULES[mode];
  return {
    visualDensity: rule.visualDensity,
    graphicsIntensity: rule.graphicsIntensity,
    maxHeadlineWords: rule.maxHeadlineWords,
    emphasisSlides: rule.emphasisSlides,
  };
}
