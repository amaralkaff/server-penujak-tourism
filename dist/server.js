"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const compression_1 = __importDefault(require("compression"));
const helmet_1 = __importDefault(require("helmet"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const blog_1 = __importDefault(require("./routes/blog"));
const products_1 = __importDefault(require("./routes/products"));
const categories_1 = __importDefault(require("./routes/categories"));
const errorHandler_1 = require("./middleware/errorHandler");
const redisUtils_1 = require("./utils/redisUtils");
const rateLimitUtils_1 = require("./utils/rateLimitUtils");
const corsUtils_1 = require("./utils/corsUtils");
const fileUtils_1 = require("./utils/fileUtils");
const gracefulShutdown_1 = __importDefault(require("./utils/gracefulShutdown"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
// Initialize Redis
(0, redisUtils_1.initRedis)().catch(console.error);
// Middleware
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use(corsUtils_1.corsOptions);
app.use(express_1.default.json({ limit: "10kb" }));
// Rate limiting middleware
const limiter = (0, rateLimitUtils_1.createRateLimiter)();
app.use(limiter);
// Serve static files from the uploads directory
const uploadsDir = (0, fileUtils_1.getUploadsDirectory)();
app.use("/uploads", express_1.default.static(uploadsDir, {
    maxAge: '1d',
    immutable: true
}));
console.log("Serving static files from:", uploadsDir);
// Define routes
app.use("/auth", auth_1.default);
app.use("/users", users_1.default);
app.use("/blogs", blog_1.default);
app.use("/products", products_1.default);
app.use("/categories", categories_1.default);
// Root route
app.get("/", (req, res) => {
    res.send("Hello, World!");
});
// Use error handler middleware
app.use(errorHandler_1.errorHandler);
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} (${process.env.NODE_ENV} mode)`);
});
// Setup graceful shutdown
(0, gracefulShutdown_1.default)(server);
