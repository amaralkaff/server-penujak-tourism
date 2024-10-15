// routes/categories.ts
import express from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();
// count categories
router.get("/count", async (req, res) => {
  try {
    const count = await prisma.category.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: "Error counting categories" });
  }
});

// Get all categories
router.get("/", async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving categories" });
  }
});

// Get a single category
router.get("/:id", async (req: any, res: any) => {
  const categoryId = parseInt(req.params.id);
  try {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { products: true },
    });
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving category" });
  }
});

// Create a new category (Admin only)
router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  const { name } = req.body;
  try {
    const category = await prisma.category.create({
      data: { name },
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: "Error creating category" });
  }
});

// Update a category (Admin only)
router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const categoryId = parseInt(req.params.id);
  const { name } = req.body;
  try {
    const category = await prisma.category.update({
      where: { id: categoryId },
      data: { name },
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: "Error updating category" });
  }
});

// Delete a category (Admin only)
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const categoryId = parseInt(req.params.id);
  try {
    await prisma.category.delete({ where: { id: categoryId } });
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting category" });
  }
});

export default router;