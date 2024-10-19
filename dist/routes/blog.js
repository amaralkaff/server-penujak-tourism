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
const MAX_BLOGS = 50;
// Define a common uploads directory
const uploadsDir = path_1.default.resolve(__dirname, '../../uploads');
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
// Count all blog posts
router.get("/count", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const blogCount = yield getOrSetCache("blog:count", () => __awaiter(void 0, void 0, void 0, function* () {
            return yield prisma.blog.count();
        }));
        res.json({ count: blogCount });
    }
    catch (error) {
        console.error("Error counting blog posts:", error);
        res.status(500).json({ error: "Error counting blog posts" });
    }
}));
// Get all blog posts
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const blogs = yield getOrSetCache("blogs:all", () => __awaiter(void 0, void 0, void 0, function* () {
            return yield prisma.blog.findMany({
                include: { author: { select: { name: true } } },
                orderBy: { id: 'asc' },
            });
        }));
        res.json(blogs);
    }
    catch (error) {
        console.error("Error retrieving blog posts:", error);
        res.status(500).json({ error: "Error retrieving blog posts" });
    }
}));
// Get a single blog post
router.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const blogId = parseInt(req.params.id);
    try {
        const blog = yield getOrSetCache(`blog:${blogId}`, () => __awaiter(void 0, void 0, void 0, function* () {
            const blog = yield prisma.blog.findUnique({
                where: { id: blogId },
                include: { author: { select: { name: true } } },
            });
            if (!blog) {
                throw new Error("Blog post not found");
            }
            return blog;
        }));
        res.json(blog);
    }
    catch (error) {
        console.error("Error retrieving blog post:", error);
        if (error.message === "Blog post not found") {
            res.status(404).json({ error: "Blog post not found" });
        }
        else {
            res.status(500).json({ error: "Error retrieving blog post" });
        }
    }
}));
// Create a new blog post (Admin only)
router.post("/", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, content, image, category } = req.body;
    const authorId = req.userId;
    try {
        const blogCount = yield prisma.blog.count();
        if (blogCount >= MAX_BLOGS) {
            res.status(400).json({ error: "Maximum number of blog posts reached" });
            return;
        }
        const blog = yield prisma.blog.create({
            data: { title, content, image, category, authorId },
        });
        // Invalidate relevant caches
        const redis = (0, redisUtils_1.getRedisClient)();
        if (redis) {
            yield redis.del("blogs:all", "blog:count");
        }
        res.status(201).json(blog);
    }
    catch (error) {
        console.error("Error creating blog post:", error);
        res.status(500).json({ error: "Error creating blog post" });
    }
}));
// Update a blog post (Admin only)
router.put("/:id", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const blogId = parseInt(req.params.id);
    const { title, content, image, category } = req.body;
    try {
        const blog = yield prisma.blog.update({
            where: { id: blogId },
            data: { title, content, image, category },
        });
        // Invalidate relevant caches
        const redis = (0, redisUtils_1.getRedisClient)();
        if (redis) {
            yield redis.del(`blog:${blogId}`, "blogs:all");
        }
        res.json(blog);
    }
    catch (error) {
        console.error("Error updating blog post:", error);
        res.status(500).json({ error: "Error updating blog post" });
    }
}));
// Delete a blog post (Admin only)
router.delete("/:id", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const blogId = parseInt(req.params.id);
    try {
        yield prisma.blog.delete({ where: { id: blogId } });
        // Invalidate relevant caches
        const redis = (0, redisUtils_1.getRedisClient)();
        if (redis) {
            yield redis.del(`blog:${blogId}`, "blogs:all", "blog:count");
        }
        res.json({ message: "Blog post deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting blog post:", error);
        res.status(500).json({ error: "Error deleting blog post" });
    }
}));
// Get blog posts by category
router.get("/category/:category", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const category = req.params.category;
    try {
        const blogs = yield getOrSetCache(`blogs:category:${category}`, () => __awaiter(void 0, void 0, void 0, function* () {
            return yield prisma.blog.findMany({
                where: { category },
                include: { author: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
            });
        }));
        res.json(blogs);
    }
    catch (error) {
        console.error("Error retrieving blog posts by category:", error);
        res.status(500).json({ error: "Error retrieving blog posts" });
    }
}));
// Search blog posts
router.get("/search/:query", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = req.params.query;
    try {
        const blogs = yield prisma.blog.findMany({
            where: {
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { content: { contains: query, mode: 'insensitive' } },
                ],
            },
            include: { author: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json(blogs);
    }
    catch (error) {
        console.error("Error searching blog posts:", error);
        res.status(500).json({ error: "Error searching blog posts" });
    }
}));
exports.default = router;
