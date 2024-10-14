"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMiddleware = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware = (req, res, next) => {
    var _a;
    const token = (_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
    if (!token) {
        res.status(401).json({ error: "No token, authorization denied" });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        next();
    }
    catch (error) {
        res.status(401).json({ error: "Token is not valid" });
    }
};
exports.authMiddleware = authMiddleware;
const adminMiddleware = (req, res, next) => {
    if (req.userRole !== "ADMIN") {
        res.status(403).json({ error: "Access denied. Admin only." });
        return;
    }
    next();
};
exports.adminMiddleware = adminMiddleware;
