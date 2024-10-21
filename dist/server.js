"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const compression_1 = __importDefault(require("compression"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const blog_1 = __importDefault(require("./routes/blog"));
const products_1 = __importDefault(require("./routes/products"));
const categories_1 = __importDefault(require("./routes/categories"));
const search_1 = __importDefault(require("./routes/search"));
const errorHandler_1 = require("./middleware/errorHandler");
const redisUtils_1 = require("./utils/redisUtils");
const gracefulShutdown_1 = __importDefault(require("./utils/gracefulShutdown"));
const corsUtils_1 = require("./utils/corsUtils");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
// Load environment variables
dotenv_1.default.config();
// Initialize the app
const app = (0, express_1.default)();
// Apply CORS middleware
app.use(corsUtils_1.corsMiddleware);
app.use(corsUtils_1.additionalHeaders);
// Apply other middleware
app.use((0, compression_1.default)());
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(express_1.default.json({ limit: '10kb' }));
app.use((0, cookie_parser_1.default)());
// Serve static files with explicit CORP header
const uploadsDir = path_1.default.join(__dirname, 'uploads');
app.use('/uploads', (req, res, next) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express_1.default.static(uploadsDir));
console.log('Serving static files from:', uploadsDir);
// Define application routes
app.use('/auth', auth_1.default);
app.use('/users', users_1.default);
app.use('/search', search_1.default);
app.use('/blogs', blog_1.default);
app.use('/products', products_1.default);
app.use('/categories', categories_1.default);
// Root route
app.get('/', (req, res) => {
    res.send('Welcome to Penujak Tourism');
});
// Standard error handling
app.use(errorHandler_1.errorHandler);
// Start the server and set up graceful shutdown
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} (Environment: ${process.env.NODE_ENV || 'development'})`);
});
(0, gracefulShutdown_1.default)(server);
// Initialize Redis connection
(0, redisUtils_1.initRedis)().catch(error => {
    console.error('Failed to connect to Redis:', error);
});
exports.default = app;
