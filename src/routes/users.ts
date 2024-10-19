// users.ts
import express from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, adminMiddleware } from "../middleware/auth";
import bcrypt from "bcrypt";
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

// Backend route for fetching user count
router.get('/count', async (req, res) => {
  try {
    const count = await getOrSetCache("user:count", async () => {
      return await prisma.user.count();
    });
    res.json({ count });
  } catch (error) {
    console.error('Error retrieving user count:', error);
    res.status(500).json({ error: 'Error retrieving user count' });
  }
});

// Create a new user (Admin only)
router.post("/", authMiddleware, adminMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { email, password, name, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role === "ADMIN" ? "ADMIN" : "USER",
      },
    });
    if (redis) {
      await redis.del("user:count", "users:all");
    }
    res.json({ message: "User created successfully", userId: user.id });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Error creating user" });
  }
});

// Get all users (Admin only) with pagination
router.get("/", authMiddleware, adminMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: { id: true, email: true, name: true, role: true },
      }),
      prisma.user.count(),
    ]);

    res.json({
      users,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    });
  } catch (error) {
    console.error("Error retrieving users:", error);
    res.status(500).json({ error: "Error retrieving users" });
  }
});

// Get a single user by ID (Admin only)
router.get("/:id", authMiddleware, adminMiddleware, async (req: any, res: any) => {
  const userId = parseInt(req.params.id);
  try {
    const user = await getOrSetCache(`user:${userId}`, async () => {
      return await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true },
      });
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error retrieving user:", error);
    res.status(500).json({ error: "Error retrieving user" });
  }
});

// Update user by ID (Admin only)
router.put("/:id", authMiddleware, adminMiddleware, async (req: express.Request, res: express.Response) => {
  const userId = parseInt(req.params.id);
  const { email, name, role } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { email, name, role },
      select: { id: true, email: true, name: true, role: true },
    });
    if (redis) {
      await redis.del(`user:${userId}`, "users:all");
    }
    res.json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Error updating user" });
  }
});

// Delete user by ID (Admin only)
router.delete("/:id", authMiddleware, adminMiddleware, async (req: express.Request, res: express.Response) => {
  const userId = parseInt(req.params.id);
  try {
    await prisma.user.delete({ where: { id: userId } });
    if (redis) {
      await redis.del(`user:${userId}`, "users:all", "user:count");
    }
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Error deleting user" });
  }
});

export default router;