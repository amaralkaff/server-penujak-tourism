import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, adminMiddleware } from "../middleware/auth";
import sharp from "sharp";
import { redis } from "../server";

const router = express.Router();
const prisma = new PrismaClient();

// Define a common uploads directory
const uploadsDir = path.resolve(__dirname, '../../uploads');

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

// Count all products
router.get("/count", async (req: express.Request, res: express.Response) => {
  try {
    const productCount = await getOrSetCache("product:count", async () => {
      return await prisma.product.count();
    });
    res.json({ count: productCount });
  } catch (error) {
    console.error("Error counting products:", error);
    res.status(500).json({ error: "Error counting products" });
  }
});

// Get all products
router.get("/", async (req: express.Request, res: express.Response) => {
  try {
    const products = await getOrSetCache("products:all", async () => {
      return await prisma.product.findMany({
        include: { category: true, seller: { select: { name: true } } },
        orderBy: { id: 'asc' },
      });
    });
    res.json(products);
  } catch (error) {
    console.error("Error retrieving products:", error);
    res.status(500).json({ error: "Error retrieving products" });
  }
});

// Get a single product
router.get("/:id", async (req: express.Request, res: express.Response) => {
  const productId = parseInt(req.params.id);
  try {
    const product = await getOrSetCache(`product:${productId}`, async () => {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { category: true, seller: { select: { name: true } } },
      });
      if (!product) {
        throw new Error("Product not found");
      }
      return product;
    });
    res.json(product);
  } catch (error) {
    console.error("Error retrieving product:", error);
    if ((error as Error).message === "Product not found") {
      res.status(404).json({ error: "Product not found" });
    } else {
      res.status(500).json({ error: "Error retrieving product" });
    }
  }
});

// Create a new product (Admin only)
router.post("/", authMiddleware, adminMiddleware, async (req: express.Request, res: express.Response) => {
  const { title, description, price, image, categoryId } = req.body;
  const sellerId = (req as any).userId;

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
    
    // Invalidate relevant caches
    if (redis) {
      await redis.del("products:all", "product:count");
    }
    
    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Error creating product" });
  }
});

// Update a product (Admin only)
router.put("/:id", authMiddleware, adminMiddleware, async (req: express.Request, res: express.Response) => {
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
    
    // Invalidate relevant caches
    if (redis) {
      await redis.del(`product:${productId}`, "products:all");
    }
    
    res.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Error updating product" });
  }
});

// Delete a product (Admin only)
router.delete("/:id", authMiddleware, adminMiddleware, async (req: express.Request, res: express.Response) => {
  const productId = parseInt(req.params.id);

  try {
    await prisma.product.delete({ where: { id: productId } });
    
    // Invalidate relevant caches
    if (redis) {
      await redis.del(`product:${productId}`, "products:all", "product:count");
    }
    
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Error deleting product" });
  }
});

export default router;