import express, { Application } from 'express';
import cors from 'cors';
import parkingRoutes from './routes/parkingRoutes';
import cameraRoutes from './routes/cameraRoutes';
import parkingSpotRoutes from './routes/parkingSpotRoutes';
import parkingHistoryRoutes from './routes/parkingHistoryRoutes';
import appUserRoutes from './routes/appUserRoutes';
import parkingCameraRoutes from './routes/parkingCameraRoutes';
import userParkingRoutes from './routes/userParkingRoutes';
import authRoutes from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;

