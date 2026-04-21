import { Worker } from "bullmq";
import {
  FormatType,
  GenerationStatus,
  StepStatus,
} from "../../generated/prisma/enums";
import { env } from "../config/env";
import { buildCreativeTokens, saveStepProgress } from "../services/generation";
import { prisma } from "../services/prisma";
import { generationQueue, queueConnection } from "../services/queue";
import { CopyBlock, GeneratePostInput, LayoutBlock } from "../types/generation";

type PipelineJobData = {
  jobId: string;
  step: "planning" | "copy_generated" | "layout_generated" | "rendering" | "validating" | "completed";
  input: GeneratePostInput;
  outline?: string[];
  copy?: CopyBlock[];
  layout?: LayoutBlock[];
};

function buildOutline(input: GeneratePostInput): string[] {
  return Array.from({ length: input.slideCount }, (_, i) => {
    if (i === 0) return `Gancho principal sobre ${input.topic}`;
    if (i === input.slideCount - 1) return `Fechamento com CTA: ${input.cta}`;
    return `Ponto ${i} para ${input.audience}`;
  });
}

function generateCopy(outline: string[], input: GeneratePostInput): CopyBlock[] {
  return outline.map((item, i) => ({
    headline: `${i + 1}. ${item}`,
    supporting: `Aplicar no contexto de ${input.objective} com linguagem direta.`,
    cta: i === outline.length - 1 ? input.cta : "Deslize para o proximo",
  }));
}

function generateLayout(copy: CopyBlock[]): LayoutBlock[] {
  return copy.map((item) => ({
    ...item,
    x: 96,
    y: 120,
    width: 888,
    height: 840,
  }));
}

function validateLayout(layout: LayoutBlock[]) {
  return layout.every((block) => block.headline.length <= 120 && block.supporting.length <= 220);
}

export function startPipelineWorker() {
  return new Worker<PipelineJobData>(
    "generation",
    async (job) => {
      const { jobId, step, input } = job.data;

      if (step === "planning") {
        const outline = buildOutline(input);
        await saveStepProgress(jobId, "planning", StepStatus.completed, outline, job.attemptsMade + 1);
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { status: GenerationStatus.planning, currentStep: "planning", startedAt: new Date() },
        });
        await generationQueue.add("pipeline", { jobId, step: "copy_generated", input, outline });
        return;
      }

      if (step === "copy_generated") {
        const outline = job.data.outline ?? buildOutline(input);
        const copy = generateCopy(outline, input);
        await saveStepProgress(jobId, "copy_generated", StepStatus.completed, copy, job.attemptsMade + 1);
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { status: GenerationStatus.copy_generated, currentStep: "copy_generated" },
        });
        await generationQueue.add("pipeline", { jobId, step: "layout_generated", input, copy });
        return;
      }

      if (step === "layout_generated") {
        const layout = generateLayout(job.data.copy ?? []);
        await saveStepProgress(jobId, "layout_generated", StepStatus.completed, layout, job.attemptsMade + 1);
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { status: GenerationStatus.layout_generated, currentStep: "layout_generated" },
        });
        await generationQueue.add("pipeline", { jobId, step: "rendering", input, layout, copy: job.data.copy });
        return;
      }

      if (step === "rendering") {
        const currentJob = await prisma.generationJob.findUniqueOrThrow({
          where: { id: jobId },
        });
        const postId = currentJob.postId;
        const creativeTokens = buildCreativeTokens(input.mode);

        await prisma.$transaction(async (tx) => {
          for (let i = 0; i < input.slideCount; i += 1) {
            const slide = await tx.slide.upsert({
              where: {
                postId_orderIndex: {
                  postId,
                  orderIndex: i + 1,
                },
              },
              create: {
                postId,
                orderIndex: i + 1,
                headline: `Slide ${i + 1}`,
                supporting: `Conteudo automaticamente gerado para ${input.topic}.`,
                cta: input.cta,
                creativeMode: input.mode,
              },
              update: {
                headline: `Slide ${i + 1}`,
                supporting: `Conteudo automaticamente gerado para ${input.topic}.`,
                cta: input.cta,
                creativeMode: input.mode,
              },
            });

            await tx.asset.create({
              data: {
                jobId,
                postId,
                slideId: slide.id,
                formatType: FormatType.feed_square,
                width: 1080,
                height: 1080,
                storageUrl: `https://cdn.local/${jobId}/feed/${i + 1}.png`,
                metadataJson: creativeTokens,
              },
            });
          }

          if (input.generateStories) {
            for (let i = 0; i < input.storyFrameCount; i += 1) {
              const frame = await tx.storyFrame.upsert({
                where: {
                  postId_orderIndex: {
                    postId,
                    orderIndex: i + 1,
                  },
                },
                create: {
                  postId,
                  orderIndex: i + 1,
                  headline: `Story ${i + 1}`,
                  supporting: `Resumo vertical sobre ${input.topic}.`,
                  cta: input.cta,
                  creativeMode: input.mode,
                },
                update: {
                  headline: `Story ${i + 1}`,
                  supporting: `Resumo vertical sobre ${input.topic}.`,
                  cta: input.cta,
                  creativeMode: input.mode,
                },
              });

              await tx.asset.create({
                data: {
                  jobId,
                  postId,
                  storyFrameId: frame.id,
                  formatType: FormatType.story_vertical,
                  width: 1080,
                  height: 1920,
                  storageUrl: `https://cdn.local/${jobId}/story/${i + 1}.png`,
                  metadataJson: creativeTokens,
                },
              });
            }
          }
        });

        await saveStepProgress(jobId, "rendering", StepStatus.completed, { rendered: true }, job.attemptsMade + 1);
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { status: GenerationStatus.rendering, currentStep: "rendering" },
        });
        await generationQueue.add("pipeline", { jobId, step: "validating", input, layout: job.data.layout ?? [] });
        return;
      }

      if (step === "validating") {
        const isValid = validateLayout(job.data.layout ?? []);
        if (!isValid) {
          await saveStepProgress(jobId, "validating", StepStatus.failed, { isValid }, job.attemptsMade + 1);
          await prisma.generationJob.update({
            where: { id: jobId },
            data: {
              status: GenerationStatus.failed,
              currentStep: "validating",
              errorCode: "LAYOUT_VALIDATION_FAILED",
              errorMessage: "Layout validation failed due to text overflow constraints.",
            },
          });
          return;
        }

        await saveStepProgress(jobId, "validating", StepStatus.completed, { isValid }, job.attemptsMade + 1);
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { status: GenerationStatus.validating, currentStep: "validating" },
        });
        await generationQueue.add("pipeline", { jobId, step: "completed", input });
        return;
      }

      if (step === "completed") {
        const currentJob = await prisma.generationJob.findUniqueOrThrow({
          where: { id: jobId },
        });

        const feedAssets = await prisma.asset.count({
          where: { jobId, formatType: FormatType.feed_square },
        });

        await prisma.export.create({
          data: {
            projectId: input.projectId,
            jobId,
            formatType: FormatType.feed_square,
            zipUrl: `https://cdn.local/${jobId}/exports/feed.zip`,
            totalAssets: feedAssets,
          },
        });

        if (input.generateStories) {
          const storyAssets = await prisma.asset.count({
            where: { jobId, formatType: FormatType.story_vertical },
          });
          await prisma.export.create({
            data: {
              projectId: input.projectId,
              jobId,
              formatType: FormatType.story_vertical,
              zipUrl: `https://cdn.local/${jobId}/exports/story.zip`,
              totalAssets: storyAssets,
            },
          });
        }

        await saveStepProgress(jobId, "completed", StepStatus.completed, { exported: true }, job.attemptsMade + 1);
        await prisma.generationJob.update({
          where: { id: currentJob.id },
          data: {
            status: GenerationStatus.completed,
            currentStep: "completed",
            finishedAt: new Date(),
          },
        });
      }
    },
    { connection: queueConnection, concurrency: 3 },
  );
}

export function logPipelineWorkerReady() {
  console.log(`Pipeline worker connected on ${env.redisUrl}`);
}
