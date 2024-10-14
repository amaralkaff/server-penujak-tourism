"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const auth_2 = require("./middleware/auth");
dotenv_1.default.config();
const app = (0, express_1.default)();
// CORS configuration
const corsOptions = {
    origin: [
        "https://penujak-tourism.vercel.app",
        "https://penujak-tourism-git-main-amangly6666s-projects.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
};
// Apply CORS middleware
app.use((0, cors_1.default)(corsOptions));
// Handle preflight requests
app.options("*", (0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// Define routes
app.use("/auth", auth_1.default);
app.use("/users", users_1.default);
app.get("/protected", auth_2.authMiddleware, (req, res) => {
    const authReq = req;
    res.json({ message: "This is a protected route", userId: authReq.userId });
});
app.get("/admin", auth_2.authMiddleware, auth_2.adminMiddleware, (req, res) => {
    const authReq = req;
    res.json({
        message: "This is an admin-only route",
        userId: authReq.userId,
        role: authReq.userRole,
    });
});
// Home route
app.get("/", (req, res) => {
    res.send("Hello, World!");
});
// Generic Error Handling Middleware
app.use((err, req, res, next) => {
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
