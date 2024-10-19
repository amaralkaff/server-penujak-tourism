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
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
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
        if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
            return cb(new Error('Only images are allowed'));
        }
        cb(null, true);
    },
});
// Upload image route
router.post("/upload", upload.single("image"), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: "Please upload an image." });
        return;
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
});
// Count all blog posts
router.get("/count", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const blogCount = yield prisma.blog.count();
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
        const blogs = yield prisma.blog.findMany({
            include: { author: { select: { name: true } } },
            orderBy: { id: 'asc' },
        });
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
        const blog = yield prisma.blog.findUnique({
            where: { id: blogId },
            include: { author: { select: { name: true } } },
        });
        if (!blog) {
            res.status(404).json({ error: "Blog post not found" });
        }
        else {
            res.json(blog);
        }
    }
    catch (error) {
        console.error("Error retrieving blog post:", error);
        res.status(500).json({ error: "Error retrieving blog post" });
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
            data: { title, content, image, category, authorId: authorId },
        });
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
        res.json({ message: "Blog post deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting blog post:", error);
        res.status(500).json({ error: "Error deleting blog post" });
    }
}));
exports.default = router;
