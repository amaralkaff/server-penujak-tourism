import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();
const prisma = new PrismaClient();

router.post("/register", async (req: Request, res: Response) => {
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

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1h",
      }
    );

    // Return token and user data in response
    res.json({
      token,
      userId: user.id,
    });
  } catch (error) {
    res.status(500).json({ error: "Error registering user" });
  }
});


router.post("/login", async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1h",
      }
    );
    
    // Include user data in the response
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        isAdmin: user.role === "ADMIN",
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Error logging in" });
  }
});

export default router;
