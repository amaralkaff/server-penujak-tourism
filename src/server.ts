import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import {
  authMiddleware,
  adminMiddleware,
  AuthRequest,
} from "./middleware/auth";

dotenv.config();

const app = express();

app.use(express.json());

// Define routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);

app.get("/protected", authMiddleware, (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  res.json({ message: "This is a protected route", userId: authReq.userId });
});

app.get(
  "/admin",
  authMiddleware,
  adminMiddleware,
  (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    res.json({
      message: "This is an admin-only route",
      userId: authReq.userId,
      role: authReq.userRole,
    });
  }
);

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, World!");
});

app.use((err: any, req: any, res: any, next: NextFunction) => {
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
