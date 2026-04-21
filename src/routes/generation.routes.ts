import { Router } from "express";
import { createGenerationJob } from "../services/generation";
import { prisma } from "../services/prisma";
import { generatePostSchema } from "../types/generation";

export const generationRouter = Router();

generationRouter.post("/", async (req, res, next) => {
  try {
    const payload = generatePostSchema.parse(req.body);
    const result = await createGenerationJob(payload);
    res.status(202).json({
      message: "Generation job queued successfully",
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

generationRouter.get("/:jobId", async (req, res, next) => {
  try {
    const job = await prisma.generationJob.findUnique({
      where: { id: req.params.jobId },
      include: {
        steps: true,
        assets: true,
        exports: true,
      },
    });

    if (!job) {
      res.status(404).json({ message: "Generation job not found" });
      return;
    }

    res.json(job);
  } catch (error) {
    next(error);
  }
});
