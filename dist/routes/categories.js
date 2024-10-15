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
// routes/categories.ts
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// count categories
router.get("/count", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const count = yield prisma.category.count();
        res.json({ count });
    }
    catch (error) {
        res.status(500).json({ error: "Error counting categories" });
    }
}));
// Get all categories
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = yield prisma.category.findMany();
        res.json(categories);
    }
    catch (error) {
        res.status(500).json({ error: "Error retrieving categories" });
    }
}));
// Get a single category
router.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const categoryId = parseInt(req.params.id);
    try {
        const category = yield prisma.category.findUnique({
            where: { id: categoryId },
            include: { products: true },
        });
        if (!category) {
            return res.status(404).json({ error: "Category not found" });
        }
        res.json(category);
    }
    catch (error) {
        res.status(500).json({ error: "Error retrieving category" });
    }
}));
// Create a new category (Admin only)
router.post("/", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name } = req.body;
    try {
        const category = yield prisma.category.create({
            data: { name },
        });
        res.status(201).json(category);
    }
    catch (error) {
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
        res.json(category);
    }
    catch (error) {
        res.status(500).json({ error: "Error updating category" });
    }
}));
// Delete a category (Admin only)
router.delete("/:id", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const categoryId = parseInt(req.params.id);
    try {
        yield prisma.category.delete({ where: { id: categoryId } });
        res.json({ message: "Category deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: "Error deleting category" });
    }
}));
exports.default = router;
