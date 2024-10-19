// utils/rateLimitUtils.ts

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedisClient } from './redisUtils';
import { Redis } from 'ioredis';

export const createRateLimiter = () => {
  const redis = getRedisClient();

  const limiterOptions: any = {
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests from this IP, please try again later.",
  };

  if (redis) {
    const redisStore = new RedisStore({
      sendCommand: (async (...args: string[]) => {
        const redisClient = redis as Redis;
        return redisClient.call(args[0], ...args.slice(1));
      }) as any
    });
    limiterOptions.store = redisStore as any;
  }

  return rateLimit(limiterOptions);
};
