import express from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, adminMiddleware } from "../middleware/auth";
import { getRedisClient } from "../utils/redisUtils";

const router = express.Router();
const prisma = new PrismaClient();
const redis = getRedisClient();
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

// Count categories
router.get("/count", async (req: express.Request, res: express.Response) => {
  try {
    const count = await getOrSetCache("category:count", async () => {
      return await prisma.category.count();
    });
    res.json({ count });
  } catch (error) {
    console.error("Error counting categories:", error);
    res.status(500).json({ error: "Error counting categories" });
  }
});

// Get all categories
router.get("/", async (req: express.Request, res: express.Response) => {
  try {
    const categories = await getOrSetCache("categories:all", async () => {
      return await prisma.category.findMany();
    });
    res.json(categories);
  } catch (error) {
    console.error("Error retrieving categories:", error);
    res.status(500).json({ error: "Error retrieving categories" });
  }
});

// Get a single category
router.get("/:id", async (req: express.Request, res: express.Response) => {
  const categoryId = parseInt(req.params.id);
  try {
    const category = await getOrSetCache(`category:${categoryId}`, async () => {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: { products: true },
      });
      if (!category) {
        throw new Error("Category not found");
      }
      return category;
    });
    res.json(category);
  } catch (error) {
    console.error("Error retrieving category:", error);
    if ((error as Error).message === "Category not found") {
      res.status(404).json({ error: "Category not found" });
    } else {
      res.status(500).json({ error: "Error retrieving category" });
    }
  }
});

// Create a new category (Admin only)
router.post("/", authMiddleware, adminMiddleware, async (req: express.Request, res: express.Response) => {
  const { name } = req.body;
  try {
    const category = await prisma.category.create({
      data: { name },
    });
    
    // Invalidate relevant caches
    if (redis) {
      await redis.del("categories:all", "category:count");
    }
    
    res.status(201).json(category);
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Error creating category" });
  }
});

// Update a category (Admin only)
router.put("/:id", authMiddleware, adminMiddleware, async (req: express.Request, res: express.Response) => {
  const categoryId = parseInt(req.params.id);
  const { name } = req.body;
  try {
    const category = await prisma.category.update({
      where: { id: categoryId },
      data: { name },
    });
    
    // Invalidate relevant caches
    if (redis) {
      await redis.del(`category:${categoryId}`, "categories:all");
    }
    
    res.json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Error updating category" });
  }
});

// Delete a category (Admin only)
router.delete("/:id", authMiddleware, adminMiddleware, async (req: express.Request, res: express.Response) => {
  const categoryId = parseInt(req.params.id);
  try {
    await prisma.category.delete({ where: { id: categoryId } });
    
    // Invalidate relevant caches
    if (redis) {
      await redis.del(`category:${categoryId}`, "categories:all", "category:count");
    }
    
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Error deleting category" });
  }
});

export default router;