"use strict";
// utils/rateLimitUtils.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rate_limit_redis_1 = __importDefault(require("rate-limit-redis"));
const redisUtils_1 = require("./redisUtils");
const createRateLimiter = () => {
    const redis = (0, redisUtils_1.getRedisClient)();
    const limiterOptions = {
        windowMs: 15 * 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        message: "Too many requests from this IP, please try again later.",
    };
    if (redis) {
        const redisStore = new rate_limit_redis_1.default({
            sendCommand: ((...args) => __awaiter(void 0, void 0, void 0, function* () {
                const redisClient = redis;
                return redisClient.call(args[0], ...args.slice(1));
            }))
        });
        limiterOptions.store = redisStore;
    }
    return (0, express_rate_limit_1.default)(limiterOptions);
};
exports.createRateLimiter = createRateLimiter;
