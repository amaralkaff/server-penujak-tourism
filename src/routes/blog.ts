import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, adminMiddleware } from "../middleware/auth";
import sharp from "sharp";
import { getRedisClient } from "../utils/redisUtils";

const router = express.Router();
const prisma = new PrismaClient();
const MAX_BLOGS = 50;

// Define a common uploads directory
const uploadsDir = path.resolve(__dirname, '../uploads');

// Ensure the uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      return cb(new Error('Only images are allowed'));
    }
    cb(null, true);
  },
});

// Helper function to get or set cache
async function getOrSetCache(key: string, cb: () => Promise<any>) {
  const redis = getRedisClient();
  if (!redis) {
    return await cb();
  }
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    const fresh = await cb();
    await redis.set(key, JSON.stringify(fresh), 'EX', 3600); // Cache for 1 hour
    return fresh;
  } catch (error) {
    console.warn("Redis error, falling back to database:", error);
    return await cb();
  }
}

// Upload image route
router.post("/upload", upload.single("image"), async (req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({ error: "Please upload an image." });
  }

  console.log("Received file:", {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  });

  const filename = Date.now() + path.extname(req.file.originalname);
  const filepath = path.join(uploadsDir, filename);

  try {
    // Check if the file is actually an image
    const metadata = await sharp(req.file.buffer).metadata();
    console.log("Image metadata:", metadata);

    if (!metadata.format) {
      throw new Error("Invalid image format");
    }

    // Optimize and save the image
    await sharp(req.file.buffer)
      .resize(800) // Resize to max width of 800px
      .jpeg({ quality: 80 }) // Convert to JPEG and compress
      .toFile(filepath);

    const imageUrl = `/uploads/${filename}`;
    res.json({ imageUrl });
  } catch (error) {
    console.error("Error processing image:", error);
    
    // Log the first few bytes of the file for debugging
    const previewBuffer = req.file.buffer.slice(0, 100);
    console.error("File preview:", previewBuffer.toString('hex'));
    
    fs.writeFileSync(path.join(uploadsDir, 'error_file_' + Date.now()), req.file.buffer);
    res.status(500).json({ error: "Error processing image", details: (error as Error).message });
  }
});

// Count all blog posts
router.get("/count", async (req: express.Request, res: express.Response) => {
  try {
    const blogCount = await getOrSetCache("blog:count", async () => {
      return await prisma.blog.count();
    });
    res.json({ count: blogCount });
  } catch (error) {
    console.error("Error counting blog posts:", error);
    res.status(500).json({ error: "Error counting blog posts" });
  }
});

// Get all blog posts
router.get("/", async (req: express.Request, res: express.Response) => {
  try {
    const blogs = await getOrSetCache("blogs:all", async () => {
      return await prisma.blog.findMany({
        include: { author: { select: { name: true } } },
        orderBy: { id: 'asc' },
      });
    });
    res.json(blogs);
  } catch (error) {
    console.error("Error retrieving blog posts:", error);
    res.status(500).json({ error: "Error retrieving blog posts" });
  }
});

// Get a single blog post
router.get("/:id", async (req: express.Request, res: express.Response) => {
  const blogId = parseInt(req.params.id);
  try {
    const blog = await getOrSetCache(`blog:${blogId}`, async () => {
      const blog = await prisma.blog.findUnique({
        where: { id: blogId },
        include: { author: { select: { name: true } } },
      });
      if (!blog) {
        throw new Error("Blog post not found");
      }
      return blog;
    });
    res.json(blog);
  } catch (error) {
    console.error("Error retrieving blog post:", error);
    if ((error as Error).message === "Blog post not found") {
      res.status(404).json({ error: "Blog post not found" });
    } else {
      res.status(500).json({ error: "Error retrieving blog post" });
    }
  }
});

// Create a new blog post (Admin only)
router.post("/", authMiddleware, adminMiddleware, async (req: express.Request, res: express.Response) => {
  const { title, content, image, category } = req.body;
  const authorId = (req as any).userId;
  try {
    const blogCount = await prisma.blog.count();
    if (blogCount >= MAX_BLOGS) {
      res.status(400).json({ error: "Maximum number of blog posts reached" });
      return;
    }
    const blog = await prisma.blog.create({
      data: { title, content, image, category, authorId },
    });
    
    // Invalidate relevant caches
    const redis = getRedisClient();
    if (redis) {
      await redis.del("blogs:all", "blog:count");
    }
    
    res.status(201).json(blog);
  } catch (error) {
    console.error("Error creating blog post:", error);
    res.status(500).json({ error: "Error creating blog post" });
  }
});

// Update a blog post (Admin only)
router.put("/:id", authMiddleware, adminMiddleware, async (req: express.Request, res: express.Response) => {
  const blogId = parseInt(req.params.id);
  const { title, content, image, category } = req.body;
  try {
    const blog = await prisma.blog.update({
      where: { id: blogId },
      data: { title, content, image, category },
    });
    
    // Invalidate relevant caches
    const redis = getRedisClient();
    if (redis) {
      await redis.del(`blog:${blogId}`, "blogs:all");
    }
    
    res.json(blog);
  } catch (error) {
    console.error("Error updating blog post:", error);
    res.status(500).json({ error: "Error updating blog post" });
  }
});

// Delete a blog post (Admin only)
router.delete("/:id", authMiddleware, adminMiddleware, async (req: express.Request, res: express.Response) => {
  const blogId = parseInt(req.params.id);
  try {
    await prisma.blog.delete({ where: { id: blogId } });
    
    // Invalidate relevant caches
    const redis = getRedisClient();
    if (redis) {
      await redis.del(`blog:${blogId}`, "blogs:all", "blog:count");
    }
    
    res.json({ message: "Blog post deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog post:", error);
    res.status(500).json({ error: "Error deleting blog post" });
  }
});

// Get blog posts by category
router.get("/category/:category", async (req: express.Request, res: express.Response) => {
  const category = req.params.category;
  try {
    const blogs = await getOrSetCache(`blogs:category:${category}`, async () => {
      return await prisma.blog.findMany({
        where: { category },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    });
    res.json(blogs);
  } catch (error) {
    console.error("Error retrieving blog posts by category:", error);
    res.status(500).json({ error: "Error retrieving blog posts" });
  }
});

// Search blog posts
router.get("/search/:query", async (req: express.Request, res: express.Response) => {
  const query = req.params.query;
  try {
    const blogs = await prisma.blog.findMany({
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
  } catch (error) {
    console.error("Error searching blog posts:", error);
    res.status(500).json({ error: "Error searching blog posts" });
  }
});

export default router;