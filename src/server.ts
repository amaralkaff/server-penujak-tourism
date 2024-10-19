import express from "express";
import dotenv from "dotenv";
import compression from "compression";
import helmet from "helmet";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import blogRoutes from "./routes/blog";
import productRoutes from "./routes/products";
import categoryRoutes from "./routes/categories";
import { errorHandler } from "./middleware/errorHandler";
import { initRedis } from "./utils/redisUtils";
import { createRateLimiter } from "./utils/rateLimitUtils";
import { corsOptions } from "./utils/corsUtils";
import { getUploadsDirectory } from "./utils/fileUtils";
import setupGracefulShutdown from "./utils/gracefulShutdown";

// Load environment variables
dotenv.config();

const app = express();

// Initialize Redis
initRedis().catch(console.error);

// Middleware
app.use(helmet());
app.use(compression());
app.use(corsOptions);
app.use(express.json({ limit: "10kb" }));

// Rate limiting middleware
const limiter = createRateLimiter();
app.use(limiter);

// Serve static files from the uploads directory
const uploadsDir = getUploadsDirectory();
app.use("/uploads", express.static(uploadsDir, {
  maxAge: '1d',
  immutable: true
}));
console.log("Serving static files from:", uploadsDir);

// Define routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/blogs", blogRoutes);
app.use("/products", productRoutes);
app.use("/categories", categoryRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// Use error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} (${process.env.NODE_ENV} mode)`);
});

// Setup graceful shutdown
setupGracefulShutdown(server);
