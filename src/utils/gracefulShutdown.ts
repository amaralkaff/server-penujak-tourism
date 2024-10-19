// utils/gracefulShutdown.ts
import { Server } from "http";
import { getRedisClient } from "./redisUtils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const setupGracefulShutdown = (server: Server): void => {
  const shutdown = async () => {
    console.log("Shutting down gracefully...");
    server.close(() => {
      console.log("HTTP server closed");
    });

    const redis = getRedisClient();
    if (redis) {
      await redis.quit();
      console.log("Redis connection closed");
    }

    await prisma.$disconnect();
    console.log("Database connection closed");

    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

export default setupGracefulShutdown;
