import app from './app';
import pool from './config/database';
import { parkingImageService } from './services/parkingImageService';

const PORT = process.env.PORT || 3000;

// Test database connection
pool
  .query('SELECT NOW()')
  .then(() => {
    console.log('Database connection established');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      parkingImageService.startDemoRotation();
    });
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});

