// app.ts (updated)
import express from "express";
import dotenv from "dotenv";
import path from "path";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import blogRoutes from "./routes/blog";
import productRoutes from "./routes/products";
import categoryRoutes from "./routes/categories";
import { authMiddleware, adminMiddleware, AuthRequest } from "./middleware/auth";

dotenv.config();

const app = express();

// Allowed origins
const allowedOrigins = [
  'https://penujak-tourism.vercel.app',
  'http://localhost:5173'
];

// Custom CORS Middleware
app.use((req: any, res: any, next: any) => {
  const origin = req.headers.origin as string;

  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204); // No Content
  }

  next();
});

app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
console.log("Serving static files from:", path.join(__dirname, "../uploads"));

// Define routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/blogs", blogRoutes);
app.use("/products", productRoutes);
app.use("/categories", categoryRoutes);

app.get("/protected", authMiddleware, (req: express.Request, res: express.Response) => {
  const authReq = req as AuthRequest;
  res.json({ message: "This is a protected route", userId: authReq.userId });
});

app.get(
  "/admin",
  authMiddleware,
  adminMiddleware,
  (req: express.Request, res: express.Response) => {
    const authReq = req as AuthRequest;
    res.json({
      message: "This is an admin-only route",
      userId: authReq.userId,
      role: authReq.userRole,
    });
  }
);

app.get("/", (req: express.Request, res: express.Response) => {
  res.send("Hello, World!");
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  if (err) {
    console.error(err.stack);
    return res
      .status(500)
      .json({ message: "An unexpected error occurred", error: err.message });
  }
  next();
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
