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
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
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
// Count categories
router.get("/count", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const count = yield getOrSetCache("category:count", () => __awaiter(void 0, void 0, void 0, function* () {
            return yield prisma.category.count();
        }));
        res.json({ count });
    }
    catch (error) {
        console.error("Error counting categories:", error);
        res.status(500).json({ error: "Error counting categories" });
    }
}));
// Get all categories
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = yield getOrSetCache("categories:all", () => __awaiter(void 0, void 0, void 0, function* () {
            return yield prisma.category.findMany();
        }));
        res.json(categories);
    }
    catch (error) {
        console.error("Error retrieving categories:", error);
        res.status(500).json({ error: "Error retrieving categories" });
    }
}));
// Get a single category
router.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const categoryId = parseInt(req.params.id);
    try {
        const category = yield getOrSetCache(`category:${categoryId}`, () => __awaiter(void 0, void 0, void 0, function* () {
            const category = yield prisma.category.findUnique({
                where: { id: categoryId },
                include: { products: true },
            });
            if (!category) {
                throw new Error("Category not found");
            }
            return category;
        }));
        res.json(category);
    }
    catch (error) {
        console.error("Error retrieving category:", error);
        if (error.message === "Category not found") {
            res.status(404).json({ error: "Category not found" });
        }
        else {
            res.status(500).json({ error: "Error retrieving category" });
        }
    }
}));
// Create a new category (Admin only)
router.post("/", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name } = req.body;
    try {
        const category = yield prisma.category.create({
            data: { name },
        });
        // Invalidate relevant caches
        if (redis) {
            yield redis.del("categories:all", "category:count");
        }
        res.status(201).json(category);
    }
    catch (error) {
        console.error("Error creating category:", error);
        res.status(500).json({ error: "Error creating category" });
    }
}));
// Update a category (Admin only)
router.put("/:id", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const categoryId = parseInt(req.params.id);
    const { name } = req.body;
    try {
        const category = yield prisma.category.update({
            where: { id: categoryId },
            data: { name },
        });
        // Invalidate relevant caches
        if (redis) {
            yield redis.del(`category:${categoryId}`, "categories:all");
        }
        res.json(category);
    }
    catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ error: "Error updating category" });
    }
}));
// Delete a category (Admin only)
router.delete("/:id", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const categoryId = parseInt(req.params.id);
    try {
        yield prisma.category.delete({ where: { id: categoryId } });
        // Invalidate relevant caches
        if (redis) {
            yield redis.del(`category:${categoryId}`, "categories:all", "category:count");
        }
        res.json({ message: "Category deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ error: "Error deleting category" });
    }
}));
exports.default = router;
