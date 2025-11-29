import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Плагин для копирования содержимого папки assets в корень dist
const copyAssetsPlugin = () => {
  return {
    name: 'copy-assets',
    closeBundle() {
      const assetsDir = join(process.cwd(), 'assets');
      const distDir = join(process.cwd(), 'dist');

      try {
        // Проверяем существование папки assets
        if (!statSync(assetsDir).isDirectory()) {
          console.log('Assets directory not found, skipping...');
          return;
        }

        // Копируем содержимое папки assets в корень dist
        const copyRecursive = (src, dest) => {
          const entries = readdirSync(src);

          entries.forEach(entry => {
            const srcPath = join(src, entry);
            const destPath = join(dest, entry);
            const stat = statSync(srcPath);

            if (stat.isDirectory()) {
              mkdirSync(destPath, { recursive: true });
              copyRecursive(srcPath, destPath);
            } else {
              copyFileSync(srcPath, destPath);
            }
          });
        };

        copyRecursive(assetsDir, distDir);
        console.log('Assets copied to dist successfully');
      } catch (error) {
        console.warn('Error copying assets:', error.message);
      }
    }
  };
};

export default defineConfig({
  server: {
    port: 5173,
    open: true,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    // Отключаем объединение в один файл для сохранения структуры
    rollupOptions: {
      input: './index.html',
      output: {
        // Сохраняем исходные имена файлов
        entryFileNames: (chunkInfo) => {
          // Сохраняем структуру для основных файлов
          const name = chunkInfo.name;
          if (name === 'index') return 'index.html';
          return '[name].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'index.html') return 'index.html';
          return 'assets/[name]-[hash].[ext]';
        }
      }
    }
  },
  plugins: [copyAssetsPlugin()]
});

