import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import Redis from "ioredis";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import blogRoutes from "./routes/blog";
import productRoutes from "./routes/products";
import categoryRoutes from "./routes/categories";
import { errorHandler } from "./middleware/errorHandler";
import fs from "fs";  

// Load environment variables
dotenv.config();

const app = express();

// Redis setup
let redis: Redis | null = null;
try {
  console.log("Attempting to connect to Redis...");
  redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  
  redis.on("connect", () => {
    console.log("Successfully connected to Redis");
  });

  redis.on("error", (error) => {
    console.warn("Redis error, falling back to database:", error);
    redis = null;
  });

  // Test the connection
  redis.ping().then(() => {
    console.log("Redis PING successful");
  }).catch((error) => {
    console.error("Redis PING failed:", error);
    redis = null;
  });

} catch (error) {
  console.warn("Failed to initialize Redis, falling back to database:", error);
  redis = null;
}

// Define the uploads directory
const uploadsDir = path.resolve(__dirname, '../uploads');

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

// Root route
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// Use error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} (${process.env.NODE_ENV} mode)`);
});

export { redis };