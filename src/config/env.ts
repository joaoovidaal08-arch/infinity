import "dotenv/config";

const required = ["DATABASE_URL"] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL as string,
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
};
