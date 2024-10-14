import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, adminMiddleware } from "../middleware/auth";
import bcrypt from "bcrypt";

const router = express.Router();
const prisma = new PrismaClient();

// Backend route for fetching user count
router.get('/count', async (req, res) => {
  try {
    const count = await prisma.user.count();  // Prisma query to count users
    res.json({ count });
  } catch (error) {
    console.error('Error retrieving user count:', error);
    res.status(500).json({ error: 'Error retrieving user' });
  }
});

// Create a new user (Admin only)
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response) => {
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
      res.json({ message: "User created successfully", userId: user.id });
    } catch (error) {
      res.status(500).json({ error: "Error creating user" });
    }
  }
);

// Get all users (Admin only)
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response) => {
    try {
      const users = await prisma.user.findMany();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Error retrieving users" });
    }
  }
);

// Get a single user by ID (Admin only)
router.get(
  "/:id",
  authMiddleware,
  adminMiddleware,
  async (req: any, res: any) => {
    const userId = parseInt(req.params.id);
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Error retrieving user" });
    }
  }
);

// Update user by ID (Admin only)
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    const { email, name, role } = req.body;
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { email, name, role },
      });
      res.json({ message: "User updated successfully", user });
    } catch (error) {
      res.status(500).json({ error: "Error updating user" });
    }
  }
);

// Delete user by ID (Admin only)
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    try {
      await prisma.user.delete({ where: { id: userId } });
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Error deleting user" });
    }
  }
);



export default router;
