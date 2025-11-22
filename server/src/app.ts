import express, { Application } from 'express';
import path, { join } from 'path';
import fs from 'fs';
import cors from 'cors';
import parkingRoutes from './routes/parkingRoutes';
import cameraRoutes from './routes/cameraRoutes';
import parkingSpotRoutes from './routes/parkingSpotRoutes';
import parkingHistoryRoutes from './routes/parkingHistoryRoutes';
import appUserRoutes from './routes/appUserRoutes';
import parkingCameraRoutes from './routes/parkingCameraRoutes';
import userParkingRoutes from './routes/userParkingRoutes';
import authRoutes from './routes/authRoutes';
import parkingAnalysisRoutes from './routes/parkingAnalysisRoutes';
import cameraServiceRoutes from './routes/cameraServiceRoutes';
import { errorHandler } from './middleware/errorHandler';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы: в development __dirname = src/, в production __dirname = dist/
// public находится на уровень выше
const publicPath = join(__dirname, '..', 'public');
console.log(`[App] Serving static files from: ${publicPath}`);
console.log(`[App] __dirname: ${__dirname}`);

// Проверяем существование директории
if (fs.existsSync(publicPath)) {
  console.log(`[App] Public directory exists: ${publicPath}`);
  try {
    const files = fs.readdirSync(publicPath);
    console.log(`[App] Files in public: ${files.join(', ')}`);
  } catch (error) {
    console.warn(`[App] Cannot read public directory:`, error);
  }
} else {
  console.warn(`[App] Public directory does not exist: ${publicPath}`);
}

app.use(express.static(publicPath));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Auth Routes (без префикса /api)
app.use('/api/auth', authRoutes);

// API Routes
app.use('/api/parkings', parkingRoutes);
app.use('/api/cameras', cameraRoutes);
app.use('/api/parking-spots', parkingSpotRoutes);
app.use('/api/parking-history', parkingHistoryRoutes);
app.use('/api/users', appUserRoutes);
app.use('/api/parking-cameras', parkingCameraRoutes);
app.use('/api/user-parkings', userParkingRoutes);
app.use('/api/parking-analysis', parkingAnalysisRoutes);
app.use('/api/camera-service', cameraServiceRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;

