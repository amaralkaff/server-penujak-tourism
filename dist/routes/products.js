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
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const MAX_PRODUCTS = 50; // You can adjust this number as needed
// count product
router.get("/count", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const count = yield prisma.product.count();
    res.json({ count });
}));
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path_1.default.join(__dirname, '../../uploads/'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
    fileFilter: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') {
            return cb(new Error('Only images are allowed'));
        }
        cb(null, true);
    },
});
// Upload image route
router.post("/upload", auth_1.authMiddleware, auth_1.adminMiddleware, upload.single("image"), (req, res) => {
    if (!req.file) {
        return res.status(400).send({ error: "Please upload an image." });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.send({ imageUrl });
});
// Get all products
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield prisma.product.findMany({
            include: { category: true, seller: { select: { name: true } } },
            orderBy: { id: 'asc' },
        });
        res.json(products);
    }
    catch (error) {
        res.status(500).json({ error: "Error retrieving products" });
    }
}));
// Get a single product
router.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const productId = parseInt(req.params.id);
    try {
        const product = yield prisma.product.findUnique({
            where: { id: productId },
            include: { category: true, seller: { select: { name: true } } },
        });
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.json(product);
    }
    catch (error) {
        res.status(500).json({ error: "Error retrieving product" });
    }
}));
// Create a new product (Admin only)
router.post("/", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, description, price, image, categoryId } = req.body;
    const sellerId = req.userId;
    try {
        const productCount = yield prisma.product.count();
        if (productCount >= MAX_PRODUCTS) {
            return res.status(400).json({ error: "Maximum number of products reached" });
        }
        const product = yield prisma.product.create({
            data: {
                title,
                description,
                price: parseFloat(price),
                image,
                categoryId: parseInt(categoryId),
                sellerId,
            },
        });
        res.status(201).json(product);
    }
    catch (error) {
        res.status(500).json({ error: "Error creating product" });
    }
}));
// Update a product (Admin only)
router.put("/:id", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const productId = parseInt(req.params.id);
    const { title, description, price, image, categoryId } = req.body;
    try {
        const product = yield prisma.product.update({
            where: { id: productId },
            data: {
                title,
                description,
                price: parseFloat(price),
                image,
                categoryId: parseInt(categoryId),
            },
        });
        res.json(product);
    }
    catch (error) {
        res.status(500).json({ error: "Error updating product" });
    }
}));
// Delete a product (Admin only)
router.delete("/:id", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const productId = parseInt(req.params.id);
    try {
        yield prisma.product.delete({ where: { id: productId } });
        res.json({ message: "Product deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: "Error deleting product" });
    }
}));
exports.default = router;
