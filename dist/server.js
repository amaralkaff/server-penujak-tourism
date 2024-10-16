"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const blog_1 = __importDefault(require("./routes/blog"));
const products_1 = __importDefault(require("./routes/products"));
const categories_1 = __importDefault(require("./routes/categories"));
const auth_2 = require("./middleware/auth");
// Import AppSignal
const nodejs_1 = require("@appsignal/nodejs");
// Load environment variables
dotenv_1.default.config();
// Initialize AppSignal
const appsignal = new nodejs_1.Appsignal({
    active: process.env.NODE_ENV === 'production',
    name: "PenujakTourismAPI",
    pushApiKey: process.env.APPSIGNAL_PUSH_API_KEY,
    logLevel: "trace" // Set to "trace" for more detailed logs
}); // Use 'any' type to bypass TypeScript checks
const app = (0, express_1.default)();
// Define the uploads directory
const uploadsDir = path_1.default.resolve(__dirname, "../uploads");
// Ensure the uploads directory exists
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://penujak-tourism.vercel.app",
    "https://103.127.132.14",
];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = "The CORS policy for this site does not allow access from the specified Origin.";
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
}));
app.use(express_1.default.json());
// Serve static files from the uploads directory
app.use("/uploads", express_1.default.static(uploadsDir));
console.log("Serving static files from:", uploadsDir);
// Define routes
app.use("/auth", auth_1.default);
app.use("/users", users_1.default);
app.use("/blogs", blog_1.default);
app.use("/products", products_1.default);
app.use("/categories", categories_1.default);
// Protected route example
app.get("/protected", auth_2.authMiddleware, (req, res) => {
    const authReq = req;
    res.json({ message: "This is a protected route", userId: authReq.userId });
});
// Admin-only route example
app.get("/admin", auth_2.authMiddleware, auth_2.adminMiddleware, (req, res) => {
    const authReq = req;
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
app.use((err, req, res, next) => {
    console.error("Error:", err.message);
    console.error("Stack:", err.stack);
    if (process.env.NODE_ENV === 'production') {
        if (appsignal.isActive && typeof appsignal.sendError === 'function') {
            try {
                appsignal.sendError(err);
                console.log("Error sent to AppSignal");
            }
            catch (appsignalError) {
                console.error("Failed to send error to AppSignal:", appsignalError);
            }
        }
        else {
            console.warn("AppSignal is not active or sendError is not available. Error not sent.");
        }
    }
    else {
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
