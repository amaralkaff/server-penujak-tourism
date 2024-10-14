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
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
router.post("/register", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });
        // Return token and user data in response
        res.json({
            token,
            userId: user.id,
        });
    }
    catch (error) {
        res.status(500).json({ error: "Error registering user" });
    }
}));
router.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const user = yield prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ error: "Invalid credentials" });
        }
        const validPassword = yield bcrypt_1.default.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: "Invalid credentials" });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });
        // Include user data in the response
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                isAdmin: user.role === "ADMIN",
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: "Error logging in" });
    }
}));
exports.default = router;
