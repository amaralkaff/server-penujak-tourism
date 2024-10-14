"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const bcrypt_1 = __importDefault(require("bcrypt"));
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Create a new user (Admin only)
router.post("/", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, name, role } = req.body;
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        const user = yield prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: role === "ADMIN" ? "ADMIN" : "USER",
            },
        });
        res.json({ message: "User created successfully", userId: user.id });
    }
    catch (error) {
        res.status(500).json({ error: "Error creating user" });
    }
}));
// Get all users (Admin only)
router.get("/", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield prisma.user.findMany();
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: "Error retrieving users" });
    }
}));
// Get a single user by ID (Admin only)
router.get("/:id", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = parseInt(req.params.id);
    try {
        const user = yield prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: "Error retrieving user" });
    }
}));
// Update user by ID (Admin only)
router.put("/:id", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = parseInt(req.params.id);
    const { email, name, role } = req.body;
    try {
        const user = yield prisma.user.update({
            where: { id: userId },
            data: { email, name, role },
        });
        res.json({ message: "User updated successfully", user });
    }
    catch (error) {
        res.status(500).json({ error: "Error updating user" });
    }
}));
// Delete user by ID (Admin only)
router.delete("/:id", auth_1.authMiddleware, auth_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = parseInt(req.params.id);
    try {
        yield prisma.user.delete({ where: { id: userId } });
        res.json({ message: "User deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: "Error deleting user" });
    }
}));
exports.default = router;
