"use strict";
// utils/redisUtils.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = exports.initRedis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let redis = null;
const initRedis = () => {
    return new Promise((resolve) => {
        try {
            console.log("Attempting to connect to Redis...");
            redis = new ioredis_1.default(process.env.REDIS_URL || "redis://localhost:6379");
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
        }
        catch (error) {
            console.warn("Failed to initialize Redis, falling back to database:", error);
            resolve(null);
        }
    });
};
exports.initRedis = initRedis;
const getRedisClient = () => {
    return redis;
};
exports.getRedisClient = getRedisClient;
