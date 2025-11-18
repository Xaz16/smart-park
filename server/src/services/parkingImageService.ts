import path from 'path';
import fs from 'fs';

const ROTATION_INTERVAL_MS =
  Number(process.env.PARKING_IMAGE_ROTATION_INTERVAL_MS) || 10_000;
const PARKINGS_DIR = path.resolve(__dirname, '..', '..', 'public', 'parkings');
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

class ParkingImageService {
  private availableImages: string[] = [];
  private currentIndex = 0;
  private rotationTimer?: NodeJS.Timeout;

  constructor() {
    this.availableImages = this.loadAvailableImages();
    if (this.availableImages.length > 0) {
      this.currentIndex = 0;
    }
  }

  private loadAvailableImages(): string[] {
    try {
      const files = fs.readdirSync(PARKINGS_DIR);
      return files
        .filter((file) =>
          SUPPORTED_EXTENSIONS.includes(path.extname(file).toLowerCase())
        )
        .sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        );
    } catch (error) {
      console.warn(
        '[ParkingImageService] Cannot read parking images directory:',
        error
      );
      return [];
    }
  }

  private get currentImage(): string | null {
    if (this.availableImages.length === 0) {
      return null;
    }
    return this.availableImages[this.currentIndex];
  }

  getLastPictureUrl(_parkingId: number): string | null {
    const image = this.currentImage;
    if (!image) {
      return null;
    }
    return `/parkings/${image}`;
  }

  private rotateImage() {
    if (this.availableImages.length <= 1) {
      return;
    }

    this.currentIndex = (this.currentIndex + 1) % this.availableImages.length;
    console.log(
      `[ParkingImageService] Switched to image ${this.availableImages[this.currentIndex]}`
    );
  }

  startDemoRotation() {
    if (this.rotationTimer || this.availableImages.length === 0) {
      if (this.availableImages.length === 0) {
        console.warn(
          '[ParkingImageService] No demo images found, skipping rotation'
        );
      }
      return;
    }

    console.log(
      `[ParkingImageService] Starting demo rotation with ${
        this.availableImages.length
      } images, interval ${ROTATION_INTERVAL_MS}ms`
    );

    this.rotationTimer = setInterval(
      () => this.rotateImage(),
      ROTATION_INTERVAL_MS
    );
  }
}

export const parkingImageService = new ParkingImageService();

