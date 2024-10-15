// blog.js or blog.ts

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

const MAX_BLOGS = 50;

// Define a common uploads directory
const uploadsDir = path.resolve(__dirname, '../../uploads');

// Ensure the uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

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

// Upload image route
router.post("/upload", upload.single("image"), (req: any, res: any) => {
  if (!req.file) {
    return res.status(400).send({ error: "Please upload an image." });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.send({ imageUrl });
});

// Count all blog posts
router.get("/count", async (req: any, res: any) => {
  try {
    const blogCount = await prisma.blog.count();
    res.json({ count: blogCount });
  } catch (error) {
    res.status(500).json({ error: "Error counting blog posts" });
  }
});

// Get all blog posts
router.get("/", async (req, res) => {
  try {
    const blogs = await prisma.blog.findMany({
      include: { author: { select: { name: true } } },
      orderBy: { id: 'asc' },
    });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving blog posts" });
  }
});

// Get a single blog post
router.get("/:id", async (req: any, res: any) => {
  const blogId = parseInt(req.params.id);
  try {
    const blog = await prisma.blog.findUnique({
      where: { id: blogId },
      include: { author: { select: { name: true } } },
    });
    if (!blog) {
      return res.status(404).json({ error: "Blog post not found" });
    }
    res.json(blog);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving blog post" });
  }
});

// Create a new blog post (Admin only)
router.post("/", authMiddleware, adminMiddleware, async (req: any, res: any) => {
  const { title, content, image, category } = req.body;
  const authorId = req.userId;

  try {
    const blogCount = await prisma.blog.count();
    if (blogCount >= MAX_BLOGS) {
      return res.status(400).json({ error: "Maximum number of blog posts reached" });
    }

    const blog = await prisma.blog.create({
      data: { title, content, image, category, authorId },
    });
    res.status(201).json(blog);
  } catch (error) {
    res.status(500).json({ error: "Error creating blog post" });
  }
});

// Update a blog post (Admin only)
router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const blogId = parseInt(req.params.id);
  const { title, content, image, category } = req.body;

  try {
    const blog = await prisma.blog.update({
      where: { id: blogId },
      data: { title, content, image, category },
    });
    res.json(blog);
  } catch (error) {
    res.status(500).json({ error: "Error updating blog post" });
  }
});

// Delete a blog post (Admin only)
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const blogId = parseInt(req.params.id);

  try {
    await prisma.blog.delete({ where: { id: blogId } });
    res.json({ message: "Blog post deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting blog post" });
  }
});

export default router;
