import app from './app';
import pool from './config/database';
import { cameraService } from './services/cameraService';
import { nnService } from './services/nnService';

const PORT = process.env.PORT || 3000;
const ENABLE_CAMERA_SERVICE = process.env.ENABLE_CAMERA_SERVICE !== 'false'; // По умолчанию включен

// Test database connection
pool
  .query('SELECT NOW()')
  .then(async () => {
    console.log('Database connection established');
    
    if (ENABLE_CAMERA_SERVICE) {
      console.log('Checking NN service availability...');
      const isHealthy = await nnService.healthCheck();
      
      if (isHealthy) {
        console.log('NN service is available. Starting camera service...');
        await cameraService.start();
      } else {
        console.warn(
          'NN service is not available. Camera service will not start.'
        );
        console.warn(
          'The camera service will be available but will not process images until NN service is ready.'
        );
        // Всё равно запускаем, но с предупреждением
        await cameraService.start();
      }
    } else {
      console.log('Camera service is disabled (ENABLE_CAMERA_SERVICE=false)');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  cameraService.stop();
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  cameraService.stop();
  await pool.end();
  process.exit(0);
});

