// utils/fileUtils.ts

import fs from 'fs';
import path from 'path';

export const ensureDirectoryExists = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

export const getUploadsDirectory = (): string => {
  const uploadsDir = path.resolve(__dirname, '../../uploads');
  ensureDirectoryExists(uploadsDir);
  return uploadsDir;
};