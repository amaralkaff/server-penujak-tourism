// products.ts

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

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
  // Return the image path relative to the server
  const imageUrl = `/uploads/${req.file.filename}`;
  res.send({ imageUrl });
});

// Count all products
router.get("/count", async (req: any, res: any) => {
  try {
    const productCount = await prisma.product.count();
    res.json({ count: productCount });
  } catch (error) {
    res.status(500).json({ error: "Error counting products" });
  }
});

// Get all products
router.get("/", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true, seller: { select: { name: true } } },
      orderBy: { id: 'asc' },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving products" });
  }
});

// Get a single product
router.get("/:id", async (req: any, res: any) => {
  const productId = parseInt(req.params.id);
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true, seller: { select: { name: true } } },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving product" });
  }
});

// Create a new product (Admin only)
router.post("/", authMiddleware, adminMiddleware, async (req: any, res: any) => {
  const { title, description, price, image, categoryId } = req.body;
  const sellerId = req.userId;

  try {
    const product = await prisma.product.create({
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
  } catch (error) {
    res.status(500).json({ error: "Error creating product" });
  }
});

// Update a product (Admin only)
router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const productId = parseInt(req.params.id);
  const { title, description, price, image, categoryId } = req.body;

  try {
    const product = await prisma.product.update({
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
  } catch (error) {
    res.status(500).json({ error: "Error updating product" });
  }
});

// Delete a product (Admin only)
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const productId = parseInt(req.params.id);

  try {
    await prisma.product.delete({ where: { id: productId } });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting product" });
  }
});

export default router;
