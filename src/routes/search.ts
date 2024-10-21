import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

router.get("/", async (req: any, res: any) => {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }
    try {
      const products = await prisma.product.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          category: true,
          seller: { select: { name: true } }
        },
        orderBy: { id: 'asc' },
      });
      const blogs = await prisma.blog.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          author: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ products, blogs });
    } catch (error) {
      console.error("Error performing combined search:", error);
      res.status(500).json({ error: "Error performing search" });
    }
  });

export default router;