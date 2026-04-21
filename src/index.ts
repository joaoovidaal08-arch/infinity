import express from "express";
import { ZodError } from "zod";
import { env } from "./config/env";
import { generationRouter } from "./routes/generation.routes";
import { prisma } from "./services/prisma";
import { startPipelineWorker, logPipelineWorkerReady } from "./workers/pipeline.worker";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/generation-jobs", generationRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Invalid request payload",
      issues: error.issues,
    });
    return;
  }

  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

const worker = startPipelineWorker();
logPipelineWorkerReady();

app.listen(env.port, () => {
  console.log(`Server listening on http://localhost:${env.port}`);
});

async function gracefulShutdown() {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
