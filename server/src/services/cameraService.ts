import fs from 'fs';
import path from 'path';
import { nnService, PredictionResult } from './nnService';
import { parkingHistoryRepository } from '../repositories/parkingHistoryRepository';
import { parkingSpotRepository } from '../repositories/parkingSpotRepository';
import { parkingCameraRepository } from '../repositories/parkingCameraRepository';
import { cameraRepository } from '../repositories/cameraRepository';
import { Camera, CameraType } from '../types';

// Путь к публичной директории
const getPublicDir = (): string => {
  const baseDir = path.resolve(__dirname, '..', '..');
  return path.join(baseDir, 'public');
};

const PUBLIC_DIR = getPublicDir();
const SWITCH_INTERVAL_MS = 15000; // 15 секунд

interface CameraData {
  camera: Camera;
  parkingId: number;
  imageFiles: string[];
  currentIndex: number;
}

export interface CameraServiceStatus {
  isRunning: boolean;
  activeCameras: number;
  lastUpdate: Date | null;
}

class CameraService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private cameras: Map<number, CameraData> = new Map(); // camera_id -> CameraData
  // Храним результаты анализа для каждой парковки по ID
  private parkingResults: Map<number, {
    result: PredictionResult;
    lastUpdate: Date;
    cameraId: number;
    cameraName: string;
    imageName: string; // Имя изображения, которое было проанализировано
    imageUrl: string; // URL изображения для клиента
  }> = new Map();

  /**
   * Загружает изображения для static камеры из public/{camera_id}/*
   */
  private loadStaticCameraImages(cameraId: number): string[] {
    const cameraDir = path.join(PUBLIC_DIR, cameraId.toString());
    
    try {
      if (!fs.existsSync(cameraDir)) {
        console.warn(`[CameraService] Directory ${cameraDir} does not exist for camera ${cameraId}`);
        return [];
      }

      const files = fs.readdirSync(cameraDir);
      const imageFiles = files
        .filter((file) => {
          const ext = path.extname(file).toLowerCase();
          return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
        })
        .sort()
        .map((file) => path.join(cameraDir, file));

      console.log(
        `[CameraService] Loaded ${imageFiles.length} images for static camera ${cameraId}: ${Array.from(new Set(imageFiles.map(f => path.basename(f)))).join(', ')}`
      );

      return imageFiles;
    } catch (error) {
      console.error(`[CameraService] Error loading images for camera ${cameraId}:`, error);
      return [];
    }
  }

  /**
   * Загружает кадр из RTSP потока (заглушка для будущей реализации)
   */
  private async loadRtspFrame(camera: Camera): Promise<Buffer | null> {
    // TODO: Реализовать подключение к RTSP потоку и получение кадра
    console.warn(`[CameraService] RTSP camera support not implemented yet for camera ${camera.id}`);
    return null;
  }

  /**
   * Загружает кадр из HTTP источника (заглушка для будущей реализации)
   */
  private async loadHttpFrame(camera: Camera): Promise<Buffer | null> {
    // TODO: Реализовать загрузку изображения по HTTP
    console.warn(`[CameraService] HTTP camera support not implemented yet for camera ${camera.id}`);
    return null;
  }

  /**
   * Загружает кадр из файла (заглушка для будущей реализации)
   */
  private async loadFileFrame(camera: Camera): Promise<Buffer | null> {
    // TODO: Реализовать загрузку изображения из файла
    console.warn(`[CameraService] File camera support not implemented yet for camera ${camera.id}`);
    return null;
  }

  /**
   * Получает текущий кадр от камеры в зависимости от её типа
   */
  private async getCameraFrame(cameraData: CameraData): Promise<Buffer | null> {
    const { camera } = cameraData;

    switch (camera.camera_type) {
      case 'static':
        // Для static камер берем следующее изображение из списка
        if (cameraData.imageFiles.length === 0) {
          return null;
        }
        const imagePath = cameraData.imageFiles[cameraData.currentIndex];
        try {
          return fs.readFileSync(imagePath);
        } catch (error) {
          console.error(`[CameraService] Error reading image ${imagePath}:`, error);
          return null;
        }

      case 'rtsp':
        return await this.loadRtspFrame(camera);

      case 'http':
        return await this.loadHttpFrame(camera);

      case 'file':
        return await this.loadFileFrame(camera);

      default:
        console.warn(`[CameraService] Unknown camera type: ${camera.camera_type}`);
        return null;
    }
  }

  /**
   * Обрабатывает кадр от камеры
   */
  private async processCameraFrame(cameraData: CameraData): Promise<void> {
    const { camera, parkingId } = cameraData;
    const frameStartTime = Date.now();

    if (!camera.is_active) {
      return;
    }

    try {
      const imageBuffer = await this.getCameraFrame(cameraData);

      if (!imageBuffer) {
        console.warn(`[CameraService] No frame available from camera ${camera.id} (${camera.name})`);
        return;
      }

      const imageName = camera.camera_type === 'static' && cameraData.imageFiles.length > 0
        ? path.basename(cameraData.imageFiles[cameraData.currentIndex])
        : `camera_${camera.id}_${Date.now()}.jpg`;

      // Формируем URL изображения ДО переключения на следующее
      const imageUrl = camera.camera_type === 'static' && cameraData.imageFiles.length > 0
        ? `/${camera.id}/${imageName}`
        : null;

      console.log(
        `[CameraService] ===== Processing frame from camera ${camera.id} (${camera.name}) for parking ${parkingId} =====`
      );
      console.log(
        `[CameraService] Image being analyzed: ${imageName} (index: ${cameraData.currentIndex}/${cameraData.imageFiles.length - 1})`
      );
      console.log(
        `[CameraService] Image URL for client: ${imageUrl || 'N/A'}`
      );

      // Отправляем в NN сервис
      const result = await nnService.predictImage(imageBuffer, imageName);
      
      const totalProcessingTime = Date.now() - frameStartTime;

      console.log(
        `[CameraService] ===== Analysis result for parking ${parkingId} (camera ${camera.id}, image: ${imageName}) =====`
      );
      console.log(
        `[CameraService] Free: ${result.free_spots}/${result.total_spots}, Occupied: ${result.occupied_spots}/${result.total_spots}`
      );
      console.log(
        `[CameraService] Spots state: [${result.spots_state.slice(0, 10).join(',')}${result.spots_state.length > 10 ? '...' : ''}] (total: ${result.spots_state.length})`
      );
      console.log(
        `[CameraService] Total frame processing time: ${totalProcessingTime}ms (${(totalProcessingTime / 1000).toFixed(2)}s)`
      );

      // Сохраняем результат для парковки ВМЕСТЕ с именем изображения
      this.parkingResults.set(parkingId, {
        result,
        lastUpdate: new Date(),
        cameraId: camera.id,
        cameraName: camera.name,
        imageName: imageName,
        imageUrl: imageUrl || '',
      });

      // Сохраняем историю в базу данных
      try {
        await parkingHistoryRepository.create({
          parking_id: parkingId,
          spots_state: result.spots_state,
        });
        console.log(`[CameraService] Saved history for parking ${parkingId}`);
      } catch (error) {
        console.error(
          `[CameraService] Error saving history for parking ${parkingId}:`,
          error instanceof Error ? error.message : error
        );
      }

      // Обновляем статусы парковочных мест
      await this.updateParkingSpots(parkingId, result);

      // Для static камер переключаемся на следующее изображение
      if (camera.camera_type === 'static' && cameraData.imageFiles.length > 0) {
        cameraData.currentIndex = (cameraData.currentIndex + 1) % cameraData.imageFiles.length;
      }
    } catch (error) {
      console.error(
        `[CameraService] Error processing frame from camera ${camera.id}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  /**
   * Обновляет статусы парковочных мест на основе результатов анализа
   */
  private async updateParkingSpots(
    parkingId: number,
    result: PredictionResult
  ): Promise<void> {
    try {
      if (!result.slot_details || result.slot_details.length === 0) {
        console.warn(
          `[CameraService] No slot_details in result for parking ${parkingId}`
        );
        return;
      }

      const existingSpots = await parkingSpotRepository.findByParkingId(parkingId);
      const spotsByNumber = new Map(
        existingSpots.map((spot) => [spot.spot_number, spot])
      );

      for (const slotDetail of result.slot_details) {
        const spotNumber = this.slotIdToSpotNumber(slotDetail.slot_id);

        if (spotNumber === null) {
          console.warn(
            `[CameraService] Cannot determine spot_number for slot_id: ${slotDetail.slot_id}`
          );
          continue;
        }

        const isFree = slotDetail.status === 'free';
        const existingSpot = spotsByNumber.get(spotNumber);

        if (existingSpot) {
          if (existingSpot.is_free !== isFree) {
            await parkingSpotRepository.update(existingSpot.id, {
              is_free: isFree,
            });
            console.log(
              `[CameraService] Updated spot ${spotNumber} for parking ${parkingId}: ${isFree ? 'free' : 'occupied'}`
            );
          }
        } else {
          try {
            await parkingSpotRepository.create({
              parking_id: parkingId,
              spot_number: spotNumber,
              is_free: isFree,
              coordinates: {},
            });
            console.log(
              `[CameraService] Created spot ${spotNumber} for parking ${parkingId}: ${isFree ? 'free' : 'occupied'}`
            );
          } catch (error) {
            console.error(
              `[CameraService] Error creating spot ${spotNumber} for parking ${parkingId}:`,
              error instanceof Error ? error.message : error
            );
          }
        }
      }
    } catch (error) {
      console.error(
        `[CameraService] Error updating parking spots for parking ${parkingId}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  /**
   * Преобразует slot_id (например, "S01") в spot_number (например, 1)
   */
  private slotIdToSpotNumber(slotId: string): number | null {
    const match = slotId.match(/^S(\d+)$/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return null;
  }

  /**
   * Загружает камеры из базы данных и инициализирует их
   */
  private async loadCameras(): Promise<void> {
    try {
      // Получаем все связи парковок и камер
      const parkingCameras = await parkingCameraRepository.findAll();

      this.cameras.clear();

      for (const pc of parkingCameras) {
        const camera = await cameraRepository.findById(pc.camera_id);

        if (!camera || !camera.is_active) {
          continue;
        }

        // Инициализируем данные камеры
        const cameraData: CameraData = {
          camera,
          parkingId: pc.parking_id,
          imageFiles: [],
          currentIndex: 0,
        };

        // Для static камер загружаем изображения
        if (camera.camera_type === 'static') {
          // Создаем папку для камеры, если её нет
          const cameraDir = path.join(PUBLIC_DIR, camera.id.toString());
          if (!fs.existsSync(cameraDir)) {
            try {
              fs.mkdirSync(cameraDir, { recursive: true });
              console.log(`[CameraService] Created directory for camera ${camera.id}: ${cameraDir}`);
            } catch (error) {
              console.error(`[CameraService] Failed to create directory for camera ${camera.id}:`, error);
            }
          }
          
          cameraData.imageFiles = this.loadStaticCameraImages(camera.id);
          
          if (cameraData.imageFiles.length === 0) {
            console.warn(
              `[CameraService] No images found for static camera ${camera.id} (${camera.name}) in ${cameraDir}`
            );
            continue; // Пропускаем камеры без изображений
          }
        }

        this.cameras.set(camera.id, cameraData);
        console.log(
          `[CameraService] Loaded camera ${camera.id} (${camera.name}, type: ${camera.camera_type}) for parking ${pc.parking_id}`
        );
      }

      console.log(`[CameraService] Loaded ${this.cameras.size} active cameras`);
    } catch (error) {
      console.error('[CameraService] Error loading cameras:', error);
    }
  }

  /**
   * Основной цикл обработки камер
   */
  private async runCycle(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Обрабатываем кадры от всех камер
    const promises = Array.from(this.cameras.values()).map((cameraData) =>
      this.processCameraFrame(cameraData)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Запускает сервис камер
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[CameraService] Already running');
      return;
    }

    // Загружаем камеры из базы данных
    await this.loadCameras();

    if (this.cameras.size === 0) {
      console.error('[CameraService] No active cameras found. Cannot start camera service.');
      return;
    }

    this.isRunning = true;

    console.log(
      `[CameraService] Starting camera service with ${this.cameras.size} cameras, processing every ${SWITCH_INTERVAL_MS / 1000} seconds`
    );

    // Обрабатываем первый кадр сразу
    await this.runCycle();

    // Затем запускаем интервал
    this.intervalId = setInterval(() => {
      this.runCycle();
    }, SWITCH_INTERVAL_MS);
  }

  /**
   * Останавливает сервис камер
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('[CameraService] Stopped');
  }

  /**
   * Перезагружает камеры из базы данных
   */
  async reloadCameras(): Promise<void> {
    if (this.isRunning) {
      console.log('[CameraService] Reloading cameras...');
      await this.loadCameras();
    }
  }

  /**
   * Получает текущий статус сервиса
   */
  getStatus(): CameraServiceStatus {
    return {
      isRunning: this.isRunning,
      activeCameras: this.cameras.size,
      lastUpdate: this.parkingResults.size > 0
        ? Array.from(this.parkingResults.values())[0].lastUpdate
        : null,
    };
  }

  /**
   * Получает последние результаты анализа для конкретной парковки
   */
  getParkingAnalysis(parkingId: number): {
    result: PredictionResult;
    lastUpdate: Date;
    cameraId: number;
    cameraName: string;
    imageName: string;
    imageUrl: string;
  } | null {
    return this.parkingResults.get(parkingId) || null;
  }

  /**
   * Получает последние результаты анализа для всех парковок
   */
  getAllParkingAnalyses(): Map<number, {
    result: PredictionResult;
    lastUpdate: Date;
    cameraId: number;
    cameraName: string;
    imageName: string;
    imageUrl: string;
  }> {
    return new Map(this.parkingResults);
  }

  /**
   * Получает URL изображения, которое было проанализировано нейросетью
   * Это гарантирует синхронизацию между изображением и результатами анализа
   * @param parkingId - ID парковки
   * @returns URL изображения или null, если камера не найдена или не static
   */
  getParkingCameraImageUrl(parkingId: number): string | null {
    // Используем сохраненный URL из результатов анализа для синхронизации
    const analysis = this.parkingResults.get(parkingId);
    if (analysis && analysis.imageUrl) {
      console.log(
        `[CameraService] Returning analyzed image URL for parking ${parkingId}: ${analysis.imageUrl} (image: ${analysis.imageName})`
      );
      return analysis.imageUrl;
    }

    // Fallback: если результатов анализа нет, используем текущее изображение камеры
    for (const [cameraId, cameraData] of this.cameras.entries()) {
      if (cameraData.parkingId === parkingId && 
          cameraData.camera.camera_type === 'static' &&
          cameraData.imageFiles.length > 0) {
        const currentImagePath = cameraData.imageFiles[cameraData.currentIndex];
        
        if (!fs.existsSync(currentImagePath)) {
          console.warn(
            `[CameraService] Image file not found: ${currentImagePath} for camera ${cameraData.camera.id}`
          );
          continue;
        }
        
        const imageName = path.basename(currentImagePath);
        const imageUrl = `/${cameraData.camera.id}/${imageName}`;
        console.log(
          `[CameraService] Fallback: Generated image URL for parking ${parkingId}: ${imageUrl} (no analysis result yet)`
        );
        return imageUrl;
      }
    }
    return null;
  }

  /**
   * Получает информацию о камере для парковки
   */
  getParkingCameraInfo(parkingId: number): {
    cameraId: number;
    cameraName: string;
    cameraType: CameraType;
    imageUrl: string | null;
  } | null {
    // Сначала ищем камеру, чтобы получить её тип
    let cameraData: CameraData | null = null;
    for (const [cameraId, data] of this.cameras.entries()) {
      if (data.parkingId === parkingId) {
        cameraData = data;
        break;
      }
    }

    if (!cameraData) {
      return null;
    }

    // Используем синхронизированный URL из результатов анализа, если есть
    const analysis = this.parkingResults.get(parkingId);
    const imageUrl = analysis?.imageUrl || this.getParkingCameraImageUrl(parkingId);

    return {
      cameraId: cameraData.camera.id,
      cameraName: cameraData.camera.name,
      cameraType: cameraData.camera.camera_type,
      imageUrl: imageUrl,
    };
  }
}

export const cameraService = new CameraService();
