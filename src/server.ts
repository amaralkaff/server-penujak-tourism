import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import compression from 'compression';
import helmet from 'helmet';
import path from 'path';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import blogRoutes from './routes/blog';
import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import searchRoutes from './routes/search';
import { errorHandler } from './middleware/errorHandler';
import { initRedis } from './utils/redisUtils';
import setupGracefulShutdown from './utils/gracefulShutdown';
import { corsMiddleware, additionalHeaders } from './utils/corsUtils';
import cookieParser from 'cookie-parser';

// Load environment variables
dotenv.config();

// Initialize the app
const app = express();

// Apply CORS middleware
app.use(corsMiddleware);
app.use(additionalHeaders);

// Apply other middleware
app.use(compression());
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Serve static files with explicit CORP header
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsDir));
console.log('Serving static files from:', uploadsDir);

// Define application routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/search', searchRoutes);
app.use('/blogs', blogRoutes);
app.use('/products', productRoutes);
app.use('/categories', categoryRoutes);

// Root route
app.get('/', (req: Request, res: Response) => {
  res.send('Welcome to Penujak Tourism');
});

// Standard error handling
app.use(errorHandler);

// Start the server and set up graceful shutdown
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} (Environment: ${process.env.NODE_ENV || 'development'})`);
});

setupGracefulShutdown(server);

// Initialize Redis connection
initRedis().catch(error => {
  console.error('Failed to connect to Redis:', error);
});

export default app;