import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import fs from "fs";
import https from "https";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import blogRoutes from "./routes/blog";
import productRoutes from "./routes/products";
import categoryRoutes from "./routes/categories";
import { authMiddleware, adminMiddleware, AuthRequest } from "./middleware/auth";

dotenv.config();

const app = express();

// Define the uploads directory
const uploadsDir = path.resolve(__dirname, "../uploads");

// Ensure the uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://penujak-tourism.vercel.app",
  "https://103.127.132.14",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());

// Serve static files from the uploads directory
app.use("/uploads", express.static(uploadsDir));
console.log("Serving static files from:", uploadsDir);

// Define routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/blogs", blogRoutes);
app.use("/products", productRoutes);
app.use("/categories", categoryRoutes);

// Protected route example
app.get("/protected", authMiddleware, (req, res) => {
  const authReq = req as AuthRequest;
  res.json({ message: "This is a protected route", userId: authReq.userId });
});

// Admin-only route example
app.get("/admin", authMiddleware, adminMiddleware, (req, res) => {
  const authReq = req as AuthRequest;
  res.json({
    message: "This is an admin-only route",
    userId: authReq.userId,
    role: authReq.userRole,
  });
});

// Root route
app.get("/", (req, res) => {
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

// Load SSL Certificate and Key
const sslOptions = {
  key: fs.readFileSync("ssl/key.pem"),
  cert: fs.readFileSync("ssl/cert.pem"),
};

const PORT = process.env.PORT || 3000;

https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`HTTPS Server is running on port ${PORT}`);
});
