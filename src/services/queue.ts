import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env";

const connection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
});

export const generationQueue = new Queue("generation", { connection });

export const queueConnection = connection;
