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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// users.ts
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const bcrypt_1 = __importDefault(require("bcrypt"));
const redisUtils_1 = require("../utils/redisUtils");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const redis = (0, redisUtils_1.getRedisClient)();
// Helper function to get or set cache
function getOrSetCache(key, cb) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!redis) {
            return yield cb();
        }
        try {
            const cached = yield redis.get(key);
            if (cached) {
                return JSON.parse(cached);
            }
            const fresh = yield cb();
            yield redis.set(key, JSON.stringify(fresh), 'EX', 3600); // Cache for 1 hour
            return fresh;
        }
        catch (error) {
            console.warn("Redis error, falling back to database:", error);
            return yield cb();
        }
    });
}
// Backend route for fetching user count
router.get('/count', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const count = yield getOrSetCache("user:count", () => __awaiter(void 0, void 0, void 0, function* () {
            return yield prisma.user.count();
        }));
        res.json({ count });
    }
    catch (error) {
        console.error('Error retrieving user count:', error);
        res.status(500).json({ error: 'Error retrieving user count' });
    }
}));
// Create a new user (Admin only)
router.post("/", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, name, role } = req.body;
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        const user = yield prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: role === "ADMIN" ? "ADMIN" : "USER",
            },
        });
        if (redis) {
            yield redis.del("user:count", "users:all");
        }
        res.json({ message: "User created successfully", userId: user.id });
    }
    catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ error: "Error creating user" });
    }
}));
// Get all users (Admin only) with pagination
router.get("/", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const [users, totalCount] = yield Promise.all([
            prisma.user.findMany({
                skip,
                take: limit,
                select: { id: true, email: true, name: true, role: true },
            }),
            prisma.user.count(),
        ]);
        res.json({
            users,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
        });
    }
    catch (error) {
        console.error("Error retrieving users:", error);
        res.status(500).json({ error: "Error retrieving users" });
    }
}));
// Get a single user by ID (Admin only)
router.get("/:id", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = parseInt(req.params.id);
    try {
        const user = yield getOrSetCache(`user:${userId}`, () => __awaiter(void 0, void 0, void 0, function* () {
            return yield prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, name: true, role: true },
            });
        }));
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
    }
    catch (error) {
        console.error("Error retrieving user:", error);
        res.status(500).json({ error: "Error retrieving user" });
    }
}));
// Update user by ID (Admin only)
router.put("/:id", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = parseInt(req.params.id);
    const { email, name, role } = req.body;
    try {
        const user = yield prisma.user.update({
            where: { id: userId },
            data: { email, name, role },
            select: { id: true, email: true, name: true, role: true },
        });
        if (redis) {
            yield redis.del(`user:${userId}`, "users:all");
        }
        res.json({ message: "User updated successfully", user });
    }
    catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Error updating user" });
    }
}));
// Delete user by ID (Admin only)
router.delete("/:id", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = parseInt(req.params.id);
    try {
        yield prisma.user.delete({ where: { id: userId } });
        if (redis) {
            yield redis.del(`user:${userId}`, "users:all", "user:count");
        }
        res.json({ message: "User deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: "Error deleting user" });
    }
}));
exports.default = router;
