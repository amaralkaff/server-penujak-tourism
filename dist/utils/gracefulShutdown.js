"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const redisUtils_1 = require("./redisUtils");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const setupGracefulShutdown = (server) => {
    const shutdown = () => __awaiter(void 0, void 0, void 0, function* () {
        console.log("Shutting down gracefully...");
        server.close(() => {
            console.log("HTTP server closed");
        });
        const redis = (0, redisUtils_1.getRedisClient)();
        if (redis) {
            yield redis.quit();
            console.log("Redis connection closed");
        }
        yield prisma.$disconnect();
        console.log("Database connection closed");
        process.exit(0);
    });
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
};
exports.default = setupGracefulShutdown;
