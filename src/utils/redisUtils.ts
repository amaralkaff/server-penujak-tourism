// utils/redisUtils.ts

import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let redis: Redis | null = null;

export const initRedis = (): Promise<Redis | null> => {
  return new Promise((resolve) => {
    try {
      console.log("Attempting to connect to Redis...");
      redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

      redis.on("connect", () => {
        console.log("Successfully connected to Redis");
        resolve(redis);
      });

      redis.on("error", (error) => {
        console.warn("Redis error, falling back to database:", error);
        resolve(null);
      });

      // Test the connection
      redis.ping().then(() => {
        console.log("Redis PING successful");
      }).catch((error) => {
        console.error("Redis PING failed:", error);
        resolve(null);
      });
    } catch (error) {
      console.warn("Failed to initialize Redis, falling back to database:", error);
      resolve(null);
    }
  });
};

export const getRedisClient = (): Redis | null => {
  return redis;
};