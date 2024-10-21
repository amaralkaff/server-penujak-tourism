"use strict";
// utils/fileUtils.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUploadsDirectory = exports.ensureDirectoryExists = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ensureDirectoryExists = (dirPath) => {
    if (!fs_1.default.existsSync(dirPath)) {
        fs_1.default.mkdirSync(dirPath, { recursive: true });
    }
};
exports.ensureDirectoryExists = ensureDirectoryExists;
const getUploadsDirectory = () => {
    const uploadsDir = path_1.default.resolve(__dirname, 'uploads');
    (0, exports.ensureDirectoryExists)(uploadsDir);
    return uploadsDir;
};
exports.getUploadsDirectory = getUploadsDirectory;
