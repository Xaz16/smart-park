import axios, { AxiosError } from 'axios';
import FormData from 'form-data';

const NN_SERVICE_URL =
  process.env.NN_SERVICE_URL || 'http://nn-service:5000';
const NN_SERVICE_TIMEOUT = Number(process.env.NN_SERVICE_TIMEOUT) || 30000;

export interface PredictionResult {
  status: 'success';
  spots_state: number[];
  total_spots: number;
  free_spots: number;
  occupied_spots: number;
  slot_details?: Array<{
    slot_id: string;
    status: 'free' | 'occupied';
    confidence: number;
  }>;
}

export interface PredictionError {
  error: string;
}

class NNService {
  /**
   * Проверяет доступность NN сервиса
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${NN_SERVICE_URL}/health`, {
        timeout: 5000,
      });
      return response.data.status === 'ok' && response.data.model_loaded;
    } catch (error) {
      console.error('[NNService] Health check failed:', error);
      return false;
    }
  }

  /**
   * Анализирует изображение и возвращает состояние парковочных мест
   * @param imageBuffer - буфер изображения
   * @param layout - JSON разметка парковки
   * @param filename - имя файла (опционально)
   */
  async predictImage(
    imageBuffer: Buffer,
    layout: Record<string, any>,
    filename?: string
  ): Promise<PredictionResult> {
    const startTime = Date.now();
    const imageName = filename || 'image.jpg';
    
    try {
      const formData = new FormData();
      formData.append('image', imageBuffer, {
        filename: imageName,
        contentType: 'image/jpeg',
      });
      formData.append('layout', JSON.stringify(layout));

      console.log(`[NNService] Sending image "${imageName}" to NN service (size: ${imageBuffer.length} bytes)...`);
      
      const response = await axios.post<PredictionResult>(
        `${NN_SERVICE_URL}/predict`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: NN_SERVICE_TIMEOUT,
        }
      );

      const responseTime = Date.now() - startTime;
      console.log(`[NNService] Received response for "${imageName}" in ${responseTime}ms (${(responseTime / 1000).toFixed(2)}s)`);
      console.log(`[NNService] Result: ${response.data.free_spots} free / ${response.data.total_spots} total spots`);

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<PredictionError>;
        if (axiosError.response) {
          throw new Error(
            axiosError.response.data?.error ||
              `NN Service error: ${axiosError.response.status}`
          );
        }
        if (axiosError.request) {
          throw new Error(
            'NN Service is not available. Please check if the service is running.'
          );
        }
      }
      throw new Error(
        `Failed to predict image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Анализирует изображение в base64 формате
   * @param base64Image - изображение в формате base64
   * @param layout - JSON разметка парковки
   */
  async predictImageBase64(
    base64Image: string,
    layout: Record<string, any>
  ): Promise<PredictionResult> {
    const startTime = Date.now();
    const imageSize = Math.round((base64Image.length * 3) / 4); // Примерный размер в байтах
    
    try {
      console.log(`[NNService] Sending base64 image to NN service (approx. size: ${imageSize} bytes)...`);
      
      const response = await axios.post<PredictionResult>(
        `${NN_SERVICE_URL}/predict-base64`,
        { image: base64Image, layout },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: NN_SERVICE_TIMEOUT,
        }
      );

      const responseTime = Date.now() - startTime;
      console.log(`[NNService] Received base64 response in ${responseTime}ms (${(responseTime / 1000).toFixed(2)}s)`);
      console.log(`[NNService] Result: ${response.data.free_spots} free / ${response.data.total_spots} total spots`);

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<PredictionError>;
        if (axiosError.response) {
          throw new Error(
            axiosError.response.data?.error ||
              `NN Service error: ${axiosError.response.status}`
          );
        }
        if (axiosError.request) {
          throw new Error(
            'NN Service is not available. Please check if the service is running.'
          );
        }
      }
      throw new Error(
        `Failed to predict image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

export const nnService = new NNService();

