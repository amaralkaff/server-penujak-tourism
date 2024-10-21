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
const fs_1 = __importDefault(require("fs"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const sharp_1 = __importDefault(require("sharp"));
const redisUtils_1 = require("../utils/redisUtils");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Define a common uploads directory
const uploadsDir = path_1.default.resolve(__dirname, '../uploads');
// Ensure the uploads directory exists
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Configure multer for file uploads
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
    fileFilter: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
            return cb(new Error('Only images are allowed'));
        }
        cb(null, true);
    },
});
// Helper function to get or set cache
function getOrSetCache(key, cb) {
    return __awaiter(this, void 0, void 0, function* () {
        const redis = (0, redisUtils_1.getRedisClient)();
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
// Helper function to check if buffer is an image
function isImage(buffer) {
    const imageSignatures = [
        [0xFF, 0xD8, 0xFF], // JPEG
        [0x89, 0x50, 0x4E, 0x47], // PNG
        [0x47, 0x49, 0x46], // GIF
    ];
    return imageSignatures.some(signature => signature.every((byte, index) => buffer[index] === byte));
}
// Upload image route
router.post("/upload", upload.single("image"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.file) {
        return res.status(400).json({ error: "Please upload an image." });
    }
    console.log("Received file:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
    });
    // Check if the buffer contains an image
    if (!isImage(req.file.buffer)) {
        console.error("Received file is not an image");
        const previewBuffer = req.file.buffer.slice(0, 100);
        console.error("File preview:", previewBuffer.toString('hex'));
        return res.status(400).json({ error: "The uploaded file is not a valid image." });
    }
    const filename = Date.now() + path_1.default.extname(req.file.originalname);
    const filepath = path_1.default.join(uploadsDir, filename);
    try {
        // Check if the file is actually an image
        const metadata = yield (0, sharp_1.default)(req.file.buffer).metadata();
        console.log("Image metadata:", metadata);
        if (!metadata.format) {
            throw new Error("Invalid image format");
        }
        // Optimize and save the image
        yield (0, sharp_1.default)(req.file.buffer)
            .resize(800) // Resize to max width of 800px
            .jpeg({ quality: 80 }) // Convert to JPEG and compress
            .toFile(filepath);
        const imageUrl = `/uploads/${filename}`;
        res.json({ imageUrl });
    }
    catch (error) {
        console.error("Error processing image:", error);
        // Log the first few bytes of the file for debugging
        const previewBuffer = req.file.buffer.slice(0, 100);
        console.error("File preview:", previewBuffer.toString('hex'));
        fs_1.default.writeFileSync(path_1.default.join(uploadsDir, 'error_file_' + Date.now()), req.file.buffer);
        res.status(500).json({ error: "Error processing image", details: error.message });
    }
}));
// Count all products
router.get("/count", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const productCount = yield getOrSetCache("product:count", () => __awaiter(void 0, void 0, void 0, function* () {
            return yield prisma.product.count();
        }));
        res.json({ count: productCount });
    }
    catch (error) {
        console.error("Error counting products:", error);
        res.status(500).json({ error: "Error counting products" });
    }
}));
// Get all products
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield getOrSetCache("products:all", () => __awaiter(void 0, void 0, void 0, function* () {
            return yield prisma.product.findMany({
                include: { category: true, seller: { select: { name: true } } },
                orderBy: { id: 'asc' },
            });
        }));
        res.json(products);
    }
    catch (error) {
        console.error("Error retrieving products:", error);
        res.status(500).json({ error: "Error retrieving products" });
    }
}));
// Get a single product
router.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const productId = parseInt(req.params.id);
    try {
        const product = yield getOrSetCache(`product:${productId}`, () => __awaiter(void 0, void 0, void 0, function* () {
            const product = yield prisma.product.findUnique({
                where: { id: productId },
                include: { category: true, seller: { select: { name: true } } },
            });
            if (!product) {
                throw new Error("Product not found");
            }
            return product;
        }));
        res.json(product);
    }
    catch (error) {
        console.error("Error retrieving product:", error);
        if (error.message === "Product not found") {
            res.status(404).json({ error: "Product not found" });
        }
        else {
            res.status(500).json({ error: "Error retrieving product" });
        }
    }
}));
// Create a new product (Admin only)
router.post("/", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, description, price, image, categoryId } = req.body;
    const sellerId = req.userId;
    try {
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
        // Invalidate relevant caches
        const redis = (0, redisUtils_1.getRedisClient)();
        if (redis) {
            yield redis.del("products:all", "product:count");
        }
        res.status(201).json(product);
    }
    catch (error) {
        console.error("Error creating product:", error);
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
        // Invalidate relevant caches
        const redis = (0, redisUtils_1.getRedisClient)();
        if (redis) {
            yield redis.del(`product:${productId}`, "products:all");
        }
        res.json(product);
    }
    catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ error: "Error updating product" });
    }
}));
// Delete a product (Admin only)
router.delete("/:id", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const productId = parseInt(req.params.id);
    try {
        yield prisma.product.delete({ where: { id: productId } });
        // Invalidate relevant caches
        const redis = (0, redisUtils_1.getRedisClient)();
        if (redis) {
            yield redis.del(`product:${productId}`, "products:all", "product:count");
        }
        res.json({ message: "Product deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ error: "Error deleting product" });
    }
}));
// Search products
router.get("/search/:query", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = req.params.query;
    try {
        const products = yield prisma.product.findMany({
            where: {
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                ],
            },
            include: { category: true, seller: { select: { name: true } } },
            orderBy: { id: 'asc' },
        });
        res.json(products);
    }
    catch (error) {
        console.error("Error searching products:", error);
        res.status(500).json({ error: "Error searching products" });
    }
}));
exports.default = router;
