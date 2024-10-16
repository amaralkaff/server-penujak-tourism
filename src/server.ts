import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import fs from "fs";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import blogRoutes from "./routes/blog";
import productRoutes from "./routes/products";
import categoryRoutes from "./routes/categories";
import { authMiddleware, adminMiddleware, AuthRequest } from "./middleware/auth";

// Import AppSignal
import { Appsignal } from "@appsignal/nodejs";

// Load environment variables
dotenv.config();

// Initialize AppSignal
const appsignal = new Appsignal({
  active: process.env.NODE_ENV === 'production',
  name: "PenujakTourismAPI",
  pushApiKey: process.env.APPSIGNAL_PUSH_API_KEY,
  logLevel: "trace" // Set to "trace" for more detailed logs
}) as any; // Use 'any' type to bypass TypeScript checks

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

// Test error route
app.get("/test-error", (req, res, next) => {
  next(new Error("This is a test error"));
});

// Custom error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err.message);
  console.error("Stack:", err.stack);
  
  if (process.env.NODE_ENV === 'production') {
    if (appsignal.isActive && typeof appsignal.sendError === 'function') {
      try {
        appsignal.sendError(err);
        console.log("Error sent to AppSignal");
      } catch (appsignalError) {
        console.error("Failed to send error to AppSignal:", appsignalError);
      }
    } else {
      console.warn("AppSignal is not active or sendError is not available. Error not sent.");
    }
  } else {
    console.log("AppSignal error reporting is disabled in development mode.");
  }
  
  // Send a generic error message in production
  const errorMessage = process.env.NODE_ENV === 'production' 
    ? 'An unexpected error occurred' 
    : err.message;

  res.status(500).json({ 
    error: errorMessage,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} (${process.env.NODE_ENV} mode)`);
});